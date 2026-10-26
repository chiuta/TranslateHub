// Teste 2.0.0: memorie de traducere locală (segmente, reutilizare, glosar, TMX/XLIFF). API-ul Anthropic e simulat prin route.
// Rulare: node tests/memory.test.mjs  (Playwright din /opt/node-tools, Chromium local)
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const FILE = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'};

async function open({tmOn = true, mode = 'ok', lang = 'en-US'} = {}) {
  const ctx = await b.newContext({viewport: {width: 1200, height: 1000}, locale: lang, acceptDownloads: true});
  const reqs = [];
  await ctx.addInitScript((on) => {
    try { sessionStorage.setItem('th_apikey', 'sk-ant-test'); localStorage.setItem('translatehub.aiConsent', '1'); if (on) localStorage.setItem('translatehub.tm.on', '1'); } catch (e) {}
  }, tmOn);
  await ctx.route(/^https?:/, async (r) => {
    const u = r.request().url();
    if (!/api\.anthropic\.com/.test(u)) return r.abort();
    if (r.request().method() === 'OPTIONS') return r.fulfill({status: 204, headers: CORS});
    const body = JSON.parse(r.request().postData() || '{}');
    const user = body.messages[0].content;
    reqs.push({sys: body.system, user});
    let text;
    if (/⟦\d+⟧/.test(user)) {
      const lines = user.split('\n').filter((l) => /^⟦\d+⟧/.test(l));
      if (mode === 'drop2') text = lines.filter((l, i) => i !== 1).map((l) => l.replace(/^(⟦\d+⟧) (.*)$/, '$1 RO:$2')).join('\n');
      else text = lines.map((l) => l.replace(/^(⟦\d+⟧) (.*)$/, '$1 RO:$2')).join('\n');
    } else {
      text = 'RO:' + user.split('\n\n').slice(1).join('\n\n');
    }
    r.fulfill({status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({content: [{type: 'text', text}], stop_reason: 'end_turn'})});
  });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(FILE); await page.waitForTimeout(500);
  await page.selectOption('#src-lang', 'en'); await page.selectOption('#tgt-lang', 'ro');
  return {ctx, page, reqs, errs};
}
const translate = async (page, text) => {
  await page.fill('#tr-source', text);
  await page.click('#translate-btn');
  await page.waitForFunction(() => !document.querySelector('#translate-btn').disabled, null, {timeout: 15000});
  await page.waitForTimeout(150);
  return page.textContent('#tr-output');
};

{ // segmentare
  const {ctx, page} = await open();
  const r = await page.evaluate(() => {
    const t = 'Dr. Smith paid 3.5 euros. Next one!  Third?\n\nA. B. Jones left.\n---\nNo end';
    const toks = thTM.segment(t);
    return {n: toks.filter((k) => !k.raw).length, same: toks.map((k) => k.pre + k.t + k.sep).join('') === t, segs: toks.filter((k) => !k.raw).map((k) => k.t)};
  });
  check('segmentare: abrevieri/zecimale/inițiale nu rup propoziția', r.segs.join('|') === 'Dr. Smith paid 3.5 euros.|Next one!|Third?|A. B. Jones left.|No end', r.segs);
  check('segmentare: concatenarea reproduce textul exact', r.same);
  await ctx.close();
}
{ // oprit implicit: calea veche (fără marcaje)
  const {ctx, page, reqs} = await open({tmOn: false});
  const out = await translate(page, 'Hello world. Second one.');
  check('memorie oprită: calea veche (fără marcaje ⟦n⟧ în cerere)', reqs.length >= 1 && !/⟦/.test(reqs[0].user), reqs[0] && reqs[0].user);
  await ctx.close();
}
{ // flux principal
  const {ctx, page, reqs, errs} = await open();
  const T1 = 'Hello world. How are you?\nSecond line here.';
  let out = await translate(page, T1);
  check('1 cerere cu 3 segmente numerotate', reqs.length === 1 && (reqs[0].user.match(/⟦\d+⟧/g) || []).length === 3, reqs.map((r) => r.user));
  check('ieșire cu structura păstrată (rând nou între segmente)', out === 'RO:Hello world. RO:How are you?\nRO:Second line here.', JSON.stringify(out));
  check('memoria are 3 segmente', await page.evaluate(() => thTM.count()) === 3);
  check('statistici: 0 din 3 reutilizate', /0 of 3 segments reused, 3 sent/.test(await page.textContent('#tm-stats')), await page.textContent('#tm-stats'));
  // a doua oară: nicio cerere
  const n0 = reqs.length;
  out = await translate(page, T1);
  check('a doua traducere: fără cereri către AI', reqs.length === n0, reqs.length);
  check('a doua traducere: același rezultat din memorie', out === 'RO:Hello world. RO:How are you?\nRO:Second line here.', out);
  check('statistici: 3 din 3 reutilizate', /3 of 3 segments reused, 0 sent/.test(await page.textContent('#tm-stats')));
  // text extins: doar segmentul nou pleacă
  out = await translate(page, T1 + ' Brand new sentence.');
  const last = reqs[reqs.length - 1].user;
  check('doar segmentul nou pleacă la AI', reqs.length === n0 + 1 && /Brand new sentence\./.test(last) && !/Hello world|How are you|Second line/.test(last), last);
  check('rezultat combinat corect', out === 'RO:Hello world. RO:How are you?\nRO:Second line here. RO:Brand new sentence.', out);
  // persistența
  await page.reload(); await page.waitForTimeout(400);
  await page.selectOption('#src-lang', 'en'); await page.selectOption('#tgt-lang', 'ro');
  check('memoria persistă după reîncărcare (4 segmente)', await page.evaluate(() => thTM.count()) === 4);
  check('casetă bifată după reîncărcare', await page.isChecked('#tm-on'));
  const n1 = reqs.length; await translate(page, 'Hello world.');
  check('după reîncărcare: reutilizare fără cerere', reqs.length === n1);
  // altă pereche de limbi nu refolosește
  await page.selectOption('#tgt-lang', 'fr'); await translate(page, 'Hello world.');
  check('altă pereche (en→fr): segmentul nu se reutilizează', reqs.length === n1 + 1);
  await page.selectOption('#tgt-lang', 'ro');
  check('niciun pageerror', errs.length === 0, errs);
  await ctx.close();
}
{ // auto-detect ocolește memoria
  const {ctx, page, reqs} = await open();
  await page.selectOption('#src-lang', 'auto');
  await translate(page, 'Hello there.');
  check('Auto-detect: calea veche + mesaj explicativ', !/⟦/.test(reqs[0].user) && /Auto-detect/.test(await page.textContent('#tm-stats')), await page.textContent('#tm-stats'));
  await ctx.close();
}
{ // model care omite un marcaj -> recuperare per segment
  const {ctx, page, reqs} = await open({mode: 'drop2'});
  const out = await translate(page, 'Alpha one. Beta two. Gamma three.');
  check('segment lipsă: recuperat printr-o cerere separată', reqs.length === 2 && /RO:Alpha one\. RO:Beta two\. RO:Gamma three\./.test(out), [reqs.length, out]);
  check('toate 3 segmentele ajung în memorie', await page.evaluate(() => thTM.count()) === 3);
  await ctx.close();
}
{ // glosar + manager + TMX/XLIFF
  const {ctx, page, reqs} = await open();
  await translate(page, 'The server is down. Restart it.');
  await page.click('#tm-btn'); await page.waitForSelector('dialog.c5-dlg[open]');
  check('managerul listează 2 intrări', (await page.$$('#tm-list > li.c5-li')).length === 2);
  // editare traducere
  await page.fill('#tm-t0', 'EDITAT'); await page.$eval('#tm-t0', (e) => e.dispatchEvent(new Event('change')));
  await page.fill('#tm-gs', 'server'); await page.fill('#tm-gt', 'serverul'); await page.click('#tm-gadd');
  check('termen de glosar adăugat', /server → serverul/.test(await page.textContent('#tm-gl')), await page.textContent('#tm-gl'));
  // căutare în memorie
  await page.fill('#tm-q', 'restart');
  check('căutare în memorie filtrează', (await page.$$('#tm-list > li.c5-li')).length === 1);
  await page.fill('#tm-q', '');
  // export TMX
  const [d1] = await Promise.all([page.waitForEvent('download'), page.click('#tm-exp-tmx')]);
  const tmx = fs.readFileSync(await d1.path(), 'utf8');
  check('TMX: antet 1.4 și 2 unități', /<tmx version="1.4">/.test(tmx) && (tmx.match(/<tu>/g) || []).length === 2 && /xml:lang="en"/.test(tmx) && /xml:lang="ro"/.test(tmx), tmx.slice(0, 200));
  check('TMX: conține editarea făcută', /EDITAT/.test(tmx));
  const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#tm-exp-xlf')]);
  const xlf = fs.readFileSync(await d2.path(), 'utf8');
  check('XLIFF 1.2: file/trans-unit cu limbile', /source-language="en" target-language="ro"/.test(xlf) && (xlf.match(/<trans-unit /g) || []).length === 2, xlf.slice(0, 250));
  // ștergere + import înapoi
  await page.click('#tm-clear'); await page.waitForTimeout(200);
  const yes = await page.$('dialog[open] button.c5-pri, .c5-dlg button.c5-pri'); 
  if (yes) await yes.click();
  await page.waitForFunction(() => thTM.count() === 0, null, {timeout: 5000}).catch(() => {});
  const cnt0 = await page.evaluate(() => thTM.count());
  check('ștergerea golește memoria', cnt0 === 0, cnt0);
  fs.writeFileSync('/tmp/th-test.tmx', tmx);
  await page.setInputFiles('#tm-file', '/tmp/th-test.tmx'); await page.waitForFunction(() => thTM.count() === 2, null, {timeout: 5000}).catch(() => {});
  check('import TMX restaurează 2 intrări', await page.evaluate(() => thTM.count()) === 2);
  fs.writeFileSync('/tmp/th-test.xlf', xlf);
  await page.evaluate(() => {}); 
  await page.setInputFiles('#tm-file', '/tmp/th-test.xlf'); await page.waitForTimeout(400);
  check('import XLIFF nu dublează (tot 2)', await page.evaluate(() => thTM.count()) === 2);
  fs.writeFileSync('/tmp/th-test.bad', '<nu xml');
  await page.setInputFiles('#tm-file', '/tmp/th-test.bad'); await page.waitForTimeout(300);
  check('fișier invalid: mesaj, memoria rămâne', await page.evaluate(() => thTM.count()) === 2);
  await page.fill('#tm-gs', 'server'); await page.fill('#tm-gt', 'serverul'); await page.click('#tm-gadd');
  await page.keyboard.press('Escape');
  // glosar în cerere + abatere
  reqs.length = 0;
  const out = await translate(page, 'The server is down. Restart it. Check the server logs.');
  const sys = reqs[0].sys;
  check('glosarul intră în prompt (doar termenii prezenți)', /Mandatory terminology/.test(sys) && /"server" => "serverul"/.test(sys), sys.slice(-250));
  check('abatere de la glosar semnalată (traducerea fără „serverul”)', /glossary deviation/.test(await page.textContent('#tm-stats')), await page.textContent('#tm-stats'));
  await ctx.close();
}
{ // limba RO a interfeței
  const {ctx, page} = await open({lang: 'ro-RO'});
  await page.evaluate(() => { document.documentElement.lang = 'ro'; });
  await page.waitForTimeout(300);
  check('RO: eticheta casetei', /Memorie de traducere/.test(await page.textContent('#tm-on-t')), await page.textContent('#tm-on-t'));
  await ctx.close();
}
await b.close();
console.log(`TranslateHub memory: ${ok} ok, ${bad} eșuate`); process.exit(bad ? 1 : 0);
