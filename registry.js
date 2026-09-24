// Competitions Al-Jidh Sport covers, and how to recognise them in the data feed.
// Shared by the app (tournament list, filters) and the server function (which labels each match).
//
// Each rule matches an API-Football league by its name (regex) and, where the name is ambiguous,
// its country. region: me | intl | eu | sa | na | af | as | gl. tier: 1 (biggest) to 3.
// To add a competition, add a line here — nothing else needs to change.

export const REGIONS = {
  me:   { name: "Middle East" },
  intl: { name: "Internationals" },
  eu:   { name: "Europe" },
  sa:   { name: "South America" },
  na:   { name: "North America" },
  af:   { name: "Africa" },
  as:   { name: "Asia" },
  gl:   { name: "Global" }
};
export const REGION_ORDER = ["me", "intl", "eu", "sa", "na", "af", "as", "gl"];

export const COMPETITIONS = [
  // Middle East
  { code: "GULF",   name: "Arabian Gulf Cup",            short: "Gulf Cup",          region: "me",   tier: 2, match: { name: /gulf cup/i } },
  { code: "ASIANCUP", name: "AFC Asian Cup",             short: "Asian Cup",         region: "me",   tier: 1, match: { name: /^asian cup$|^afc asian cup$/i } },
  { code: "ACLE",   name: "AFC Champions League Elite",  short: "ACL Elite",         region: "me",   tier: 2, match: { name: /afc champions league(?! two)/i } },
  { code: "ACL2",   name: "AFC Champions League Two",    short: "ACL Two",           region: "me",   tier: 3, match: { name: /afc champions league two|afc cup/i } },
  { code: "SPL",    name: "Saudi Pro League",            short: "Saudi Pro League",  region: "me",   tier: 2, match: { name: /^pro league$/i, country: /saudi/i } },
  { code: "KSACUP", name: "King's Cup",                  short: "King's Cup",        region: "me",   tier: 3, match: { name: /king'?s cup/i, country: /saudi/i } },
  { code: "UAE",    name: "ADNOC Pro League",            short: "ADNOC Pro League",  region: "me",   tier: 3, match: { name: /pro league|uae league/i, country: /emirates/i } },
  { code: "QSL",    name: "Qatar Stars League",          short: "Qatar Stars League",region: "me",   tier: 3, match: { name: /stars league/i, country: /qatar/i } },
  { code: "EGY",    name: "Egyptian Premier League",     short: "Egypt Premier",     region: "me",   tier: 3, match: { name: /^premier league$/i, country: /egypt/i } },
  { code: "MENA",   name: "Other Middle East leagues",   short: "Middle East",       region: "me",   tier: 3, match: { country: /kuwait|bahrain|oman|iraq|jordan|lebanon|syria/i, exclude: /u\d\d|women|youth|reserve|2nd|second|division 1|division one/i } },

  // Internationals
  { code: "WC",     name: "FIFA World Cup",              short: "World Cup",         region: "intl", tier: 1, match: { name: /^world cup$/i, country: /world/i } },
  { code: "WCQ",    name: "World Cup qualifiers",        short: "WC qualifiers",     region: "intl", tier: 2, match: { name: /world cup - qualification/i, exclude: /women/i } },
  { code: "WWC",    name: "FIFA Women's World Cup",      short: "Women's World Cup", region: "intl", tier: 1, match: { name: /world cup - women|women'?s world cup/i } },
  { code: "UNL",    name: "UEFA Nations League",         short: "Nations League",    region: "intl", tier: 1, match: { name: /uefa nations league/i, exclude: /women/i } },
  { code: "EURO",   name: "UEFA European Championship",  short: "Euro",              region: "intl", tier: 1, match: { name: /^euro championship$/i } },
  { code: "EUROQ",  name: "Euro qualifiers",             short: "Euro qualifiers",   region: "intl", tier: 2, match: { name: /euro championship - qualification/i } },
  { code: "COPA",   name: "Copa América",                short: "Copa América",      region: "intl", tier: 1, match: { name: /^copa america$/i } },
  { code: "AFCON",  name: "Africa Cup of Nations",       short: "AFCON",             region: "intl", tier: 1, match: { name: /^africa cup of nations$/i } },
  { code: "AFCONQ", name: "AFCON qualifiers",            short: "AFCON qualifiers",  region: "af",   tier: 2, match: { name: /africa cup of nations - qualification/i } },
  { code: "CNL",    name: "CONCACAF Nations League",     short: "CONCACAF NL",       region: "na",   tier: 2, match: { name: /concacaf nations league/i } },
  { code: "GOLD",   name: "CONCACAF Gold Cup",           short: "Gold Cup",          region: "na",   tier: 2, match: { name: /gold cup/i } },
  { code: "FRIENDLY", name: "International friendlies",  short: "Friendlies",        region: "intl", tier: 3, match: { name: /^friendlies$/i, country: /world/i } },

  // Europe
  { code: "UCL",    name: "UEFA Champions League",       short: "Champions League",  region: "eu",   tier: 1, match: { name: /^uefa champions league$/i } },
  { code: "UEL",    name: "UEFA Europa League",          short: "Europa League",     region: "eu",   tier: 2, match: { name: /^uefa europa league$/i } },
  { code: "UECL",   name: "UEFA Conference League",      short: "Conference League", region: "eu",   tier: 3, match: { name: /conference league/i } },
  { code: "UWCL",   name: "UEFA Women's Champions League", short: "Women's UCL",     region: "eu",   tier: 2, match: { name: /champions league women/i } },
  { code: "EPL",    name: "Premier League",              short: "Premier League",    region: "eu",   tier: 1, match: { name: /^premier league$/i, country: /england/i } },
  { code: "FACUP",  name: "FA Cup",                      short: "FA Cup",            region: "eu",   tier: 2, match: { name: /^fa cup$/i, country: /england/i } },
  { code: "LALIGA", name: "LaLiga",                      short: "LaLiga",            region: "eu",   tier: 1, match: { name: /^la ?liga$/i, country: /spain/i } },
  { code: "SERIEA", name: "Serie A",                     short: "Serie A",           region: "eu",   tier: 1, match: { name: /^serie a$/i, country: /italy/i } },
  { code: "BUNDES", name: "Bundesliga",                  short: "Bundesliga",        region: "eu",   tier: 1, match: { name: /^bundesliga$/i, country: /germany/i } },
  { code: "LIGUE1", name: "Ligue 1",                     short: "Ligue 1",           region: "eu",   tier: 2, match: { name: /^ligue 1$/i, country: /france/i } },
  { code: "ERED",   name: "Eredivisie",                  short: "Eredivisie",        region: "eu",   tier: 3, match: { name: /^eredivisie$/i } },
  { code: "PRIM",   name: "Primeira Liga",               short: "Primeira Liga",     region: "eu",   tier: 3, match: { name: /^primeira liga$/i } },
  { code: "SUPERLIG", name: "Süper Lig",                 short: "Süper Lig",         region: "eu",   tier: 3, match: { name: /^s[uü]per lig$/i, country: /turkey|t[uü]rkiye/i } },

  // South America
  { code: "LIB",    name: "Copa Libertadores",           short: "Libertadores",      region: "sa",   tier: 1, match: { name: /copa libertadores/i, exclude: /women|u20/i } },
  { code: "SUD",    name: "Copa Sudamericana",           short: "Sudamericana",      region: "sa",   tier: 3, match: { name: /copa sudamericana/i } },
  { code: "BRA",    name: "Brasileirão Série A",         short: "Brasileirão",       region: "sa",   tier: 2, match: { name: /^serie a$/i, country: /brazil/i } },
  { code: "ARG",    name: "Liga Profesional Argentina",  short: "Liga Argentina",    region: "sa",   tier: 3, match: { name: /liga profesional/i, country: /argentina/i } },

  // North America
  { code: "MLS",    name: "Major League Soccer",         short: "MLS",               region: "na",   tier: 2, match: { name: /^major league soccer$/i } },
  { code: "LIGAMX", name: "Liga MX",                     short: "Liga MX",           region: "na",   tier: 2, match: { name: /^liga mx$/i } },
  { code: "CCC",    name: "CONCACAF Champions Cup",      short: "Champions Cup",     region: "na",   tier: 3, match: { name: /concacaf champions (cup|league)/i } },

  // Africa & Asia
  { code: "CAFCL",  name: "CAF Champions League",        short: "CAF CL",            region: "af",   tier: 2, match: { name: /caf champions league/i } },
  { code: "CAFCC",  name: "CAF Confederation Cup",       short: "CAF Confed Cup",    region: "af",   tier: 3, match: { name: /caf confederation cup/i } },
  { code: "JLEAGUE", name: "J1 League",                  short: "J1 League",         region: "as",   tier: 3, match: { name: /^j1 league$/i } },
  { code: "KLEAGUE", name: "K League 1",                 short: "K League 1",        region: "as",   tier: 3, match: { name: /^k league 1$/i } },

  // Global club competitions
  { code: "CWC",    name: "FIFA Club World Cup",         short: "Club World Cup",    region: "gl",   tier: 1, match: { name: /club world cup/i } },
  { code: "ICC",    name: "FIFA Intercontinental Cup",   short: "Intercontinental",  region: "gl",   tier: 2, match: { name: /intercontinental cup/i } },
  { code: "USC",    name: "UEFA Super Cup",              short: "Super Cup",         region: "gl",   tier: 2, match: { name: /^uefa super cup$/i } }
];

// Teams whose meetings count as big matches (bumped up the page).
export const BIG_TEAMS = [
  "Real Madrid","Barcelona","Atletico Madrid","Manchester City","Manchester United","Liverpool","Arsenal","Chelsea","Tottenham",
  "Bayern Munich","Bayern München","Borussia Dortmund","Bayer Leverkusen","Inter","AC Milan","Juventus","Napoli","Paris Saint Germain",
  "Al-Hilal","Al Hilal","Al-Nassr","Al Nassr","Al-Ittihad","Al Ittihad","Al-Ahli","Al Ahli","Al Ain","Al Sadd","Shabab Al Ahli",
  "Flamengo","Palmeiras","Boca Juniors","River Plate","Inter Miami","Club America","Al Ahly","Mamelodi Sundowns",
  "Spain","Argentina","France","England","Brazil","Portugal","Germany","Netherlands","Italy","Morocco","Saudi Arabia","Japan"
];

export function findCompetition(league) {
  const name = league?.name || "", country = league?.country || "";
  for (const c of COMPETITIONS) {
    const m = c.match;
    if (m.name && !m.name.test(name)) continue;
    if (m.country && !m.country.test(country)) continue;
    if (m.exclude && m.exclude.test(name)) continue;
    return c;
  }
  return null;
}
