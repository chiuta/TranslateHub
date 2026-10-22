# Componente terțe și licențe

> **ȘABLON — de confirmat de autor.** Generat automat pe baza fișierelor găsite în depozit (nume, versiuni, sume SHA-256). Licențele componentelor sunt cele publicate de proiectele respective, din câte se știe; nu au fost verificate juridic. Autorul verifică fiecare rând, completează versiunile și textele de licență, apoi șterge acest bloc.

`index.html` este un singur fișier care conține, pe lângă codul propriu (licența din `LICENSE`), componente terțe. Fiecare își păstrează licența.

## Vendorizate în depozit

| Componentă | Fișier | Licență (de confirmat) | SHA-256 |
|---|---|---|---|
| [mammoth.js](https://github.com/mwilliamson/mammoth.js) (build pentru browser; versiunea de completat din antetul fișierului sau din `npm pack mammoth`) | `vendor/mammoth.browser.min.js` | BSD-2-Clause | `596ef52239e52d8ee3cee10b2ee4a72596abf900d0e4f468593f956e9f1809b0` |

Fișierul mammoth.browser.min.js conține, împachetate de autorul mammoth, dependențele sale (JSZip, bluebird, pako, underscore, printre altele). Fiecare are licența proprie (în general MIT; JSZip este oferit sub MIT sau GPL-3.0, la alegere; pako este MIT cu parte zlib). **De confirmat de autor:** lista exactă și textele de licență, din `NOTICE`/`LICENSE` ale pachetului mammoth la versiunea folosită.

## Fonturi încorporate în `index.html`

| Font | Licență (de confirmat) |
|---|---|
| Barlow și Barlow Condensed (Jeremy Tribby) | SIL Open Font License 1.1 |
| Cormorant Garamond (Christian Thalmann / Catharsis Fonts) | SIL Open Font License 1.1 |

OFL 1.1 permite încorporarea și redistribuirea împreună cu software-ul, cu condiția păstrării notei de copyright și a textului licenței. **De confirmat de autor:** dacă fonturile sunt încorporate ca fișiere `@font-face` (data URI) sau doar referite, și adăugarea textului OFL și a notelor de copyright ale fiecărei familii.

## Descărcate la cerere

Aplicația nu descarcă componente terțe la rulare (de confirmat, în funcție de motoarele de traducere configurate de utilizator: apelurile către serviciile alese de utilizator sunt făcute cu cheia lui și nu fac parte din acest fișier).
