const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {factors, runExperiment} = require('../model.js');
const parameters = () => Object.fromEntries(factors.map(f => [f.id, (f.min+f.max)/2]));

test('Yield preserves V1 effects and stays within 0–100%', () => {
  const original = Math.random;
  try {
    for (const random of [0,0.5,0.999]) {
      Math.random = () => random;
      for (const temp of [20,70,120]) for (const conc of [0.01,2.505,5]) for (const ph of [1,7.5,14]) {
        const p = {...parameters(),temp,conc,ph};
        // Independent transcription of the current V1 modele() expression.
        const X1 = (temp-70)/50, X2 = (conc-2.505)/2.495, X3 = (ph-7.5)/6.5;
        const expected = 2+3.2*X1+5*X2+2*X3-1.4*X3*X3+0.6*X1*X2+(random-0.5);
        assert.ok(Math.abs(runExperiment(p)-(50+3*expected))<1e-12);
        assert.ok(runExperiment(p) >= 0 && runExperiment(p) <= 100);
      }
    }
  } finally {Math.random = original;}
});
test('all V1 bounds accepted; missing, non-finite and out-of-domain inputs rejected', () => {
  for (const f of factors) {
    for (const value of [f.min,f.max]) assert.ok(Number.isFinite(runExperiment({...parameters(),[f.id]:value})));
    for (const value of [undefined,NaN,Infinity,f.min-1,f.max+1,'2']) assert.throws(() => runExperiment({...parameters(),[f.id]:value}), RangeError);
  }
});

// Lightweight DOM harness exercises actual app handlers without adding runtime dependencies.
function harness(saved, experiment = runExperiment, storageFails = false) {
  const nodes = new Map(), storage = new Map(saved ? [['doe-lab-v2-yield-session',saved]] : []);
  class Element {
    constructor(id) {this.id=id; this.value=''; this.textContent=''; this.children=[]; this.handlers={}; this.validity={valid:true};}
    set innerHTML(v) {this.html=v; for (const m of v.matchAll(/id="([^"]+)"/g)) get(m[1]);}
    get innerHTML() {return this.html || '';}
    append(child) {this.children.push(child);}
    replaceChildren() {this.children=[];}
    addEventListener(type, handler) {this.handlers[type]=handler;}
    showModal() {this.open=true;}
    close() {this.open=false;}
    click() {if (this.href) downloads.push(this);}
  }
  function get(id) {if(!nodes.has(id)) nodes.set(id,new Element(id)); return nodes.get(id);}
  const downloads=[], blobs=[];
  const context = {
    window:{DoE:{factors,validateParameters:require('../model.js').validateParameters,runExperiment:experiment}},
    document:{getElementById:get,createElement:tag => new Element(tag)},
    localStorage:{getItem:k => {if(storageFails) throw new Error(); return storage.get(k) ?? null;},setItem:(k,v) => {if(storageFails) throw new Error(); storage.set(k,v);}},
    URL:{createObjectURL:b => {blobs.push(b); return 'blob:test';},revokeObjectURL:() => {}},
    Blob, setTimeout:fn => fn(), Date, console
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
  return {get,storage,downloads,blobs,submit:() => get('experiment-form').handlers.submit({preventDefault(){}})};
}
test('24-trial budget, notebook, charts, CSV and automatic session resume', async () => {
  const app = harness();
  for(let i=0;i<25;i++) await app.submit();
  assert.equal(app.get('table-body').children.length,24);
  assert.equal(app.get('run').disabled,true);
  assert.match(app.get('counter').textContent,/24 \/ 24/);
  assert.match(app.get('history-chart').innerHTML,/<polyline/);
  assert.match(app.get('scatter-chart').innerHTML,/<circle/);
  app.get('export').handlers.click();
  const csv = await app.blobs[0].text();
  assert.equal(csv.split('\r\n').length,25);
  assert.match(csv.split('\r\n')[0], /rendement_pct/);
  assert.match(app.get('result').textContent, /%$/);
  assert.equal(csv.split('\r\n')[0].split(';').length,12);
  const resumed = harness(app.storage.get('doe-lab-v2-yield-session'));
  assert.equal(resumed.get('table-body').children.length,24);
  assert.equal(resumed.get('result').textContent,app.get('result').textContent);
  resumed.get('restart').handlers.click();
  assert.equal(resumed.get('reset-dialog').open,true);
  resumed.get('cancel-reset').handlers.click();
  assert.equal(resumed.get('table-body').children.length,24);
  resumed.get('confirm-reset').handlers.click();
  assert.equal(resumed.get('table-body').children.length,0);
  assert.equal(resumed.get('run').disabled,false);
});
test('slider sync, numeric persistence and scatter factor selection', async () => {
  const app = harness();
  app.get('temp-slider').value='100'; app.get('temp-slider').handlers.input();
  assert.equal(app.get('temp').value,'100');
  app.get('conc').value='3.123'; app.get('conc').handlers.input();
  await app.submit();
  app.get('x-factor').value='conc'; app.get('x-factor').handlers.change();
  assert.match(app.get('scatter-chart').innerHTML,/Concentration initiale vs rendement/);
  const session = JSON.parse(app.storage.get('doe-lab-v2-yield-session'));
  assert.equal(session.experiments[0].parameters.conc,3.123);
  assert.equal(session.xFactor,'conc');
});
test('invalid inputs and failed API do not consume trials; double submit guarded', async () => {
  const bad = harness(); bad.get('temp').value=''; await bad.submit();
  assert.equal(bad.get('table-body').children.length,0);
  const fail = harness(undefined,async () => {throw new Error('API indisponible');});
  await fail.submit(); assert.equal(fail.get('table-body').children.length,0);
  assert.match(fail.get('message').textContent,/API indisponible/);
  let resolve;
  const app = harness(undefined,() => new Promise(r => {resolve=r;}));
  const pending = app.submit(); await app.submit(); resolve(2); await pending;
  assert.equal(app.get('table-body').children.length,1);
});
test('corrupt session and unavailable localStorage remain usable', async () => {
  const corrupt = harness('{broken'); await corrupt.submit();
  assert.equal(corrupt.get('table-body').children.length,1);
  const unavailable = harness(undefined,runExperiment,true); await unavailable.submit();
  assert.equal(unavailable.get('table-body').children.length,1);
  assert.match(unavailable.get('save-status').textContent,/Sauvegarde indisponible/);
});
