// Vyriausybės 2004-04-29 nutarimo Nr. 526 redakcijų patikra e-TAR → data/rules.json
//
// Kasdien palygina e-TAR redakcijų sąrašą su paskutine patikra. Jei atsirado nauja redakcija – rules.json
// pažymima „needsReview“ (skaičiuoklė rodo įspėjimą) ir sukuriamas GitHub pranešimas (issue): dienpinigių ir
// nakvynės normas tada patikrina ir, jei reikia, pakeičia žmogus. Jau priimtas pakeitimas (upcoming) įsigalioja
// pats nurodytą dieną. Jei e-TAR neatsako ar atmeta užklausą, tai užrašoma ir bandoma kitą dieną; el. laiškas
// siunčiamas tik kartą per savaitę (pirmadieniais), kai sėkmingos patikros nebuvo dvi savaites.
import {readFile, writeFile, appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {vilniusNow, htmlToText, getPage, fail, daysBetween, weekday} from './lib.mjs';

const ACT = 'TAR.E356C85AC1C6';
const EDITIONS = `https://www.e-tar.lt/portal/lt/legalActEditions/${ACT}`;
const ACT_PAGE = `https://www.e-tar.lt/portal/lt/legalAct/${ACT}/asr`;
const FILE = new URL('../data/rules.json', import.meta.url);

// Redakcijų ID (iš nuorodų …/legalAct/TAR.E356C85AC1C6/ShSXRZiQmV) ir jų pradžios datos („Suvestinė nuo 2027-07-01“)
export function parseEditions(html) {
  const ids = [];
  for (const m of String(html).matchAll(/legalAct\/TAR\.E356C85AC1C6\/([A-Za-z0-9]{6,20})\b/g)) if (!ids.includes(m[1])) ids.push(m[1]);
  const froms = [...htmlToText(html).matchAll(/Suvestinė\s+nuo\s+(\d{4}-\d{2}-\d{2})/g)].map(m => m[1]);
  return {ids, froms};
}

// anksčiau priimtas pakeitimas įsigalioja pats
function applyUpcoming(rules, today, idFor) {
  const up = rules.upcoming;
  if (!(up && up.validFrom && up.validFrom <= today)) return;
  rules.params = {...rules.params, ...(up.params || {})};
  rules.edition = {id: (idFor && idFor(up.validFrom)) || null, validFrom: up.validFrom, validTo: null};
  rules.upcoming = null;
  rules.log = Array.isArray(rules.log) ? rules.log : [];
  rules.log.unshift({date: today, entry: `Įsigaliojo redakcija nuo ${up.validFrom}${up.note ? ': ' + up.note : ''}`});
}

// e-TAR neatsakė ar atmetė užklausą: užrašoma, skaičiuoklė (po kelių dienų) tai parodo, bandoma rytoj
async function unreachable(rules, now, problem) {
  const today = now.date;
  rules.etar = {...(rules.etar || {}), lastError: String(problem).slice(0, 200), lastErrorAt: now.iso};
  rules.checkProblem = 'automatinė e-TAR patikra šiuo metu nepavyksta – nutarimo pakeitimus kartais patikrinkite e-TAR';
  applyUpcoming(rules, today, null);
  await writeFile(FILE, JSON.stringify(rules, null, 2) + '\n');
  const last = String(rules.checkedAt || '').slice(0, 10);
  const age = /^\d{4}-\d{2}-\d{2}$/.test(last) ? daysBetween(last, today) : Infinity;
  const msg = `e-TAR patikrinti nepavyko (${problem}). Paskutinė sėkminga patikra: ${last || 'nebuvo'}.`;
  if (age >= 14 && weekday(today) === 1) fail(`${msg} Jau dvi savaitės be patikros – nutarimą patikrinkite e-TAR rankiniu būdu: ${ACT_PAGE}`);
  console.log(`::warning::${msg} Bus bandoma rytoj.`);
}

export async function main() {
  const now = vilniusNow();
  const today = now.date;
  const rules = JSON.parse(await readFile(FILE, 'utf8'));
  let page = null;
  try {
    page = await getPage(EDITIONS);
  } catch (e) {
    return unreachable(rules, now, e.message.replace(`${EDITIONS}: `, ''));
  }
  if (!page) return unreachable(rules, now, 'redakcijų puslapis nerastas');
  const {ids, froms} = parseEditions(page.html);
  if (!ids.length || !froms.length) return unreachable(rules, now, 'redakcijų sąrašo perskaityti nepavyko – galbūt pasikeitė puslapis');

  const paired = ids.length === froms.length;
  const fromOf = id => paired ? froms[ids.indexOf(id)] : null;
  const newestFrom = [...froms].sort().pop();
  const newestId = paired ? ids[froms.indexOf(newestFrom)] : ids[0];
  const before = rules.etar || {};
  // new editions: IDs not seen before (the first run only remembers them; then the count and the newest one are compared)
  const known = Array.isArray(before.knownIds) ? before.knownIds : null;
  const added = known ? ids.filter(id => !known.includes(id)) : [];
  const changed = known ? added.length > 0
    : Boolean(before.newestEditionId && before.newestEditionId !== newestId) || Boolean(before.editionCount && before.editionCount !== ids.length);
  if (!known && changed) added.push(newestId);
  const what = added.map(id => `${id}${fromOf(id) ? ' (nuo ' + fromOf(id) + ')' : ''}`).join(', ');

  const {lastError, lastErrorAt, ...etar} = before;
  rules.etar = {...etar, editionCount: ids.length, newestEditionId: newestId, newestEditionFrom: newestFrom, knownIds: ids};
  rules.checkedAt = now.iso;
  delete rules.checkProblem;
  rules.log = Array.isArray(rules.log) ? rules.log : [];
  applyUpcoming(rules, today, from => paired ? ids[froms.indexOf(from)] : null);

  if (changed) {
    rules.needsReview = true;
    const firstFrom = added.map(fromOf).filter(Boolean).sort()[0];
    rules.note = `e-TAR paskelbta nauja nutarimo redakcija${firstFrom ? ' (galioja nuo ' + firstFrom + ')' : ''} – patikrinkite, ar keičiasi dienpinigių ir nakvynės normos Lietuvoje.`;
    rules.log.unshift({date: today, entry: `Nauja redakcija: ${what}; iš viso redakcijų: ${ids.length}.`});
    const body = [
      `e-TAR paskelbta nauja Vyriausybės nutarimo Nr. 526 redakcija: **${what}**.`,
      '',
      `- Redakcijų sąrašas: ${EDITIONS}`,
      ...added.map(id => `- Nauja redakcija: https://www.e-tar.lt/portal/lt/legalAct/${ACT}/${id}`),
      `- Galiojanti redakcija: ${ACT_PAGE}`,
      '',
      'Skaičiuoklė dabar rodo įspėjimą. Ką daryti:',
      '1. Patikrinkite, ar keičiasi dienpinigių norma Lietuvoje, nakvynės norma ar kitos komandiruočių Lietuvoje taisyklės.',
      '2. Jei keičiasi – faile `data/rules.json` pakeiskite `params` (arba įrašykite `upcoming`, jei pakeitimas įsigalios vėliau).',
      '3. Nustatykite `"needsReview": false` ir `"note": ""` – įspėjimas dings.',
      '4. Uždarykite šį pranešimą.'
    ].join('\n');
    await writeFile('etar-change.md', body + '\n');
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'changed=true\n');
  }
  rules.log = rules.log.slice(0, 30);
  await writeFile(FILE, JSON.stringify(rules, null, 2) + '\n');
  console.log(changed ? `PASIKEITIMAS: nauja redakcija ${what}.` : `Pokyčių nėra: ${ids.length} redakcijos, naujausia nuo ${newestFrom}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => fail(`e-TAR patikra nepavyko: ${e.message}`));
