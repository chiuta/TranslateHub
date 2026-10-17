# TranslateHub

**Versiune:** 1.1.0 · **Ultima actualizare:** 14 octombrie 2026

Director de instrumente gratuite de traducere, cu un traducător AI integrat (Claude), într-un singur fișier HTML.

**Live:** https://chiuta.github.io/TranslateHub/

![Captura de ecran](screenshot.png)

## Ce este

TranslateHub este o pagină unică (`index.html`) care combină două lucruri:

- un director curatoriat de 22 de instrumente gratuite de traducere și lingvistică (Google Translate, DeepL, Linguee, WordReference, MateCat, OmegaT, LibreTranslate etc.), grupate pe trei niveluri: *Beginners*, *Average* și *Professionals*;
- un traducător AI care folosește API-ul Anthropic (Claude), cu cheia API furnizată de utilizator.

## Funcții

- Director cu fișe pentru fiecare instrument (descriere, caracteristici, număr aproximativ de limbi, buton „Open ↗"), cu căutare („Search translation tools") și link-uri de navigare pe niveluri.
- Filtre rapide (chips) sub zona traducătorului, generate din etichetele cardurilor (ex. „Open source”, „API”); scurtături: `/` mută focusul pe căutare, `Esc` o golește.
- Trei moduri de traducere cu AI: **Plain Text**, **Rich Text** (bară de formatare B / I / U / H1–H3 / liste / tabel; export `.html`) și **File Upload**.
- Încărcare de fișiere (max. 2 MB): `.txt`, `.md`, `.html`, `.docx`, `.srt`, `.po`, `.csv`, `.json`; previzualizare și descărcarea fișierului tradus.
- Alegerea limbii sursă (cu „Auto-detect") și a limbii țintă, buton de inversare (⇄; cu „Auto-detect” folosește limba detectată la ultima traducere, ceea ce permite verificarea prin retraducere), căutare în lista de limbi.
- Contor de caractere și cuvinte, butoane „Clear", „Copy", „↓ .txt".
- Buton „Cancel" pentru o traducere în curs.
- Limba interfeței: selector „EN" în bara de sus. Traduceri încorporate pentru 20 de limbi (en, ro, fr, es, de, it, pt, ru, zh-Hans, ja, ar, ko, tr, pl, nl, sv, cs, hu, el, hi); pentru alte limbi interfața este tradusă prin API-ul Claude și păstrată în cache local.
- Secțiuni juridice/de confidențialitate în aplicație (GDPR, stocare în browser, transferuri către terți).

## Funcții noi (1.1.0)

- **Verificare locală de date personale înainte de „Translate”** (`FFF.pii`), în toate cele trei moduri (text simplu, text formatat, fișier): dacă textul conține e-mailuri, telefoane, IBAN, CNP, carduri, IP sau chei, nimic nu pleacă spre `api.anthropic.com` până nu alegi „Maschează bifatele și continuă”, „Continuă fără mascare” sau „Anulează”. Funcționează și cu Ctrl+Enter. Se poate opri (preferința se păstrează).
- **Indicator „ce pleacă”:** „↗ La «Traduce», textul pleacă spre api.anthropic.com”, cu explicație (cheia ta, păstrată doar în filă). Directorul de instrumente și căutarea rulează local.
- **Istoric local de traduceri, opțional (oprit implicit):** doar rezultate reale primite de la API; panou „🗂 Istoric traduceri” cu căutare locală după sens (`FFF.search`), reluarea textului sursă, copiere, export Markdown, ștergere, scanare/mascare de date personale în istoric.
- **Copie criptată** prin eticheta de transparență (`FFF.bundle`). Cheia API rămâne în `sessionStorage` și **nu** intră în copie.

### Limite
- Detecția de date personale este euristică și poate rata ceva; mascarea înlocuiește valorile cu etichete, ceea ce poate schimba traducerea.
- În modul „text formatat” mascarea se aplică nodurilor de text; formatarea rămâne.
- Istoricul are plafon (200 intrări / ~1,5 M caractere).

**Kit FFF.** Din `fff-kit` (lipit în `index.html`, fără rețea) se folosesc modulele `core, label, bundle, pii, search`: etichetă de transparență (apasă versiunea din subsol), export/import/ștergere `.fff.json` cu criptare opțională AES-GCM + PBKDF2, detecția locală de date personale și căutarea locală BM25. Politica CSP **nu a fost schimbată** față de versiunea anterioară în afară de hash-urile `sha256` ale scripturilor inline (stilurile noi sunt în `<style>`, acoperit de `style-src 'unsafe-inline'` deja prezent; nu s-a adăugat nicio gazdă nouă). Traducerile textelor noi în fr/it/es/pt/hu/de sunt automate și **neverificate nativ**. Detecția de date personale este euristică: poate rata sau semnala greșit; nu înlocuiește verificarea ta.

## Manual de utilizare

1. Deschideți pagina. Pentru traducerea cu AI, în bannerul „API key required" introduceți cheia Anthropic în câmpul „Anthropic API key" și apăsați „Save key". „Clear" o șterge; „Get key ↗" deschide pagina de obținere a cheii.
2. Alegeți modul: „✎ Plain Text", „❡ Rich Text" sau „⇪ File Upload".
3. Alegeți limba sursă (sau „Auto-detect") și limba țintă; ⇄ le inversează.
4. Scrieți/lipiți textul (sau trageți fișierul în zona „Drop your file here" / faceți clic pentru a-l alege).
5. Apăsați butonul **Translate** sau `Ctrl+Enter` (`Cmd+Enter` pe macOS) în câmpul de text.
6. Copiați rezultatul („⧉ Copy"), descărcați-l („↓ .txt", „↓ .html" sau „↓ Download translated file").
7. Pentru a schimba limba interfeței, apăsați butonul de limbă din bara de sus și alegeți limba; alegerea se reține.
8. Pentru directorul de instrumente, derulați la „Beginners", „Average users" sau „Professionals" sau folosiți căutarea; „Open ↗" deschide site-ul instrumentului într-o filă nouă.

## Confidențialitate și rețea

- **Stocare locală:** `localStorage` — codul limbii interfeței (`ui_lang_pref`, `ui_lang_name`) și traducerile de interfață păstrate în cache (`ui_<cod>`). `sessionStorage` — cheia API Anthropic (`th_apikey`), ștearsă la închiderea filei; tot în `sessionStorage` se păstrează temporar traducerea secțiunilor juridice/GDPR, dacă o cereți prin API. Aplicația nu setează cookie-uri.
- **Rețea:** aplicația contactează `https://api.anthropic.com/v1/messages` **doar** când folosiți traducerea cu AI sau când alegeți o limbă de interfață fără traducere încorporată. Textul introdus (sau conținutul fișierului) și cheia dumneavoastră sunt trimise către Anthropic; politica aplicației menționează păstrarea datelor de către Anthropic până la 30 de zile. Politica de securitate a paginii (CSP) permite conexiuni doar către acest host (`connect-src https://api.anthropic.com`, `img-src 'self' data:`); `script-src` permite doar scriptul propriu, identificat prin hash SHA-256, fără handler-e inline.
- **Avertisment vizibil înainte de modul AI:** deasupra selectorului de moduri, panoul de traducere afișează o notă (EN, RO, FR, ES, DE, IT, PT; celelalte limbi o primesc în engleză) care spune că textul sau fișierul sunt trimise la Anthropic (SUA), cu cheia utilizatorului, că nu trebuie introduse date personale/sensibile și că nimic nu se trimite înainte de „Translate”. Textul GDPR din aplicație a fost aliniat (nu mai afirmă că aplicația „nu prelucrează date personale”).
- Fonturile sunt încorporate în fișier; parserul `.docx` (mammoth.js) este inclus local în `vendor/`.
- Link-urile din director către site-urile instrumentelor sunt simple legături; nu se face nicio cerere către ele până nu le deschideți.
- Fără analitice și fără reclame (conform notei din aplicație).

## Rulare locală / offline

Descărcați `index.html` (și, pentru fișiere `.docx`, folderul `vendor/`) și deschideți-l în browser. Directorul de instrumente și interfața în cele 20 de limbi încorporate funcționează fără internet; traducerea AI necesită conexiune la internet și o cheie API Anthropic.

## Istoric / Changelog

### 14 octombrie 2026 — versiunea 1.1.0
- Verificare locală de date personale înainte de trimitere, indicator „ce pleacă”, istoric local opțional căutabil, copie criptată `.fff.json`, etichetă de transparență; teste în `tests/fff-r8.test.mjs`.

### 12 octombrie 2026 — versiunea 1.0.0
- 1.0.0 — 2026-10-12: versiunea și data ultimei actualizări sunt afișate în aplicație

### 11 octombrie 2026 (a treia trecere)
- Butonul ⇄ funcționează și cu sursa „Auto-detect”: folosește limba detectată la ultima traducere (insigna „Detected: …”), așa încât retraducerea pentru verificare e un singur clic; altfel mesajul explică ce de făcut. Verificat cu un răspuns API simulat (fără rețea). CSP: hash recalculat.

### 11 octombrie 2026 (a doua trecere)
- Director: filtre rapide pe etichete (generate automat din carduri, fără date noi) și scurtături de tastatură pentru căutare (`/`, `Esc`); butonul Translate arată `Ctrl+Enter` ca titlu. CSP: hash-ul scriptului recalculat.

### 11 octombrie 2026
- Accesibilitate: conținutul paginii (inclusiv zona traducătorului) este acum încadrat în `<main>`, iar widgetul de sprijin are rol de reper; axe-core raportează 0 încălcări la 1280 și 360 px.
- Securitate: handler-ele `onclick` inline au fost înlocuite cu un handler delegat, iar CSP permite doar scriptul propriu prin hash SHA-256 (fără `'unsafe-inline'` în `script-src`).
- Fără cheie API, eroarea „Failed to fetch” este înlocuită cu un mesaj explicit, iar bannerul „API key required” se afișează și primește focus.
- Eticheta „100% Free to use” a devenit „Free directory” (în toate cele 20 de limbi): directorul e gratuit, dar traducerea AI folosește cheia API proprie, plătită de utilizator.
- Date actualizate: Google Translate 249 limbi, DeepL 120 limbi; limita „3 documente/lună” DeepL eliminată (nu a putut fi confirmată). Textele „Last updated” din secțiunile juridice: octombrie 2026.

**Surse verificate la 11.10.2026:** Wikipedia — Google Translate (249 limbi, septembrie 2026); Wikipedia — DeepL Translator (120 limbi, iulie 2026).

## Licență

MIT — vezi fișierul LICENSE

## Audit

Audit: 2026-10-10 (revizuit 2026-10-11) — descrierile din README corespund codului (singurul host contactat: `api.anthropic.com`, doar la traducerea AI / la traducerea interfeței în limbi fără traducere încorporată). Corecturi minore de accesibilitate (contrast, focus). Traducerea automată poate conține erori; nu o folosiți fără verificare pentru documente oficiale sau cu date personale sensibile.

## Autor

Alexio — Alexandru-Ionuț Chiuță. Contact: alexio@trom.tf

## English summary

TranslateHub is a single-file HTML page with a curated directory of 22 free translation tools plus an AI translator (plain text, rich text, file upload for 8 formats) that calls the Anthropic API with the user's own key, kept in sessionStorage. The UI ships with 20 built-in languages. The only host contacted is api.anthropic.com, and only when AI features are used. MIT licence.
