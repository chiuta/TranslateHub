// Teste 2.1.0: motor local Ollama (opțional) și compararea traducerilor. Ollama și API-ul Anthropic sunt SIMULATE prin route
// (nu s-a testat cu un server Ollama real și cu modele reale). Rulare: node tests/ollama.test.mjs  (PW_ROOT=…/playwright/package.json dacă e nevoie)
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const FILE = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'};

async function open({init, ollama = 'ok', lang = 'en-US', vp = {width: 1200, height: 1000}} = {}) {
  const ctx = await b.newContext({viewport: vp, locale: lang});
  const st = {oll: [], anth: [], other: [], errs: []};
  if (init) await ctx.addInitScript(init);
  await ctx.route(/^https?:/, async (r) => {
    const u = r.request().url(), m = r.request().method();
    if (/^http:\/\/(localhost|127\.0\.0\.1):11434\//.test(u)) {
      if (m === 'OPTIONS') return r.fulfill({status: 204, headers: CORS});
      if (ollama === 'down') return r.abort('connectionrefused');
      if (/\/api\/tags$/.test(u)) return r.fulfill({status: 200, headers: {...CORS, 'content-type': 'application/json'}, body: JSON.stringify({models: [{name: 'm-small:1b'}, {name: 'm-big:8b'}]})});
      const body = JSON.parse(r.request().postData() || '{}'); st.oll.push({u, body});
      const user = body.messages[1].content;
      if (ollama === 'err') return r.fulfill({status: 404, headers: {...CORS, 'content-type': 'application/json'}, body: JSON.stringify({error: 'model "x" not found'})});
      if (ollama === 'trunc') return r.fulfill({status: 200, headers: {...CORS, 'content-type': 'application/json'}, body: JSON.stringify({message: {role: 'assistant', content: 'par'}, done: true, done_reason: 'length'})});
      const out = 'OLL[' + user.split('\n').slice(2).join(' ') + ']';
      if (body.stream) {
        const parts = [out.slice(0, 5), out.slice(5, 9), out.slice(9)];
        const nd = parts.map((p) => JSON.stringify({message: {role: 'assistant', content: p}, done: false})).join('\n') + '\n' + JSON.stringify({done: true, done_reason: 'stop'}) + '\n';
        return r.fulfill({status: 200, headers: {...CORS, 'content-type': 'application/x-ndjson'}, body: nd});
      }
      return r.fulfill({status: 200, headers: {...CORS, 'content-type': 'application/json'}, body: JSON.stringify({message: {role: 'assistant', content: out}, done: true, done_reason: 'stop'})});
    }
    if (/api\.anthropic\.com/.test(u)) {
      if (m === 'OPTIONS') return r.fulfill({status: 204, headers: CORS});
      const body = JSON.parse(r.request().postData() || '{}'); st.anth.push({body, key: r.request().headers()['x-api-key']});
      const user = body.messages[0].content;
      if (body.stream) {
        const t = 'CLA[' + user.split('\n').slice(2).join(' ') + ']';
        const sse = 'event: content_block_delta\ndata: ' + JSON.stringify({type: 'content_block_delta', delta: {type: 'text_delta', text: t}}) + '\n\n';
        return r.fulfill({status: 200, headers: {...CORS, 'content-type': 'text/event-stream'}, body: sse});
      }
      return r.fulfill({status: 200, headers: {...CORS, 'content-type': 'application/json'}, body: JSON.stringify({content: [{type: 'text', text: 'CLA[' + user.split('\n').slice(2).join(' ') + ']'}], stop_reason: 'end_turn'})});
    }
    st.other.push(u); return r.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => st.errs.push(e.message));
  page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) st.errs.push('csp: ' + m.text().slice(0, 140)); });
  await page.goto(FILE); await page.waitForTimeout(1200);
  return {ctx, page, st};
}
const OLL = () => { try { localStorage.setItem('translatehub.provider', 'ollama'); localStorage.setItem('translatehub.ollama.model', 'm-small:1b'); } catch (e) {} };
const outText = (p) => p.textContent('#tr-output');

// ---------- 1. implicit: Claude, fără schimbări
{
  const {ctx, page, st} = await open();
  check('implicit: motorul este Claude, panoul e închis', await page.evaluate(() => thProvider() === 'anthropic' && !document.getElementById('th-engine').open && document.getElementById('th-oll').hidden));
  check('implicit: avertismentul despre Anthropic este vizibil, nota locală ascunsă', await page.evaluate(() => !document.getElementById('ai-privacy').hidden && document.getElementById('th-local').hidden));
  check('implicit: rezumatul spune Claude', /Claude/.test(await page.textContent('#th-eng-sum')));
  await ctx.close();
}
// ---------- 2. Claude fără cheie: comportament neschimbat
{
  const {ctx, page, st} = await open();
  await page.fill('#tr-source', 'Hello world'); await page.click('#translate-btn'); await page.waitForTimeout(500);
  check('fără cheie: apare bara cheii, nicio cerere', await page.evaluate(() => !document.getElementById('apikey-banner').classList.contains('hidden')) && st.anth.length === 0 && st.oll.length === 0);
  await ctx.close();
}
// ---------- 3. Ollama: configurare, test conexiune, salvare
{
  const {ctx, page, st} = await open();
  await page.click('#th-eng-sum');
  await page.check('input[name="th-prov"][value="ollama"]');
  check('Ollama: câmpurile apar, nota locală apare, avertismentul Anthropic dispare', await page.evaluate(() => !document.getElementById('th-oll').hidden && !document.getElementById('th-local').hidden && document.getElementById('ai-privacy').hidden));
  check('Ollama: alegerea persistă în localStorage', await page.evaluate(() => localStorage.getItem('translatehub.provider') === 'ollama'));
  check('Ollama: indicatorul „ce pleacă” spune că merge doar la Ollama local', /Ollama/.test(await page.textContent('#c5-chip')) && !/api\.anthropic\.com/.test(await page.textContent('#c5-chip')));
  await page.click('#th-oll-save'); check('salvare fără model: mesaj de eroare, nimic salvat', /installed model/i.test(await page.textContent('#th-oll-status')) && await page.evaluate(() => thOllamaModel() === ''));
  await page.fill('#th-oll-model', 'bad name!'); await page.click('#th-oll-save');
  check('nume de model invalid respins', /Invalid model/i.test(await page.textContent('#th-oll-status')) && await page.evaluate(() => thOllamaModel() === ''));
  await page.click('#th-oll-test'); await page.waitForTimeout(400);
  check('test conexiune: modele listate (2)', /Installed models: 2/.test(await page.textContent('#th-oll-status')) && await page.evaluate(() => document.querySelectorAll('#th-oll-models option').length === 2));
  await page.fill('#th-oll-model', 'm-small:1b'); await page.press('#th-oll-model', 'Enter');
  check('Enter salvează modelul; rezumatul îl arată', await page.evaluate(() => thOllamaModel() === 'm-small:1b') && /m-small:1b/.test(await page.textContent('#th-eng-sum')));
  await page.selectOption('#th-oll-url', 'http://127.0.0.1:11434'); await page.click('#th-oll-test'); await page.waitForTimeout(300);
  check('adresa 127.0.0.1 este salvată', await page.evaluate(() => thOllamaUrl() === 'http://127.0.0.1:11434'));
  await page.evaluate(() => { localStorage.setItem('translatehub.ollama.url', 'http://evil.example:11434'); });
  check('adresă nepermisă în localStorage → revine la localhost', await page.evaluate(() => thOllamaUrl() === 'http://localhost:11434'));
  check('0 cereri în afara Ollama/Anthropic', st.other.length === 0 && st.anth.length === 0, st.other);
  check('0 erori / CSP', st.errs.length === 0, st.errs);
  await ctx.close();
}
// ---------- 4. traducere cu Ollama: text scurt (stream), fără cheie, fără consimțământ, fără PII, fără Anthropic
{
  const {ctx, page, st} = await open({init: OLL});
  await page.fill('#tr-source', 'Salut lume. Scrie-mi la ana@example.com');
  await page.click('#translate-btn'); await page.waitForTimeout(800);
  const o = await outText(page);
  check('stream NDJSON asamblat corect', o.startsWith('OLL[') && /ana@example\.com/.test(o), o);
  check('cerere către /api/chat cu modelul, system+user, stream=true', st.oll.length === 1 && st.oll[0].body.model === 'm-small:1b' && st.oll[0].body.stream === true && st.oll[0].body.messages[0].role === 'system' && /translate to Romanian/i.test(st.oll[0].body.messages[1].content), st.oll[0] && st.oll[0].body);
  check('nicio cerere către Anthropic, nicio cheie cerută', st.anth.length === 0 && await page.evaluate(() => document.getElementById('apikey-banner').classList.contains('hidden')));
  check('fără dialog de consimțământ / PII (nu iese nimic de pe calculator)', await page.evaluate(() => !document.querySelector('dialog[open]')));
  // text lung → callAPI non-stream
  await page.fill('#tr-source', ('Propoziție lungă pentru test. '.repeat(130)).trim());
  await page.click('#translate-btn'); await page.waitForTimeout(1200);
  check('text lung: răspuns non-stream asamblat', /^OLL\[/.test(await outText(page)) && st.oll.some((x) => x.body.stream === false), st.oll.map((x) => x.body.stream));
  check('0 cereri în afara Ollama', st.other.length === 0 && st.anth.length === 0);
  check('0 erori / CSP', st.errs.length === 0, st.errs);
  await ctx.close();
}
// ---------- 5. erori Ollama
{
  let c = await open({init: OLL, ollama: 'down'});
  await c.page.fill('#tr-source', 'Hello'); await c.page.click('#translate-btn'); await c.page.waitForTimeout(800);
  let o = await outText(c.page);
  check('Ollama oprit: mesaj clar (OLLAMA_ORIGINS), fără bara cheii', /Could not reach Ollama/.test(o) && /OLLAMA_ORIGINS/.test(o) && await c.page.evaluate(() => document.getElementById('apikey-banner').classList.contains('hidden')), o);
  await c.ctx.close();
  c = await open({init: OLL, ollama: 'err'});
  await c.page.fill('#tr-source', 'Hello'); await c.page.click('#translate-btn'); await c.page.waitForTimeout(800);
  check('eroare HTTP Ollama afișată (model inexistent)', /Ollama 404.*not found/.test(await outText(c.page)), await outText(c.page));
  await c.ctx.close();
  c = await open({init: OLL, ollama: 'trunc'});
  await c.page.fill('#tr-source', ('Test. '.repeat(900))); await c.page.click('#translate-btn'); await c.page.waitForTimeout(1200);
  check('done_reason=length → mesaj de trunchiere, nu rezultat parțial prezentat ca bun', /truncated/i.test(await outText(c.page)), await outText(c.page));
  await c.ctx.close();
  c = await open({init: () => { try { localStorage.setItem('translatehub.provider', 'ollama'); } catch (e) {} }});
  await c.page.fill('#tr-source', 'Hello'); await c.page.click('#translate-btn'); await c.page.waitForTimeout(500);
  check('Ollama fără model ales: nimic nu pleacă, panoul se deschide pe câmpul modelului', c.st.oll.length === 0 && await c.page.evaluate(() => document.getElementById('th-engine').open && document.activeElement.id === 'th-oll-model'));
  await c.ctx.close();
}
// ---------- 6. comparare: diff pur
{
  const {ctx, page} = await open();
  const d = (a, b) => page.evaluate(([a, b]) => { const r = thCompare.diff(a, b); return r && {sim: r.sim, da: r.a.filter((x) => x.d).map((x) => x.t), db: r.b.filter((x) => x.d).map((x) => x.t), same: r.same, n: r.n, m: r.m}; }, [a, b]);
  let r = await d('the cat sat on the mat', 'the cat sat on the mat');
  check('diff: identice → 100%, nimic marcat', r.sim === 100 && !r.da.length && !r.db.length, r);
  r = await d('the cat sat on the mat', 'The Cat sat on a mat');
  check('diff: majuscule ignorate; „the”→„a” marcate', r.da.join() === 'the' && r.db.join() === 'a', r);
  r = await d('Bună ziua, lume!', 'Bună ziua lume');
  check('diff: punctuația diferită este marcată', r.da.join() === ',,!'.replace(',,', ',') .replace(',!', ',!').split('').join('') || (r.da.includes(',') && r.da.includes('!')), r);
  r = await d('a b c d', 'x y z');
  check('diff: complet diferite → 0%', r.sim === 0 && r.da.length === 4 && r.db.length === 3, r);
  r = await d('', ''); check('diff: goale → 100%', r.sim === 100);
  r = await d('ünï cödé', 'ünï cödé extra'); check('diff: diacritice/Unicode păstrate', r.db.join() === 'extra' && !r.da.length, r);
  const big = await d('w '.repeat(2600), 'w '.repeat(10)); check('diff: peste 2500 de cuvinte → null (limită)', big === null);
  const t0 = Date.now(); r = await d(Array.from({length: 2000}, (_, i) => 'cuv' + (i % 97)).join(' '), Array.from({length: 2000}, (_, i) => 'cuv' + ((i * 7) % 97)).join(' ')); check('diff: 2000×2000 cuvinte sub 5 s (' + (Date.now() - t0) + ' ms)', Date.now() - t0 < 5000);
  await ctx.close();
}
// ---------- 7. comparare în UI: lipire manuală + motor opus
{
  const {ctx, page, st} = await open({init: () => { OLL(); try { sessionStorage.setItem('th_apikey', 'sk-ant-test-key-0123456789abcdef'); localStorage.setItem('translatehub.aiConsent', '1'); } catch (e) {} function OLL() { try { localStorage.setItem('translatehub.provider', 'ollama'); localStorage.setItem('translatehub.ollama.model', 'm-small:1b'); } catch (e) {} } }});
  await page.click('#th-cmp-btn');
  check('comparare înainte de orice traducere: mesaj, panoul rămâne închis', await page.evaluate(() => document.getElementById('th-cmp').hidden));
  await page.fill('#tr-source', 'Hello big world'); await page.click('#translate-btn'); await page.waitForTimeout(800);
  await page.click('#th-cmp-btn');
  check('panou de comparare deschis, A = rezultatul Ollama', await page.evaluate(() => !document.getElementById('th-cmp').hidden && /^OLL\[/.test(document.getElementById('th-cmp-a').textContent)));
  check('titlul A numește motorul (Ollama)', /Ollama/.test(await page.textContent('#th-cmp-ah')));
  check('butonul propune motorul opus (Claude)', /Claude/.test(await page.textContent('#th-cmp-run')));
  await page.fill('#th-cmp-b-in', 'OLL[Hello small world]');
  const m = await page.evaluate(() => ({a: [...document.querySelectorAll('#th-cmp-a .th-del')].map((x) => x.textContent), b: [...document.querySelectorAll('#th-cmp-b .th-ins')].map((x) => x.textContent), sim: document.getElementById('th-cmp-sim').textContent}));
  check('diferențe marcate în A și B (big/small), similaritate afișată', m.a.join() === 'big' && m.b.join() === 'small' && /Similarity: \d+%/.test(m.sim), m);
  await page.fill('#th-cmp-b-in', '<img src=x onerror=alert(1)>'); 
  check('conținutul din B nu este interpretat ca HTML', await page.evaluate(() => !document.querySelector('#th-cmp img') && /<img/.test(document.getElementById('th-cmp-b').textContent)));
  await page.fill('#th-cmp-b-in', '');
  await page.click('#th-cmp-run'); await page.waitForTimeout(900);
  check('„Tradu cu Claude”: o cerere Anthropic cu cheia, B completat', st.anth.length === 1 && st.anth[0].key.startsWith('sk-ant-') && await page.evaluate(() => /^CLA\[/.test(document.getElementById('th-cmp-b-in').value)), st.anth);
  check('rezultatul lui B este comparat cu A (CLA vs OLL marcate)', await page.evaluate(() => document.querySelectorAll('#th-cmp-a .th-del').length > 0 && document.querySelectorAll('#th-cmp-b .th-ins').length > 0));
  await page.keyboard.press('Escape');
  check('Esc închide panoul de comparare (focus pe butonul Compară)', await page.evaluate(() => document.getElementById('th-cmp').hidden && document.activeElement.id === 'th-cmp-btn'));
  check('0 cereri în afara Ollama/Anthropic; 0 erori / CSP', st.other.length === 0 && st.errs.length === 0, {o: st.other, e: st.errs});
  await ctx.close();
}
// ---------- 8. comparare: Claude → Ollama; Claude fără cheie
{
  const {ctx, page, st} = await open({init: () => { try { sessionStorage.setItem('th_apikey', 'sk-ant-test-key-0123456789abcdef'); localStorage.setItem('translatehub.aiConsent', '1'); localStorage.setItem('translatehub.ollama.model', 'm-small:1b'); localStorage.setItem('translatehub.piiguard', '0'); } catch (e) {} }});
  await page.fill('#tr-source', 'Good morning'); await page.click('#translate-btn'); await page.waitForTimeout(800);
  check('Claude a tradus (stream simulat)', /^CLA\[/.test(await outText(page)) && st.anth.length === 1);
  await page.click('#th-cmp-btn'); check('butonul propune Ollama', /Ollama/.test(await page.textContent('#th-cmp-run')));
  await page.click('#th-cmp-run'); await page.waitForTimeout(800);
  check('„Tradu cu Ollama”: o cerere locală; Anthropic nu mai primește nimic', st.oll.length === 1 && st.anth.length === 1 && await page.evaluate(() => /^OLL\[/.test(document.getElementById('th-cmp-b-in').value)));
  await ctx.close();
}
{
  const {ctx, page, st} = await open({init: OLL});
  await page.fill('#tr-source', 'Hello'); await page.click('#translate-btn'); await page.waitForTimeout(700);
  await page.click('#th-cmp-btn'); await page.click('#th-cmp-run'); await page.waitForTimeout(500);
  check('comparare cu Claude fără cheie: nu pleacă nimic spre Anthropic, bara cheii apare', st.anth.length === 0 && await page.evaluate(() => !document.getElementById('apikey-banner').classList.contains('hidden')));
  await ctx.close();
}
// ---------- 9. limbi și ecran îngust
{
  const {ctx, page, st} = await open({init: OLL, lang: 'ro-RO'});
  await page.evaluate(() => document.documentElement.setAttribute('lang', 'ro')); await page.waitForTimeout(300);
  check('română: panoul motorului tradus', /Motor de traducere: Ollama/.test(await page.textContent('#th-eng-sum')) && /Compară/.test(await page.textContent('#th-cmp-btn')));
  await page.evaluate(() => document.documentElement.setAttribute('lang', 'hu')); await page.waitForTimeout(300);
  check('maghiară: tradus', /Fordítómotor/.test(await page.textContent('#th-eng-sum')));
  await page.evaluate(() => document.documentElement.setAttribute('lang', 'ja')); await page.waitForTimeout(300);
  check('limbă fără traducere: engleză', /Translation engine/.test(await page.textContent('#th-eng-sum')));
  await ctx.close();
}
{
  const {ctx, page} = await open({init: OLL, vp: {width: 360, height: 700}});
  await page.click('#th-eng-sum'); await page.fill('#tr-source', 'Hello'); await page.click('#translate-btn'); await page.waitForTimeout(700); await page.click('#th-cmp-btn');
  check('360 px: fără scroll orizontal cu panourile deschise', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), await page.evaluate(() => document.documentElement.scrollWidth));
  check('360 px: comparația pe o coloană', await page.evaluate(() => { const c = document.querySelector('.th-cmp-cols'); return getComputedStyle(c).gridTemplateColumns.split(' ').length === 1; }));
  await ctx.close();
}
await b.close();
console.log(`\nollama: ${ok} ok, ${bad} eșuate`); process.exit(bad ? 1 : 0);
