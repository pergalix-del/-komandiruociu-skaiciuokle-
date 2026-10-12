// LEA vidutinės degalų kainos → data/fuel.json
//
// Paleidžiama darbo dienomis 10:01 Vilniaus laiku ir pakartotinai iki 13 val., kol randamas šiandienos
// Lietuvos energetikos agentūros (LEA) pranešimas, pvz., https://www.ena.lt/Naujiena/kdk-20261009/.
// Jei kainos jau įrašytos – nieko nedaro. Jei iki 13 val. pranešimo nėra arba jo nepavyksta perskaityti,
// užduotis baigiasi klaida (GitHub apie tai praneša el. paštu), o skaičiuoklėje lieka paskutinės žinomos kainos.
// Su parametru --test tik patikrina, ar naujausias LEA pranešimas pasiekiamas ir perskaitomas (nieko neįrašo).
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {vilniusNow, htmlToText, getPage, isWorkday, fail} from './lib.mjs';

const FILE = new URL('../data/fuel.json', import.meta.url);
const BASE = 'https://www.ena.lt/Naujiena/';
const LIST = 'https://www.ena.lt/dk-pr-pr-duomenys/';
const LAST_HOUR = 13;      // iki kada laukiama šiandienos pranešimo
const MAX_JUMP = 0.30;     // didesnis pokytis per dieną laikomas įtartinu (€/l)

const okPrice = x => typeof x === 'number' && Number.isFinite(x) && x >= 0.3 && x <= 5;

// „vidutinė dyzelino kaina siekė 2,200 Eur/l“, „vidutinė benzino kaina sudarė 1,914 Eur/l“, „vidutinė SND kaina siekė 0,855 Eur/l“
export function parsePrices(text) {
  const t = String(text).replace(/\s+/g, ' ');
  const pick = name => {
    const m = new RegExp(`vidutin\\S*\\s+${name}\\s+kain\\S*\\s+(?:[^\\d\\s]+\\s+){0,4}?(\\d+[,.]\\d{2,3})\\s*(?:eur|€)`, 'iu').exec(t);
    return m ? Number(m[1].replace(',', '.')) : null;
  };
  return {diesel: pick('dyzelino'), petrol95: pick('benzino'), lpg: pick('(?:SND|suskystintų naftos dujų)')};
}

// Ar puslapis – šios dienos pranešimas: data adrese (kdk-YYYYMMDD) arba tekste („2026 10 09“)
export function isNoticeOf(page, date) {
  const ymd = date.replaceAll('-', '');
  if (page.url.includes(ymd)) return true;
  const [y, m, d] = date.split('-');
  return new RegExp(`${y}\\s*[-. ]\\s*0?${Number(m)}\\s*[-. ]\\s*0?${Number(d)}(?!\\d)`).test(htmlToText(page.html).slice(0, 4000));
}

const errors = [];   // ena.lt atsakymai, kurie nebuvo puslapiai (pvz., HTTP 403) – parodomi klaidos pranešime
const tryPage = url => getPage(url).catch(e => { errors.push(e.message); console.log(`  ${e.message}`); return null; });
const listLinks = list => [...new Set([...list.html.matchAll(/href="([^"]*\/Naujiena\/[^"#?]+)"/gi)].map(m => new URL(m[1], LIST).href))];

async function findNotice(date) {
  const ymd = date.replaceAll('-', '');
  // 1) įprastas pranešimo adresas
  for (const slug of ['kdk-', 'ndk-']) {
    const page = await tryPage(`${BASE}${slug}${ymd}/`);
    if (page && isNoticeOf(page, date) && okPrice(parsePrices(htmlToText(page.html)).diesel)) return page;
  }
  // 2) pranešimų sąrašas – jei šiandienos pranešimas pavadintas kitaip
  const list = await tryPage(LIST);
  if (!list) return null;
  for (const url of listLinks(list).slice(0, 8)) {
    const page = await tryPage(url);
    if (page && isNoticeOf(page, date)) return page;
  }
  return null;
}

// naujausias pranešimas su kainomis (patikrai, kai šiandienos dar nėra)
async function latestNotice() {
  const list = await tryPage(LIST);
  if (!list) return null;
  const links = listLinks(list).sort((a, b) => (/k?dk-(\d{8})/.exec(b) || [0, ''])[1].localeCompare((/k?dk-(\d{8})/.exec(a) || [0, ''])[1]));
  for (const url of links.slice(0, 5)) {
    const page = await tryPage(url);
    if (page && okPrice(parsePrices(htmlToText(page.html)).diesel)) return page;
  }
  return null;
}
const errNote = () => errors.length ? ` Svetainės atsakymai: ${[...new Set(errors)].slice(0, 3).join('; ')}.` : '';

export async function main(args = process.argv.slice(2)) {
  const now = vilniusNow();
  const today = now.date;
  const old = JSON.parse(await readFile(FILE, 'utf8'));
  if (args.includes('--test')) {
    const page = (await findNotice(today)) || (await latestNotice());
    if (!page) fail(`LEA pranešimų pasiekti nepavyko.${errNote()}`);
    const p = parsePrices(htmlToText(page.html));
    if (!okPrice(p.diesel) || !okPrice(p.petrol95)) fail(`LEA pranešimas rastas (${page.url}), bet kainų perskaityti nepavyko.`);
    console.log(`Patikra pavyko: ${page.url} – dyzelinas ${p.diesel}, benzinas ${p.petrol95}${okPrice(p.lpg) ? ', SND ' + p.lpg : ''} €/l. Nieko neįrašyta.`);
    return;
  }
  if (old.date >= today) { console.log(`Šiandienos (${today}) kainos jau įrašytos – nieko nedaroma.`); return; }

  const page = await findNotice(today);
  if (!page) {
    if (!isWorkday(today)) { console.log(`${today} – ne darbo diena, LEA kainų neskelbia.`); return; }
    if (now.hour < LAST_HOUR) { console.log(`Šiandienos LEA pranešimo dar nėra – bus bandoma vėliau.${errNote()}`); return; }
    fail(`Šiandienos (${today}) LEA pranešimo nepavyko rasti iki ${LAST_HOUR} val.${errNote()} Skaičiuoklė rodo ${old.date} kainas. Jas galite įrašyti ranka faile data/fuel.json.`);
  }

  const p = parsePrices(htmlToText(page.html));
  if (!okPrice(p.diesel) || !okPrice(p.petrol95)) {
    fail(`LEA pranešime ${page.url} nepavyko rasti dyzelino ir benzino vidutinių kainų – galbūt pasikeitė pranešimo forma. Nieko neįrašyta.`);
  }
  for (const k of ['diesel', 'petrol95']) {
    if (okPrice(old[k]) && Math.abs(p[k] - old[k]) > MAX_JUMP) {
      fail(`Įtartinas kainos pokytis (${k}: ${old[k]} → ${p[k]} €/l, ${page.url}) – nieko neįrašyta. Patikrinkite pranešimą ir, jei viskas gerai, įrašykite kainas ranka.`);
    }
  }

  const entry = {date: today, diesel: p.diesel, petrol95: p.petrol95};
  const history = [entry, ...(Array.isArray(old.history) ? old.history : []).filter(h => h && h.date !== today)].slice(0, 30);
  const doc = {
    date: today,
    diesel: p.diesel,
    petrol95: p.petrol95,
    lpg: okPrice(p.lpg) ? p.lpg : null,
    source: 'Lietuvos energetikos agentūra',
    sourceUrl: page.url,
    updatedAt: now.iso,
    prev: old.date ? {date: old.date, diesel: old.diesel, petrol95: old.petrol95} : null,
    history
  };
  await writeFile(FILE, JSON.stringify(doc, null, 2) + '\n');
  const d = (a, b) => (a - b >= 0 ? '+' : '') + (a - b).toFixed(3);
  console.log(`Įrašyta ${today}: dyzelinas ${p.diesel} (${d(p.diesel, old.diesel)}), benzinas ${p.petrol95} (${d(p.petrol95, old.petrol95)})` +
    (okPrice(p.lpg) ? `, SND ${p.lpg}` : '') + ` €/l – ${page.url}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => fail(`Kainų atnaujinti nepavyko: ${e.message}`));
