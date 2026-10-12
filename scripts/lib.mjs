// Bendros pagalbinės funkcijos kasdieniams scenarijams: Vilniaus laikas, HTML → tekstas, Lietuvos šventės, užklausos.

export const TZ = 'Europe/Vilnius';

// Dabartinė data ir laikas Vilniuje: {date: 'YYYY-MM-DD', hour, minute, iso: 'YYYY-MM-DDTHH:MM:SS+03:00'}
export function vilniusNow(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset'
  }).formatToParts(d);
  const g = t => (f.find(x => x.type === t) || {}).value || '';
  const off = g('timeZoneName').replace('GMT', '') || '+00:00';
  const date = `${g('year')}-${g('month')}-${g('day')}`;
  return {date, hour: Number(g('hour')), minute: Number(g('minute')), iso: `${date}T${g('hour')}:${g('minute')}:${g('second')}${off}`};
}

// HTML puslapio tekstas: be žymių, su iššifruotais simboliais ir vienais tarpais
const ENT = {nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', bdquo: '„', ldquo: '“',
  rdquo: '”', laquo: '«', raquo: '»', euro: '€', scaron: 'š', Scaron: 'Š', zcaron: 'ž', Zcaron: 'Ž'};
export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|td|th|h\d|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? m)
    .replace(/[   ]/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

// Lietuvos valstybinės šventės (tos pačios kaip skaičiuoklėje): fiksuotos datos ir antroji Velykų diena
const pad = n => String(n).padStart(2, '0');
const toStr = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
export const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return toStr(new Date(Date.UTC(y, month - 1, day)));
}
const FIXED = ['01-01', '02-16', '03-11', '05-01', '06-24', '07-06', '08-15', '11-01', '11-02', '12-24', '12-25', '12-26'];
export const isHoliday = s => FIXED.includes(s.slice(5)) || s === addDays(easter(Number(s.slice(0, 4))), 1);
export const isWorkday = s => { const w = parse(s).getUTCDay(); return w !== 0 && w !== 6 && !isHoliday(s); };

// Puslapio tekstas ir galutinis adresas (po peradresavimų); null, kai puslapio nėra
export async function getPage(url) {
  const r = await fetch(url, {
    redirect: 'follow',
    headers: {'User-Agent': 'Mozilla/5.0 (compatible; komandiruociu-skaiciuokle/1.0; +https://github.com)', 'Accept-Language': 'lt,en;q=0.7'}
  });
  if (r.status === 404 || r.status === 410) return null;
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return {url: r.url || url, html: await r.text()};
}

// Klaida, kurią GitHub parodo ir apie kurią praneša el. paštu (užduotis baigiasi nesėkme)
export function fail(msg) {
  console.error(`::error::${msg}`);
  process.exit(1);
}
