// Vyriausybės 2004-04-29 nutarimo Nr. 526 redakcijų patikra e-TAR → data/rules.json
//
// Kasdien palygina e-TAR redakcijų sąrašą su paskutine patikra. Jei atsirado nauja redakcija – rules.json
// pažymima „needsReview“ (skaičiuoklė rodo įspėjimą) ir sukuriamas GitHub pranešimas (issue): dienpinigių ir
// nakvynės normas tada patikrina ir, jei reikia, pakeičia žmogus. Jau priimtas pakeitimas (upcoming) įsigalioja
// pats nurodytą dieną.
import {readFile, writeFile, appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {vilniusNow, htmlToText, getPage, fail} from './lib.mjs';

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

export async function main() {
  const now = vilniusNow();
  const today = now.date;
  const rules = JSON.parse(await readFile(FILE, 'utf8'));
  const page = await getPage(EDITIONS);
  if (!page) fail(`e-TAR redakcijų puslapis nerastas: ${EDITIONS}`);
  const {ids, froms} = parseEditions(page.html);
  if (!ids.length || !froms.length) fail(`e-TAR redakcijų sąrašo perskaityti nepavyko (${EDITIONS}) – galbūt pasikeitė puslapis. Nieko nepakeista.`);

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

  rules.etar = {...before, editionCount: ids.length, newestEditionId: newestId, newestEditionFrom: newestFrom, knownIds: ids};
  rules.checkedAt = now.iso;
  rules.log = Array.isArray(rules.log) ? rules.log : [];

  // anksčiau priimtas pakeitimas įsigalioja pats
  const up = rules.upcoming;
  if (up && up.validFrom && up.validFrom <= today) {
    rules.params = {...rules.params, ...(up.params || {})};
    const id = paired ? ids[froms.indexOf(up.validFrom)] : undefined;
    rules.edition = {id: id || null, validFrom: up.validFrom, validTo: null};
    rules.upcoming = null;
    rules.log.unshift({date: today, entry: `Įsigaliojo redakcija nuo ${up.validFrom}${up.note ? ': ' + up.note : ''}`});
  }

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
