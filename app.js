import { COMPETITIONS, REGIONS, REGION_ORDER, BIG_TEAMS } from "./registry.js";

const REGION_VAR = { me:"--r-me", intl:"--r-intl", eu:"--r-eu", sa:"--r-sa", na:"--r-na", af:"--r-af", as:"--r-as", gl:"--r-gl" };
const COMPS = Object.fromEntries(COMPETITIONS.map(c => [c.code, c]));
const H = 3600000, DAY = 24 * H, IN_PLAY_MS = 115 * 60 * 1000;
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const S = {
  matches: new Map(), news: [], standings: new Map(), plan: "pro", mode: "loading",
  region: "all", comp: "all", allDays: false, fetchedAt: null
};
try { const f = JSON.parse(localStorage.getItem("ajs-filter") || "null"); if (f) { S.region = f.region || "all"; S.comp = f.comp || "all"; } } catch {}

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const initials = n => { const w = String(n || "?").replace(/^(al|fc|cf|ac|as|sc|afc)[\s-]+/i, "").split(/[\s-]+/).filter(Boolean); return (w.length > 1 ? w.map(x => x[0]).join("") : (w[0] || "?")).slice(0, 3).toUpperCase(); };
const badge = t => t?.logo
  ? `<img class="logo" src="${esc(t.logo)}" alt="" loading="lazy" decoding="async" width="28" height="28">`
  : `<span class="crest" style="--h:${hue(t?.name)}" aria-hidden="true">${esc(initials(t?.name))}</span>`;
const fmt = (o) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...o });
const fmtTime = d => fmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
const fmtDay = d => fmt({ weekday: "long", day: "numeric", month: "long" }).format(d);
const fmtShort = d => fmt({ weekday: "short", day: "numeric", month: "short" }).format(d);
const dayKey = d => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const tzShort = (() => { try { return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, timeZoneName: "short" }).formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value || ""; } catch { return ""; } })();
const comp = k => COMPS[k] || { short: k || "Other", name: k || "Other", region: "gl", tier: 3 };
const regionVar = k => REGION_VAR[comp(k).region] || "--r-gl";
const compTag = k => `<span class="tag"><span class="dot" style="--c:var(${regionVar(k)})"></span>${esc(comp(k).short)}</span>`;

/* ---------- match state & priority ---------- */
function phase(m, now) {
  const k = new Date(m.kickoff).getTime();
  if (m.status === "ft") return "ft";
  if (m.status === "live") return "live";
  if (m.status === "postponed" || m.status === "cancelled") return m.status;
  if (!m.timeTBC && now >= k && now < k + IN_PLAY_MS) return "inplay";
  if (now >= k + (m.timeTBC ? DAY : IN_PLAY_MS)) return "awaiting";
  return "scheduled";
}
function weight(m) {
  const c = comp(m.comp);
  return (c.tier === 1 ? 120 : c.tier === 2 ? 60 : 0) + (m.featured ? 90 : 0) + (c.region === "me" ? 40 : 0);
}
function priority(m, now) {
  const ph = phase(m, now), k = new Date(m.kickoff).getTime();
  if (ph === "live" || ph === "inplay") return 2000 + weight(m);
  if (ph === "scheduled") { const hrs = Math.max(0, (k - now) / H); return (hrs <= 48 ? 1000 : 400) - Math.min(hrs, 600) * 2 + (hrs < 1 && !m.timeTBC ? 150 : 0) + weight(m); }
  if (ph === "ft") { const hrs = Math.max(0, (now - k) / H); return (hrs <= 96 ? 800 : 200) - Math.min(hrs, 800) * 1.5 + weight(m); }
  return 0;
}
const byPriority = now => (a, b) => priority(b, now) - priority(a, now);
const all = () => [...S.matches.values()];
const inRegion = m => S.region === "all" || comp(m.comp).region === S.region;
const visible = m => inRegion(m) && (S.comp === "all" || m.comp === S.comp);
const score = m => `${m.hs ?? 0}–${m.as ?? 0}`;

/* ---------- rendering ---------- */
function boardHTML(m, now, extra) {
  const ph = phase(m, now), k = new Date(m.kickoff);
  let pill, centre;
  if (ph === "live") {
    const ht = m.short === "HT";
    pill = `<span class="pill ${ht ? "ht" : "live"}">${ht ? "Half time" : `Live${m.minute ? ` · ${esc(m.minute)}′` : ""}`}</span>`;
    centre = `${m.hs ?? 0}<span style="opacity:.5">–</span>${m.as ?? 0}<small>${ht ? "Half time" : m.minute ? esc(m.minute) + "′" : "In play"}</small>`;
  } else if (ph === "inplay") {
    pill = `<span class="pill live">In play</span>`;
    centre = `–<span style="opacity:.5"> : </span>–<small>Kicked off ${Math.max(1, Math.floor((now - k) / 60000))} min ago</small>`;
  } else if (ph === "ft") {
    pill = `<span class="pill ft">Full time</span>`;
    centre = `${m.hs}<span style="opacity:.5">–</span>${m.as}<small>${esc(m.pens || fmtShort(k))}</small>`;
  } else {
    const diff = k - now, h = Math.floor(diff / H), mi = Math.floor(diff % H / 60000);
    pill = `<span class="pill soon">Next big match</span>`;
    centre = `${m.timeTBC ? "TBC" : fmtTime(k)}<small>${m.timeTBC ? fmtShort(k) : (diff < DAY ? `in ${h ? h + " h " : ""}${mi} min` : fmtShort(k))}</small>`;
  }
  return `
    <div class="meta"><span class="comp">${esc(comp(m.comp).name)}${m.stage ? ` · ${esc(m.stage)}` : ""}</span>${pill}</div>
    <div class="duel">
      <div class="side">${badge(m.home)}<span class="name">${esc(m.home.name)}</span></div>
      <div class="score">${centre}</div>
      <div class="side">${badge(m.away)}<span class="name">${esc(m.away.name)}</span></div>
    </div>
    <div class="foot"><span>${esc(fmtDay(k))}</span>${m.venue ? `<span>${esc(m.venue)}</span>` : ""}${extra || ""}</div>`;
}

function renderBoard(now) {
  const pool = all().filter(m => ["live", "inplay", "scheduled"].includes(phase(m, now))).sort(byPriority(now));
  const m = pool[0];
  if (!m) { $("board").innerHTML = `<div class="meta"><span class="comp">Al-Jidh Sport</span><span>No upcoming matches in the next few days.</span></div>`; $("next").innerHTML = ""; return; }
  const liveN = pool.filter(x => ["live", "inplay"].includes(phase(x, now))).length;
  $("board").innerHTML = boardHTML(m, now, liveN > 1 ? `<span><b>${liveN - 1}</b> more in play</span>` : "");
  const up = pool.slice(1, 5);
  $("next").innerHTML = up.length ? `<div class="eyebrow">Also coming up</div><div class="next-list">${up.map(x => {
    const ph = phase(x, now), k = new Date(x.kickoff);
    const when = ph === "live" ? `<span class="pill live">${x.minute ? x.minute + "′ " : ""}${score(x)}</span>` : ph === "inplay" ? `<span class="pill live">On</span>` : `<span class="num">${x.timeTBC ? fmtShort(k) : fmtShort(k) + " · " + fmtTime(k)}</span>`;
    return `<div class="nx">${compTag(x.comp)}<b>${esc(x.home.name)} v ${esc(x.away.name)}</b>${when}</div>`;
  }).join("")}</div>` : "";
}

function renderStrip(now) {
  const pr = byPriority(now);
  const live = all().filter(m => ["live", "inplay"].includes(phase(m, now))).sort(pr);
  const up = all().filter(m => phase(m, now) === "scheduled").sort(pr).slice(0, 8);
  const res = all().filter(m => phase(m, now) === "ft").sort(pr).slice(0, 4);
  $("strip").innerHTML = [...live, ...up, ...res].slice(0, 20).map(m => {
    const ph = phase(m, now), k = new Date(m.kickoff);
    const st = ph === "ft" ? "FT" : ph === "live" ? (m.short === "HT" ? "HT" : m.minute ? m.minute + "′" : "Live") : ph === "inplay" ? "In play" : (m.timeTBC ? fmtShort(k) : `${fmtShort(k).split(" ")[0]} ${fmtTime(k)}`);
    const show = ph === "ft" || ph === "live";
    const t = x => `<span>${x.logo ? `<img class="logo" src="${esc(x.logo)}" alt="" loading="lazy" width="18" height="18">` : ""}${esc(x.name)}</span>`;
    return `<div class="chip ${ph === "live" || ph === "inplay" ? "is-live" : ""}">
      <div class="top"><span><span class="dot" style="--c:var(${regionVar(m.comp)})"></span> ${esc(comp(m.comp).short)}</span><span class="st num">${esc(st)}</span></div>
      <div class="row">${t(m.home)}<b class="num">${show ? esc(m.hs ?? "") : ""}</b></div>
      <div class="row">${t(m.away)}<b class="num">${show ? esc(m.as ?? "") : ""}</b></div>
    </div>`;
  }).join("");
}

function row(m, now) {
  const ph = phase(m, now), k = new Date(m.kickoff);
  let when, mid = "v", cls = "", v = true;
  if (ph === "ft") { when = `FT<small>${esc(fmtShort(k))}</small>`; mid = `${m.hs}–${m.as}`; v = false; }
  else if (ph === "live") { when = `<span class="pill ${m.short === "HT" ? "ht" : "live"}">${m.short === "HT" ? "HT" : m.minute ? esc(m.minute) + "′" : "Live"}</span>`; mid = score(m); v = false; cls = "is-live"; }
  else if (ph === "inplay") { when = `<span class="pill live">On</span>`; cls = "is-live"; }
  else if (ph === "awaiting") { when = `${m.timeTBC ? "—" : fmtTime(k)}<small>Result due</small>`; }
  else if (ph === "postponed") { when = `P–P<small>Postponed</small>`; }
  else if (ph === "cancelled") { when = `—<small>Cancelled</small>`; }
  else { when = m.timeTBC ? `TBC<small>Time</small>` : `${fmtTime(k)}<small>${esc(tzShort)}</small>`; }
  return `<div class="m ${cls}">
    <div class="when">${when}</div>
    <div class="t home"><span>${esc(m.home.name)}</span>${badge(m.home)}</div>
    <div class="mid ${v ? "v" : ""}">${mid}</div>
    <div class="t">${badge(m.away)}<span>${esc(m.away.name)}</span></div>
    <div class="sub">${compTag(m.comp)}${m.featured ? `<span class="big-tag">Big match</span>` : ""}${m.stage ? `<span>${esc(m.stage)}</span>` : ""}${m.venue ? `<span>${esc(m.venue)}</span>` : ""}${m.pens ? `<span>${esc(m.pens)}</span>` : ""}${m.scorers ? `<span>${esc(m.scorers)}</span>` : ""}</div>
  </div>`;
}

function saveFilter() { try { localStorage.setItem("ajs-filter", JSON.stringify({ region: S.region, comp: S.comp })); } catch {} }
function renderFilters() {
  const present = REGION_ORDER.filter(r => all().some(m => comp(m.comp).region === r));
  if (S.region !== "all" && !present.includes(S.region)) { S.region = "all"; S.comp = "all"; }
  const here = [...new Set(all().filter(inRegion).map(m => m.comp))].sort((a, b) => comp(a).tier - comp(b).tier);
  if (S.comp !== "all" && !here.includes(S.comp)) S.comp = "all";
  const rb = (k, label) => `<button type="button" data-r="${k}" aria-pressed="${S.region === k}">${k !== "all" ? `<span class="dot" style="--c:var(${REGION_VAR[k]})"></span>` : ""}${esc(label)}</button>`;
  let html = `<div class="filters" role="group" aria-label="Filter by region">${rb("all", "All football")}${present.map(r => rb(r, REGIONS[r].name)).join("")}</div>`;
  if (S.region !== "all" && here.length > 1) {
    const cb = (k, label) => `<button type="button" class="sub-f" data-c="${k}" aria-pressed="${S.comp === k}">${esc(label)}</button>`;
    html += `<div class="filters" role="group" aria-label="Filter by competition">${cb("all", "All " + REGIONS[S.region].name)}${here.map(k => cb(k, comp(k).short)).join("")}</div>`;
  }
  $("filters").innerHTML = html;
}

function renderFixtures(now) {
  const up = all().filter(m => visible(m) && !["ft"].includes(phase(m, now)) && new Date(m.kickoff) > now - DAY);
  $("fx-note").textContent = up.length ? `${up.length} match${up.length > 1 ? "es" : ""} · biggest first within each day` : "";
  if (!up.length) { $("fx").innerHTML = `<div class="empty">No upcoming fixtures for this filter.</div>`; return; }
  const days = new Map();
  up.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).forEach(m => { const k = dayKey(new Date(m.kickoff)); if (!days.has(k)) days.set(k, []); days.get(k).push(m); });
  const todayK = dayKey(new Date(now)), tomK = dayKey(new Date(now + DAY));
  const list = [...days], shown = S.allDays ? list : list.slice(0, 4);
  const rank = m => ["live", "inplay"].includes(phase(m, now)) ? 1 : 0;
  $("fx").innerHTML = shown.map(([k, ms]) => {
    const d = new Date(ms[0].kickoff);
    const label = k === todayK ? `Today · ${fmtDay(d)}` : k === tomK ? `Tomorrow · ${fmtDay(d)}` : fmtDay(d);
    ms.sort((a, b) => rank(b) - rank(a) || weight(b) - weight(a) || new Date(a.kickoff) - new Date(b.kickoff));
    const cap = 25, extra = ms.length - cap;
    return `<div class="day"><h3>${esc(label)}</h3><div class="list">${ms.slice(0, S.allDays ? ms.length : cap).map(m => row(m, now)).join("")}</div>${!S.allDays && extra > 0 ? `<p class="note">+${extra} smaller matches on this day. Use the filters or show all.</p>` : ""}</div>`;
  }).join("") + (list.length > 4 || up.length > 100 ? `<button type="button" class="more" id="fx-more">${S.allDays ? "Show less" : "Show all fixtures"}</button>` : "");
}

function renderResults(now) {
  const rs = all().filter(m => visible(m) && phase(m, now) === "ft").sort(byPriority(now)).slice(0, 16);
  $("rs").innerHTML = rs.length ? `<div class="list">${rs.map(m => row(m, now)).join("")}</div>` : `<div class="empty">No results yet for this filter.</div>`;
}

function renderComps(now) {
  const rows = COMPETITIONS.filter(c => c.code !== "MENA" && (S.region === "all" || c.region === S.region)).map(c => {
    const ms = all().filter(m => m.comp === c.code);
    const live = ms.some(m => ["live", "inplay"].includes(phase(m, now)));
    const next = ms.filter(m => phase(m, now) === "scheduled").sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];
    const last = ms.filter(m => phase(m, now) === "ft").sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff))[0];
    let p = live ? 1000 : next && new Date(next.kickoff) - now < 7 * DAY ? 700 : last ? 500 : 0;
    p += c.tier === 1 ? 100 : c.tier === 2 ? 50 : 0; if (c.region === "me") p += 30;
    return { c, p, live, next, last, n: ms.length };
  }).sort((a, b) => b.p - a.p || a.c.name.localeCompare(b.c.name));
  const active = rows.filter(r => r.n), idle = rows.filter(r => !r.n);
  const shown = S.allComps ? rows : [...active, ...idle.slice(0, Math.max(0, 8 - active.length))];
  $("cp").innerHTML = `<div class="list comps">${shown.map(({ c, live, next, last, n }) => {
    const st = live ? `<span class="pill live">Live</span>` : next ? `<span class="pill soon">This week</span>` : last ? `<span class="pill ft">Recent</span>` : `<span class="pill">No matches this week</span>`;
    const info = [next ? `Next: ${next.home.name} v ${next.away.name}, ${fmtShort(new Date(next.kickoff))}` : "", last ? `Last: ${last.home.name} ${last.hs}–${last.as} ${last.away.name}` : ""].filter(Boolean).join(" · ");
    return `<div class="cp"><span class="dot" style="--c:var(${REGION_VAR[c.region]})"></span>
      <div class="cp-main"><b>${esc(c.name)}</b>${info ? `<span>${esc(info)}</span>` : ""}</div>
      <div class="cp-side">${st}${n ? `<button type="button" class="link" data-show="${c.code}">Matches</button>` : ""}</div></div>`;
  }).join("")}</div>${rows.length > shown.length || S.allComps ? `<button type="button" class="more" id="cp-more">${S.allComps ? "Show fewer" : `Show all ${rows.length} tournaments`}</button>` : ""}`;
}

function formHTML(f) { return f ? `<span class="form">${[...f.slice(-5)].map(x => `<i class="${x}">${x}</i>`).join("")}</span>` : ""; }
function renderTables(now) {
  const blocks = [];
  for (const [key, st] of S.standings) {
    if (!st || !st.groups?.length) continue;
    const code = st.league.code;
    if (S.region !== "all" && comp(code).region !== S.region) continue;
    const prio = Math.max(0, ...all().filter(m => m.comp === code).map(m => priority(m, now)));
    const groups = st.groups.slice(0, st.groups.length > 1 ? 8 : 1);
    groups.forEach(g => {
      const rows = st.groups.length > 1 ? g.rows : g.rows.slice(0, 10);
      blocks.push({ prio, html: `<div class="tbl-wrap"><div class="tbl-cap">${esc(comp(code).short)}${st.groups.length > 1 ? ` · ${esc(g.name)}` : ""}<span>${st.groups.length > 1 ? "" : "Top 10"}</span></div><table>
        <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th><th>Form</th></tr></thead>
        <tbody>${rows.map(r => `<tr class="${/promotion|champions|qualif|next round|play/i.test(r.note) ? "q" : ""}"><td>${r.rank}</td><td><span class="team-cell">${r.logo ? `<img src="${esc(r.logo)}" alt="" loading="lazy">` : ""}${esc(r.name)}</span></td><td>${r.p ?? "–"}</td><td>${r.w ?? "–"}</td><td>${r.d ?? "–"}</td><td>${r.l ?? "–"}</td><td>${r.gd ?? "–"}</td><td class="pts">${r.pts ?? "–"}</td><td>${formHTML(r.form)}</td></tr>`).join("")}</tbody></table></div>` });
    });
  }
  blocks.sort((a, b) => b.prio - a.prio);
  $("tb").innerHTML = blocks.slice(0, 8).map(b => b.html).join("") || `<div class="empty">${S.mode === "loading" ? "Loading tables…" : "Tables appear here for the competitions playing this week."}</div>`;
}

/* ---------- news ---------- */
const ME_WORDS = /saudi|al[- ]?(nassr|hilal|ittihad|ahli|ain|sadd|wahda|jazira|shabab|qadsiah|ettifaq|gharafa|duhail|rayyan)|uae|emirat|qatar|gulf|riyadh|jeddah|dubai|abu dhabi|doha|kuwait|bahrain|oman|iraq|jordan|egypt|morocco|pif|roshn|adnoc/i;
const PLAYER_WORDS = /\b(signs?|signing|injur|hat-trick|brace|scores?|scored|contract|transfer|retire|ban(ned)?|suspend|ballon|award|captain|debut|record|goal of|interview|says|admits|reveals|fitness|return)\b/i;
const KIT = { me:["#00582B","#B98A00"], intl:["#A6001A","#1E2A38"], eu:["#0B1F4B","#1E3F8A"], sa:["#0A6B3A","#C8A200","#fff"], na:["#3B1F6B","#6B3FA0"], af:["#8A3B00","#C25E00"], as:["#0E4F57","#0E7C86"], gl:["#1A1A1A","#56675F"] };
const BIG_RE = new RegExp(`\\b(${BIG_TEAMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
function classify(n) {
  if (n.kind) return n;
  const text = `${n.title} ${n.summary || ""}`;
  const compHit = COMPETITIONS.find(c => c.code !== "MENA" && new RegExp(`\\b${c.short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
  const team = (text.match(BIG_RE) || [])[1];
  const region = ME_WORDS.test(text) ? "me" : compHit?.region || "gl";
  return { ...n, kind: PLAYER_WORDS.test(n.title) ? "player" : "club", comp: compHit?.code, region, subject: team || compHit?.short || n.source,
    tile: { region, big: team || compHit?.short || (n.source || "News").split(" ")[0], small: n.source } };
}
function newsScore(n, now) {
  const t = n.date ? new Date(n.date.length === 10 ? n.date + "T12:00:00Z" : n.date).getTime() : now - 5 * DAY;
  const hrs = Math.max(0, (now - t) / H);
  const c = comp(n.comp);
  return 100 - hrs * 0.8 + (c.tier === 1 ? 10 : c.tier === 2 ? 5 : 0) + ((n.region || c.region) === "me" ? 12 : 0) + (n.top ? 15 : 0);
}
function tile(n) {
  const k = KIT[n.tile?.region || n.region || comp(n.comp).region] || KIT.gl;
  const t = n.tile || {};
  return `<div class="media" aria-hidden="true"><div class="tile" style="--a:${t.a || k[0]};--b:${t.b || k[1]};--fg:${t.fg || k[2] || "#fff"}"><span class="big">${esc(t.big || "News")}</span>${t.small ? `<span class="small">${esc(t.small)}</span>` : ""}</div></div>`;
}
function renderNews(kind, el, now) {
  const items = S.news.filter(n => n.kind === kind && (S.region === "all" || (n.region || comp(n.comp).region) === S.region))
    .sort((a, b) => newsScore(b, now) - newsScore(a, now)).slice(0, 10);
  if (!items.length) { $(el).innerHTML = `<div class="empty">${S.mode === "loading" ? "Loading news…" : "No stories for this filter yet."}</div>`; return; }
  $(el).innerHTML = `<div class="news">${items.map((n, i) => {
    const d = n.date ? new Date(n.date.length === 10 ? n.date + "T12:00:00Z" : n.date) : null;
    const when = d ? (now - d < DAY ? `${Math.max(1, Math.round((now - d) / H))} h ago` : fmtShort(d)) : "Recent";
    return `<a class="n ${i === 0 ? "lead" : ""} has-media" href="${esc(n.url)}" target="_blank" rel="noopener">
      ${tile(n)}
      <div class="k"><span class="club">${esc(n.subject || "")}</span>${n.comp && comp(n.comp).short !== n.subject ? compTag(n.comp) : ""}<span>${esc(when)}</span></div>
      <h3>${esc(n.title)}</h3>
      ${n.summary ? `<p>${esc(n.summary)}</p>` : ""}
      <span class="src">${esc(n.source || "")}</span>
    </a>`;
  }).join("")}</div>`;
}

function renderMeta() {
  $("tzlabel").textContent = `Times in your local time${tzShort ? ` (${tzShort})` : ""}`;
  if (S.fetchedAt) $("updated").textContent = `Updated ${fmtTime(S.fetchedAt)}${S.mode === "demo" ? " · demo data" : S.mode === "offline" ? " · offline" : ""}`;
}
function render() {
  const now = Date.now();
  renderMeta(); renderFilters(); renderBoard(now); renderStrip(now);
  renderFixtures(now); renderResults(now); renderComps(now); renderTables(now);
  renderNews("club", "cn", now); renderNews("player", "pn", now);
}
function notice(html, warn) { $("notice").innerHTML = html ? `<div class="banner ${warn ? "warn" : ""}">${html}</div>` : ""; }

/* ---------- data ---------- */
async function getJSON(path) {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(body.message || `HTTP ${res.status}`); e.code = body.error || res.status; throw e; }
  return body;
}
const utcDate = t => new Date(t).toISOString().slice(0, 10);
function addMatches(list) { for (const m of list || []) if (m && m.id != null) S.matches.set(m.id, m); }

async function loadFixtures() {
  const now = Date.now();
  const first = await getJSON(`/api/fixtures?date=${utcDate(now)}`);
  S.plan = first.plan || "pro"; addMatches(first.matches);
  const span = S.plan === "free" ? [-1, 1, 2, 3] : [-3, -2, -1, 1, 2, 3, 4, 5, 6];
  const rest = await Promise.allSettled(span.map(d => getJSON(`/api/fixtures?date=${utcDate(now + d * DAY)}`)));
  rest.forEach(r => r.status === "fulfilled" && addMatches(r.value.matches));
}
async function loadNews() {
  try { const r = await getJSON("/api/news"); S.news = (r.items || []).map(classify); }
  catch { S.news = S.news.length ? S.news : []; }
}
async function loadStandings() {
  const now = Date.now();
  const leagues = new Map();
  all().filter(m => m.league?.id && m.league?.season).sort(byPriority(now)).forEach(m => {
    if (!leagues.has(m.league.id) && leagues.size < (S.plan === "free" ? 2 : 6)) leagues.set(m.league.id, m.league.season);
  });
  await Promise.allSettled([...leagues].map(async ([id, season]) => {
    const st = await getJSON(`/api/standings?league=${id}&season=${season}`);
    if (st.groups?.length) S.standings.set(st.league?.id ?? id, st);
  }));
}
async function loadDemo(reason) {
  const d = await (await fetch("data/demo.json")).json();
  S.mode = "demo"; addMatches(d.matches); S.news = d.news.map(classify);
  (d.standings || []).forEach(st => S.standings.set(st.league.id, st));
  notice(reason === "missing_key"
    ? `<span><b>Demo mode.</b> Add your API-Football key as <code>APISPORTS_KEY</code> in Netlify to switch on live scores.</span>`
    : `<span><b>Demo mode.</b> The data service isn't reachable, so you're seeing sample data from 24 September 2026.</span>`, true);
}

let liveTimer = null;
async function pollLive() {
  if (S.plan === "free" || S.mode !== "live") return;
  const now = Date.now();
  const due = all().some(m => { const p = phase(m, now); return p === "live" || p === "inplay" || (p === "scheduled" && new Date(m.kickoff) - now < 10 * 60000); });
  if (due && document.visibilityState === "visible") {
    try { const r = await getJSON("/api/live"); addMatches(r.matches); S.fetchedAt = new Date(); render(); } catch {}
  }
}

async function start() {
  S.fetchedAt = null; render();
  try {
    await loadFixtures(); S.mode = "live"; S.fetchedAt = new Date();
    if (S.plan === "free") notice(`<span>Running on the free data plan: scores refresh every 20 minutes and there's no minute-by-minute live feed.</span>`);
    render();
    await Promise.all([loadNews(), loadStandings()]);
  } catch (e) {
    if (!navigator.onLine && S.matches.size) { S.mode = "offline"; notice(`<span><b>You're offline.</b> Showing the last scores saved on this device.</span>`, true); }
    else await loadDemo(e.code);
    S.fetchedAt = new Date();
  }
  render();
  clearInterval(liveTimer);
  liveTimer = setInterval(pollLive, 60000);
}

/* ---------- interactions ---------- */
$("filters").addEventListener("click", e => {
  const r = e.target.closest("button[data-r]"), c = e.target.closest("button[data-c]");
  if (r) { S.region = r.dataset.r; S.comp = "all"; } else if (c) S.comp = c.dataset.c; else return;
  saveFilter(); render();
});
$("fx").addEventListener("click", e => { if (!e.target.closest("#fx-more")) return; S.allDays = !S.allDays; render(); if (!S.allDays) $("fixtures").scrollIntoView(); });
$("cp").addEventListener("click", e => {
  if (e.target.closest("#cp-more")) { S.allComps = !S.allComps; render(); return; }
  const b = e.target.closest("button[data-show]"); if (!b) return;
  S.region = comp(b.dataset.show).region; S.comp = b.dataset.show; saveFilter(); render();
  $("fixtures").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});
setInterval(() => { if (document.visibilityState === "visible") render(); }, 30000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && S.mode === "live" && S.fetchedAt && Date.now() - S.fetchedAt > 10 * 60000) start();
});
addEventListener("online", () => { if (S.mode !== "live") start(); });

// Bottom tab bar: highlight the section in view
const tabs = [...document.querySelectorAll(".tabbar a")];
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) tabs.forEach(t => t.classList.toggle("on", t.dataset.tab === en.target.id));
}), { rootMargin: "-40% 0px -55% 0px" });
["live", "fixtures", "results", "clubs", "tables"].forEach(id => io.observe($(id)));

// Install prompt (Android/desktop Chrome); iOS gets a one-line hint instead
let deferred = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; $("install").hidden = false; });
$("install").addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("install").hidden = true; });
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
  try { if (!localStorage.getItem("ajs-ios-hint")) { setTimeout(() => { if (!$("notice").innerHTML) notice(`<span>Install Al-Jidh Sport: tap <b>Share</b>, then <b>Add to Home Screen</b>.</span><button type="button" class="btn ghost" id="hint-x">Got it</button>`); document.getElementById("hint-x")?.addEventListener("click", () => { notice(""); try { localStorage.setItem("ajs-ios-hint", "1"); } catch {} }); }, 4000); } } catch {}
}

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
start();
