# Jurnal de modificări — TranslateHub

Format: [SemVer](https://semver.org/lang/ro/) (MAJOR.MINOR.PATCH). Istoricul complet al versiunilor anterioare este în secțiunea „Istoric / Changelog” din [README.ro.md](README.ro.md).

## 2.2.1 — 2026-11-02

Actualizare surse (verificate la 2026-11-02). Fără schimbări de logică.

- Linkul „Get key” către cheile API Anthropic: `console.anthropic.com/settings/keys` -> `platform.claude.com/settings/keys` (consola s-a mutat; vechiul URL doar redirecționează).
- Verificate fără modificări: modelul `claude-sonnet-5-5` (activ), păstrarea datelor API de 30 de zile, Google Translate (249 de limbi), documentația Ollama (docs.ollama.com/faq).
- Fereastra Legal & GDPR (GDPR, Cookies, Impressum, Accesibilitate, Tehnologie, Termeni) are acum traduceri încorporate în ro, fr, de, es, it, pt, hu (127 de texte × 7 limbi), afișate instant și fără cheie API; celelalte limbi rămân traduse prin API, ca înainte. Descrierile, taguri-le și textele de ajutor ale cardurilor erau deja traduse în cele 7 limbi.

## 2.2.0 — 2026-11-01

- Corectat: adaptorul «Trimite la…» nu mai aruncă eroare când kitul FFF lipsește (gardian pe fiecare bloc; găsit de testul «fără kit» din CI).

Nou: «Trimite la…» (fff-kit, modulul FFF.bridge) — după orice export de fișier (GPX, ICS, CSV, Markdown) apare butonul «Trimite la…» către aplicațiile compatibile, iar importul de fișiere al aplicației primește plicuri .fff.json trimise de ele, cu confirmare înainte de import. Fără rețea, fără telemetrie.

## 2.1.1 — 2026-10-31

Doar interfață (accesibilitate pe telefon, 360×740): casetele de bifare mai mici de 24 px → 24 px (WCAG 2.5.8). Fără alte schimbări de comportament.

## 2.1.0 — 2026-10-27

### Adăugat
- Motor local opțional Ollama: panoul „Motor de traducere”, adresă (localhost / 127.0.0.1, port 11434), nume model, „Testează conexiunea” (listează modelele). Fără cheie API și fără consimțământ Anthropic în acest mod; scanarea datelor personale este omisă (textul rămâne pe calculator); chip-ul „ce pleacă” și avertismentul despre Anthropic se adaptează. Funcționează în toate modurile de traducere, inclusiv memoria de traducere.
- CSP `connect-src`: adăugate `http://localhost:11434` și `http://127.0.0.1:11434` (singurele gazde noi).
- Panou „Compară”: diferență pe cuvinte (LCS) între traducerea afișată (A) și o a doua traducere (B), lipită sau obținută cu celălalt motor; procent de similaritate; B nu este interpretat ca HTML.
- Test nou `tests/ollama.test.mjs` (53 de verificări: configurare, flux NDJSON, non-stream, erori, trunchiere, diff, comparare în interfață, limbi, 360 px; Ollama și API Anthropic simulate; 0 cereri în afara lor).
- README: „Stare” și „Offline”, limitele motorului local.

### Nu s-a implementat
- Teste cu un server Ollama real și cu modele reale (calitatea traducerii, CORS din browserele reale, comportamentul `file://`): de făcut; marcate în README.
- Alte porturi sau servere Ollama la distanță (ar cere extinderea CSP și au alte implicații de confidențialitate).
- Compararea în modurile text îmbogățit și fișier; compararea a mai mult de două traduceri.
- Memoria de traducere și glosarul existau deja (2.0.0), neschimbate.
- Traducerea interfeței și a secțiunilor Legal/GDPR rămâne la Claude (nu pe modele locale mici).

## 2.0.0 — 2026-10-26

Versiunea anterioară; vezi README.ro.md.
