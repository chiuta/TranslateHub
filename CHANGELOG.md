# Jurnal de modificări — TranslateHub

Format: [SemVer](https://semver.org/lang/ro/) (MAJOR.MINOR.PATCH). Istoricul complet al versiunilor anterioare este în secțiunea „Istoric / Changelog” din [README.ro.md](README.ro.md).

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
