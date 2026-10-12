# Komandiruotės skaičiuoklė – savarankiška versija

Skaičiuoklė veikia kaip paprastas tinklalapis be claude.ai. Duomenys atsinaujina patys:

- **Kuro kainos.** Darbo dienomis 10:01 scenarijus paima Lietuvos energetikos agentūros (LEA) dienos vidutines kainas.
- **Vyriausybės nutarimas Nr. 526.** Kasdien 08:57 scenarijus patikrina, ar e-TAR atsirado nauja redakcija.
- **TomTom.** Atstumai skaičiuojami su įstaigos TomTom API raktu. Pasibaigus vieno rakto mėnesio limitui, skaičiuoklė pati pereina prie antro, o kitą mėnesį grįžta prie pirmojo.

Viskas veikia nemokamai: puslapį rodo **GitHub Pages**, scenarijus paleidžia **GitHub Actions**.

## Kas yra šiame aplanke

| Failas | Paskirtis |
|---|---|
| `index.html` | skaičiuoklė |
| `config.js` | nustatymai (TomTom raktai) |
| `data/fuel.json` | LEA kuro kainos (atnaujina scenarijus) |
| `data/rules.json` | nutarimo Nr. 526 dydžiai (tikrina scenarijus) |
| `scripts/` | kasdieniai scenarijai |
| `.github/workflows/` | jų paleidimo tvarkaraščiai |
| `.nojekyll` | GitHub Pages nustatymas (nekeisti) |

## Įdiegimas (apie 15 min.)

### 1. GitHub paskyra

Užsiregistruokite [github.com/signup](https://github.com/signup), geriausia įstaigos el. paštu. Paskyros vardas bus skaičiuoklės adreso dalis, pvz., `ekoagros` → `https://ekoagros.github.io/...`.

### 2. Nauja saugykla

1. Atidarykite [github.com/new](https://github.com/new).
2. *Repository name*: `komandiruociu-skaiciuokle`.
3. Pasirinkite **Public** (nemokamai GitHub Pages veikia tik su viešomis saugyklomis).
4. Nieko daugiau nežymėkite ir spauskite **Create repository**.

### 3. Failų įkėlimas

1. Naujos saugyklos puslapyje spauskite nuorodą **uploading an existing file**.
2. Nutempkite **visus** išpakuoto aplanko failus ir aplankus: `index.html`, `config.js`, `README.md`, `.nojekyll`, `data`, `scripts`, `.github`.
3. Spauskite **Commit changes**.

> **Dėmesio:** `.github` ir `.nojekyll` yra paslėpti, nes jų pavadinimai prasideda tašku. Kad juos matytumėte:
> - **Windows:** Failų naršyklė → *Rodinys* → *Rodyti* → *Paslėpti elementai*.
> - **macOS:** Finder lange paspauskite `Cmd + Shift + .`.
>
> Įkėlę patikrinkite, ar saugykloje yra aplankas `.github/workflows` su dviem failais. Jei jo nėra, sukurkite failus ranka:
> 1. **Add file → Create new file**.
> 2. Pavadinimas `.github/workflows/kuro-kainos.yml`.
> 3. Įklijuokite to failo turinį ir spauskite **Commit changes**.
> 4. Tą patį pakartokite su `nutarimas-526.yml`.

### 4. Svetainės įjungimas

1. Atidarykite **Settings → Pages**.
2. *Build and deployment* → *Source*: **Deploy from a branch**.
3. *Branch*: **main**, aplankas **/ (root)**, tada **Save**.
4. Po 1–2 min. viršuje atsiras adresas, pvz., `https://ekoagros.github.io/komandiruociu-skaiciuokle/`. Tai skaičiuoklės nuoroda darbuotojams.

### 5. Automatinio atnaujinimo patikra

1. Atidarykite skirtuką **Actions**. Jei GitHub paprašys, spauskite *I understand my workflows, go ahead and enable them*.
2. Kairėje pasirinkite **LEA kuro kainos** → **Run workflow** → **Run workflow**. Po minutės turėtų atsirasti žalia varnelė.
3. Tą patį padarykite su **Nutarimo Nr. 526 patikra**.

LEA kainas skelbia tik darbo dienomis iki 10 val. Paleidus savaitgalį, scenarijus tiesiog parašys, kad šiandien kainų nėra.

### 6. TomTom (nebūtina)

1. Užsiregistruokite [developer.tomtom.com](https://developer.tomtom.com). Pasirinkite nemokamą **Freemium** planą be mokėjimo kortelės.
2. Paskyros skiltyje *Keys* nukopijuokite API raktą. Rekomenduojama rakto nustatymuose apriboti domeną (*domain whitelist*): `ekoagros.github.io` (jūsų paskyros vardas + `.github.io`).
3. Antrą raktą susikurkite kitoje TomTom paskyroje – jis bus atsarginis.
4. Saugykloje atidarykite `config.js` → pieštuko ženklas (*Edit*) → įrašykite raktus:
   ```js
   tomtomKeys: ['pirmasis-raktas', 'antrasis-raktas'],
   ```
5. Spauskite **Commit changes**.

Jei raktų neįrašysite, kiekvienas darbuotojas galės įrašyti savo raktą skaičiuoklėje. Toks raktas išsaugomas tik jo naršyklėje.

## Kaip veikia atnaujinimai

**Kuro kainos**

- Atnaujinamos darbo dienomis 10:01 Vilniaus laiku. Jei LEA vėluoja, bandoma dar 10:31, 11:07, 12:07 ir 13:07.
- GitHub kartais paleidžia scenarijų kelias minutes vėliau. Naujos kainos skaičiuoklėje matomos per kelias minutes, o atidarytas puslapis pats jas perskaito kas 30 min.
- Jei iki 13 val. kainų gauti ar perskaityti nepavyksta, GitHub atsiunčia el. laišką. Skaičiuoklė tada rodo paskutines žinomas kainas su pažyma.
- Jei kaina per dieną pasikeitė daugiau nei 0,30 €/l, scenarijus jos neįrašo (gali būti klaida) ir praneša el. paštu.

**Nutarimas Nr. 526**

- Tikrinamas kasdien 08:57.
- Atsiradus naujai redakcijai, skaičiuoklė rodo įspėjimą, o skiltyje **Issues** atsiranda pranešimas (gausite el. laišką).

## Ką daryti, kai pasikeičia nutarimas Nr. 526

Atidarykite `data/rules.json` → *Edit* ir, jei keičiasi, pataisykite `params`:

| Laukas | Reikšmė |
|---|---|
| `diemNorm` | dienpinigių norma Lietuvoje, €/d. |
| `hotelNorm` | gyvenamojo ploto nuomos norma, €/parą |
| `oneDayDiem` | ar dienpinigiai mokami už vienos dienos komandiruotes (`true`/`false`) |
| `shortDayHours`, `shortDayRate` | trumpesnė nei tiek valandų pirma ar paskutinė diena apmokama tokia normos dalimi |
| `minCollective`, `minLocal7` | mažiausios leidžiamos dienpinigių dalys |

Jei pakeitimas įsigalios vėliau, įrašykite jį į `upcoming`:

```json
"upcoming": {"validFrom": "2027-01-01", "params": {"diemNorm": 30}, "note": "trumpas aprašymas"}
```

Skaičiuoklė tą dieną persijungs pati.

Baigę nustatykite `"needsReview": false` ir `"note": ""`, spauskite **Commit changes** ir uždarykite pranešimą skiltyje *Issues*.

## Kainas pataisyti ranka

Atidarykite `data/fuel.json` → *Edit*, pakeiskite `date`, `diesel` ir `petrol95` (skaičius rašykite su tašku, pvz., `2.215`), tada **Commit changes**.

## Svarbu žinoti

- **Saugykla vieša.** Kodą, kuro kainas ir nutarimo dydžius gali matyti bet kas. Asmeninių duomenų joje nėra – darbuotojo įvesti duomenys lieka jo naršyklėje.
- **TomTom raktas** faile `config.js` matomas kiekvienam, kas atidaro puslapį. Domeno apribojimas trukdo jį naudoti kitose svetainėse, bet visiškai neapsaugo.
- **Freemium plane** pasiekus limitą TomTom tiesiog nebeatsako (klaida 429) ir nieko neapmokestina. Skaičiuoklė tada pereina prie antro rakto, o jam baigusis – prie rankinio įvedimo.
- **Užklausų skaitliukas** skaičiuojamas kiekvienoje naršyklėje atskirai. Bendrą paskyros ribą saugo pats TomTom.
- **Neaktyvi saugykla.** GitHub sustabdo tvarkaraščius, jei saugykla 60 dienų neaktyvi. Kasdieniai duomenų įrašai ją palaiko aktyvią. Jei vis dėlto sustabdytų: **Actions** → užduotis → **Enable workflow**.
- **Nauja skaičiuoklės versija:** **Add file → Upload files** ir įkelkite naują `index.html`.
