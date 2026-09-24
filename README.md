# Al-Jidh Sport · الجذع سبورت

An installable web app for world football, built around the Middle East: live scores, fixtures, results, tables, tournaments and news, with the biggest and latest matches shown first.

People open it in a browser and add it to their home screen. From then on it works like an app, with its own icon, full screen and no browser bar. It keeps the last scores it loaded, so it still opens without a signal.

---

## What you need

1. **An API-Football key** for scores, fixtures and tables. Sign up at <https://dashboard.api-football.com>.
   - **Pro, $19 a month (recommended).** 7,500 calls a day. Scores update about every 30 seconds while matches are on.
   - **Free.** 100 calls a day. Fine for trying the app out. Scores refresh every 20 minutes, there's no minute-by-minute feed, and older seasons may be limited.
2. **A free Netlify account** to host it: <https://app.netlify.com>. Netlify also runs the small server function that keeps your key hidden.
3. **A free GitHub account** is the easiest way to get the files to Netlify: <https://github.com>.

News headlines come from the BBC, Guardian and ESPN public RSS feeds. They don't need a key.

---

## Put it online (about 15 minutes, no coding)

1. **Upload the code to GitHub**
   - On GitHub, click **New repository**, name it `aljidh-sport`, and create it.
   - Click **uploading an existing file**. Drag in *everything inside* this folder, including the `netlify` folder, then click **Commit changes**.

2. **Connect it to Netlify**
   - In Netlify: **Add new site → Import an existing project → GitHub**, then pick `aljidh-sport`.
   - Leave the build command empty. The publish directory is `.` (it reads `netlify.toml` for you). Click **Deploy**.

3. **Add your key**
   - In Netlify, go to **Site configuration → Environment variables → Add a variable**:
     - `APISPORTS_KEY` = your API-Football key
     - `PLAN` = `pro` (or `free` if you're on the free plan)
   - Go to **Deploys → Trigger deploy → Deploy site**.

4. **Open your site.** You should see today's matches. Without a key, the app shows sample data and a yellow "Demo mode" bar.

> **Don't use Netlify Drop (drag-and-drop deploys).** It doesn't run server functions, so the app would stay in demo mode.

**Custom domain:** in Netlify, go to **Domain management → Add a domain**, for example `aljidhsport.com`.

---

## Install it on a phone

- **iPhone (Safari):** tap **Share**, then **Add to Home Screen**. The app shows this tip once.
- **Android (Chrome):** tap **Install app** in the banner, or use **⋮ → Install app**.
- **Desktop (Chrome or Edge):** click the install icon in the address bar.

## Getting into the App Store and Google Play (optional, later)

You can package the same app for the stores with **PWABuilder** (<https://www.pwabuilder.com>, free). Enter your site's address and it generates the Android and iOS packages.

- **Google Play:** one-off $25 developer account.
- **Apple App Store:** $99 a year developer account, plus Apple's review. Apple sometimes rejects apps that are only a wrapped website, so you may need more native features to get through.

---

## Changing things

| To change… | Edit |
|---|---|
| Which competitions are covered, their region and importance (tier 1 to 3) | `registry.js`. One line per competition. |
| Which teams count as a "big match" | `BIG_TEAMS` in `registry.js` |
| News sources | Add a `NEWS_FEEDS` environment variable in Netlify with RSS links separated by commas |
| Colours | The variables at the top of `app.css` (`--pitch`, `--flood`, and so on) |
| The banner illustration | `hero.js` |
| App name and icon | `manifest.webmanifest` and the `icons` folder |

After changing files on GitHub, Netlify redeploys automatically.

**How "biggest and latest first" works:** live matches come first, then kick-offs in the next 48 hours (anything starting within the hour jumps ahead), then results from the last four days. Within each group, tier-1 competitions, big-team meetings, finals and semi-finals, and Middle East competitions move up. The rules are in `priority()` and `weight()` in `app.js`.

**Staying within your API allowance:** the server function caches every answer at Netlify's edge, so a thousand people opening the app at once still cost only one call to API-Football. Change the refresh intervals in the `TTL` table in `netlify/functions/api.mjs`.

---

## Files

```
index.html                  page structure
app.css                     design (light and dark themes)
app.js                      loads data, ranks matches, draws every section
registry.js                 competitions, regions, tiers and big teams
hero.js                     stadium banner illustration
sw.js                       offline support (service worker)
manifest.webmanifest        app name, icons and colours for installing
icons/                      app icons (home screen, favicon, Android maskable)
fonts/                      Barlow Condensed, Source Sans 3 and Noto Kufi Arabic (self-hosted, SIL Open Font License)
data/demo.json              sample data used in demo mode
netlify/functions/api.mjs   server function: hides the key, trims and caches data, reads the news feeds
netlify.toml                Netlify settings
```

Match data © API-Football. Headlines link to their publishers. Club and competition names and crests belong to their owners.
