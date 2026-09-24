// Al-Jidh Sport data function (Netlify Functions v2).
// Keeps the API key on the server, trims the feed to the competitions in registry.js,
// and sets CDN cache headers so thousands of visitors share a handful of upstream calls.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   APISPORTS_KEY  required  your API-Football key (dashboard.api-football.com)
//   PLAN           optional  "free" (100 calls/day) or "pro" (default). Controls how often data refreshes.
//   NEWS_FEEDS     optional  comma-separated RSS feed URLs to replace the default news sources.

import { findCompetition, BIG_TEAMS } from "../../registry.js";

const API = "https://v3.football.api-sports.io";
const DEFAULT_FEEDS = [
  "https://feeds.bbci.co.uk/sport/football/rss.xml",
  "https://www.theguardian.com/football/rss",
  "https://www.espn.com/espn/rss/soccer/news"
];

// Seconds each response stays fresh at the CDN. "free" keeps a single site under 100 upstream calls a day.
const TTL = {
  pro:  { live: 30,   today: 90,   day: 1800,  standings: 3600,  news: 900 },
  free: { live: 0,    today: 1200, day: 43200, standings: 86400, news: 1800 }
};

const json = (body, ttl, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=0, must-revalidate",
    ...(ttl > 0 ? { "netlify-cdn-cache-control": `public, durable, s-maxage=${ttl}, stale-while-revalidate=${ttl * 10}, stale-if-error=86400` } : {})
  }
});

const STATUS = {
  NS: "scheduled", TBD: "scheduled",
  "1H": "live", HT: "live", "2H": "live", ET: "live", BT: "live", P: "live", LIVE: "live", INT: "live", SUSP: "live",
  FT: "ft", AET: "ft", PEN: "ft", AWD: "ft", WO: "ft",
  PST: "postponed", CANC: "cancelled", ABD: "cancelled"
};
const bigSet = new Set(BIG_TEAMS.map(n => n.toLowerCase()));

function normalise(f) {
  const comp = findCompetition(f.league);
  if (!comp) return null;
  const home = f.teams?.home || {}, away = f.teams?.away || {};
  const short = f.fixture?.status?.short || "NS";
  const round = f.league?.round || "";
  const bigMeeting = bigSet.has((home.name || "").toLowerCase()) && bigSet.has((away.name || "").toLowerCase());
  const lateStage = /final|semi/i.test(round) && !/quarter|1\/8|round of/i.test(round);
  return {
    id: f.fixture?.id,
    comp: comp.code,
    league: { id: f.league?.id, season: f.league?.season, name: f.league?.name, country: f.league?.country, logo: f.league?.logo },
    stage: round,
    kickoff: f.fixture?.date,
    timeTBC: short === "TBD",
    status: STATUS[short] || "scheduled",
    short,
    minute: f.fixture?.status?.elapsed ?? null,
    home: { id: home.id, name: home.name, logo: home.logo },
    away: { id: away.id, name: away.name, logo: away.logo },
    hs: f.goals?.home ?? null,
    as: f.goals?.away ?? null,
    pens: f.score?.penalty?.home != null ? `${f.score.penalty.home}–${f.score.penalty.away} pens` : null,
    venue: [f.fixture?.venue?.name, f.fixture?.venue?.city].filter(Boolean).join(", "),
    featured: bigMeeting || (comp.tier === 1 && lateStage)
  };
}

async function upstream(path, key) {
  const res = await fetch(API + path, { headers: { "x-apisports-key": key } });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const body = await res.json();
  const errs = body.errors && (Array.isArray(body.errors) ? body.errors.length : Object.keys(body.errors).length);
  if (errs) throw new Error("upstream error: " + JSON.stringify(body.errors));
  return body.response || [];
}

// --- News: plain RSS parsing, no dependencies ---
const decode = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
  .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i")); return m ? decode(m[1]) : ""; };

async function readFeed(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "AlJidhSport/1.0 (+news reader)" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const source = tag(xml.split(/<item[\s>]/i)[0], "title").replace(/ - .*$/, "") || new URL(url).hostname;
    return xml.split(/<item[\s>]/i).slice(1, 26).map(chunk => ({
      title: tag(chunk, "title"),
      url: tag(chunk, "link") || (chunk.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/i) || [])[1] || "",
      summary: tag(chunk, "description").slice(0, 240),
      date: (() => { const d = new Date(tag(chunk, "pubDate") || tag(chunk, "dc:date")); return isNaN(d) ? null : d.toISOString(); })(),
      source
    })).filter(n => n.title && /^https?:\/\//.test(n.url));
  } catch { return []; }
}

const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const isInt = s => /^\d{1,7}$/.test(s || "");

export default async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const plan = (process.env.PLAN || "pro").toLowerCase() === "free" ? "free" : "pro";
  const ttl = TTL[plan];
  const key = process.env.APISPORTS_KEY;

  try {
    if (route === "news") {
      const feeds = (process.env.NEWS_FEEDS || "").split(",").map(s => s.trim()).filter(Boolean);
      const lists = await Promise.all((feeds.length ? feeds : DEFAULT_FEEDS).map(readFeed));
      const seen = new Set();
      const items = lists.flat().filter(n => { const k = n.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 60);
      return json({ items, plan }, ttl.news);
    }

    if (!key) return json({ error: "missing_key", message: "Set APISPORTS_KEY in your Netlify environment variables." }, 0, 503);

    if (route === "fixtures") {
      const date = url.searchParams.get("date");
      if (!isDate(date)) return json({ error: "bad_request", message: "date must be YYYY-MM-DD" }, 0, 400);
      const today = new Date().toISOString().slice(0, 10);
      const raw = await upstream(`/fixtures?date=${date}&timezone=UTC`, key);
      const matches = raw.map(normalise).filter(Boolean);
      return json({ date, matches, plan }, date === today ? ttl.today : ttl.day);
    }

    if (route === "live") {
      if (plan === "free") return json({ matches: [], plan, note: "Live polling is off on the free plan." }, 300);
      const raw = await upstream(`/fixtures?live=all&timezone=UTC`, key);
      return json({ matches: raw.map(normalise).filter(Boolean), plan }, ttl.live);
    }

    if (route === "standings") {
      const league = url.searchParams.get("league"), season = url.searchParams.get("season");
      if (!isInt(league) || !isInt(season)) return json({ error: "bad_request", message: "league and season must be numbers" }, 0, 400);
      const raw = await upstream(`/standings?league=${league}&season=${season}`, key);
      const lg = raw[0]?.league;
      if (!lg || !findCompetition(lg)) return json({ groups: [] }, ttl.standings);
      const groups = (lg.standings || []).map(rows => ({
        name: rows[0]?.group || lg.name,
        rows: rows.map(r => ({
          rank: r.rank, name: r.team?.name, logo: r.team?.logo, p: r.all?.played, w: r.all?.win, d: r.all?.draw, l: r.all?.lose,
          gd: r.goalsDiff, pts: r.points, form: r.form || "", note: r.description || ""
        }))
      }));
      return json({ league: { id: lg.id, name: lg.name, country: lg.country, season: lg.season, code: findCompetition(lg).code }, groups }, ttl.standings);
    }

    return json({ error: "not_found" }, 0, 404);
  } catch (e) {
    return json({ error: "upstream_failed", message: String(e.message || e) }, 0, 502);
  }
};

export const config = { path: "/api/*" };
