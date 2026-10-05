/* UI, session persistence and SVG charts. No external dependencies. */
(() => {
  'use strict';
  const {factors, validateParameters, runExperiment} = window.DoE;
  const BUDGET = 24, KEY = 'doe-lab-v2-yield-session';
  const $ = id => document.getElementById(id);
  const defaults = () => Object.fromEntries(factors.map(f => [f.id, f.initial]));
  const fresh = () => ({version:1, parameters:defaults(), experiments:[], xFactor:'temp'});
  let state = fresh(), busy = false;
  const format = n => n.toLocaleString('fr-FR', {maximumFractionDigits:3});
  const valid = p => {try {validateParameters(p); return true;} catch {return false;}};
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      $('save-status').textContent = '✓ Session sauvegardée automatiquement sur cet appareil';
    } catch {
      $('save-status').textContent = 'Sauvegarde indisponible : exportez le CSV avant de quitter.';
    }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.version !== 1 || !valid(saved.parameters) || !Array.isArray(saved.experiments) || saved.experiments.length > BUDGET || !factors.some(f => f.id === saved.xFactor) || !saved.experiments.every(e => valid(e.parameters) && Number.isFinite(e.y) && e.y >= 0 && e.y <= 100 && typeof e.date === 'string' && Number.isFinite(Date.parse(e.date)))) throw new Error('Invalid session');
      state = saved;
      $('save-status').textContent = `✓ Session reprise : ${state.experiments.length} essai(s) retrouvé(s)`;
    } catch {
      $('save-status').textContent = 'Session illisible ou stockage indisponible. Une session vide est ouverte ; la sauvegarde précédente sera remplacée au prochain changement.';
    }
  }
  function buildControls() {
    for (const f of factors) {
      const div = document.createElement('div');
      div.className = 'factor';
      div.innerHTML = `<div class="factor-top"><label for="${f.id}">${f.label}</label><div class="number-wrap"><input id="${f.id}" name="${f.id}" type="number" min="${f.min}" max="${f.max}" step="any" required aria-label="${f.label}, valeur numérique"><span>${f.unit}</span></div></div><input id="${f.id}-slider" type="range" min="${f.min}" max="${f.max}" step="${f.step}" aria-label="${f.label}, curseur"><div class="bounds"><span>${f.min} ${f.unit}</span><span>${f.max} ${f.unit}</span></div>`;
      $('factors').append(div);
      const number = $(f.id), slider = $(`${f.id}-slider`);
      number.value = slider.value = state.parameters[f.id];
      slider.addEventListener('input', () => {number.value = slider.value; update();});
      number.addEventListener('input', () => {if (number.validity.valid) slider.value = number.value; update();});
      const option = document.createElement('option');
      option.value = f.id; option.textContent = `${f.label}${f.unit ? ` (${f.unit})` : ''}`;
      $('x-factor').append(option);
    }
    $('x-factor').value = state.xFactor;
    $('table-head').innerHTML = `<tr><th scope="col">Essai</th><th scope="col">Date</th>${factors.map(f => `<th scope="col">${f.label}${f.unit ? ` (${f.unit})` : ''}</th>`).join('')}<th scope="col">Rendement (%)</th></tr>`;
  }
  function readParameters() {
    return Object.fromEntries(factors.map(f => [f.id, $(f.id).value === '' ? NaN : Number($(f.id).value)]));
  }
  function update() {
    const p = readParameters();
    if (valid(p)) {state.parameters = p; save();}
  }
  function drawChart(id, scatter) {
    const target = $(id), rows = state.experiments;
    if (!rows.length) {target.innerHTML = '<div class="chart-empty">Les mesures apparaîtront après votre premier essai.</div>'; return;}
    const f = factors.find(f => f.id === state.xFactor);
    const points = rows.map((e,i) => ({x:scatter ? e.parameters[f.id] : i+1, y:e.y, trial:i+1}));
    const minX = scatter ? f.min : 1, maxX = scatter ? f.max : Math.max(2, rows.length);
    const ys = points.map(p => p.y), low = Math.min(...ys), high = Math.max(...ys);
    const pad = Math.max(0.5, (high-low)*0.15), minY = low-pad, maxY = high+pad;
    const x = v => 60 + (v-minX)/(maxX-minX)*440, y = v => 185 - (v-minY)/(maxY-minY)*155;
    const svg = ['<svg viewBox="0 0 530 225" role="img" xmlns="http://www.w3.org/2000/svg">', `<title>${scatter ? `${f.label} vs rendement (%)` : 'Rendement au fil des essais'}</title>`];
    for (let i=0;i<=4;i++) {
      const v = minY+(maxY-minY)*i/4, pos = y(v);
      svg.push(`<line x1="60" x2="500" y1="${pos}" y2="${pos}" stroke="#e4eded"/><text x="50" y="${pos+4}" text-anchor="end" fill="#607781" font-size="10">${format(v)}</text>`);
      const xv = minX+(maxX-minX)*i/4;
      svg.push(`<text x="${x(xv)}" y="203" text-anchor="middle" fill="#607781" font-size="10">${format(xv)}</text>`);
    }
    svg.push('<text x="60" y="15" fill="#607781" font-size="11">Rendement (%)</text>', `<text x="280" y="222" text-anchor="middle" fill="#607781" font-size="11">${scatter ? `${f.label} ${f.unit}` : 'Numéro d’essai'}</text>`);
    if (!scatter) svg.push(`<polyline points="${points.map(p => `${x(p.x)},${y(p.y)}`).join(' ')}" fill="none" stroke="#008878" stroke-width="2"/>`);
    for (const p of points) svg.push(`<circle cx="${x(p.x)}" cy="${y(p.y)}" r="4" fill="#008878" stroke="white" stroke-width="1"><title>Essai ${p.trial} : X = ${format(p.x)} ; rendement = ${format(p.y)} %</title></circle>`);
    svg.push('</svg>'); target.innerHTML = svg.join('');
  }
  function render() {
    const rows = state.experiments, last = rows.at(-1);
    $('counter').textContent = `${rows.length} / ${BUDGET} essais utilisés`;
    $('budget').value = rows.length;
    $('run').disabled = busy || rows.length >= BUDGET;
    $('restart').disabled = busy;
    $('run').textContent = busy ? 'Expérience en cours…' : rows.length >= BUDGET ? 'Budget épuisé — 24 essais réalisés' : "Lancer l'expérience →";
    $('result').textContent = last ? `${format(last.y)} %` : '—';
    $('result-detail').textContent = last ? `Essai ${rows.length} · ${new Date(last.date).toLocaleString('fr-FR')}` : 'Lancez votre premier essai pour obtenir une mesure.';
    $('best').textContent = rows.length ? `Meilleur rendement : ${format(Math.max(...rows.map(e => e.y)))} %` : 'Meilleur rendement : —';
    $('export').disabled = !rows.length;
    $('empty').hidden = !!rows.length;
    $('table-body').replaceChildren();
    for (const [i,e] of rows.entries()) {
      const tr = document.createElement('tr');
      for (const value of [i+1, new Date(e.date).toLocaleString('fr-FR'), ...factors.map(f => format(e.parameters[f.id])), format(e.y)]) {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      }
      $('table-body').append(tr);
    }
    drawChart('history-chart', false); drawChart('scatter-chart', true);
  }
  $('experiment-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || state.experiments.length >= BUDGET) return;
    busy = true; render(); $('message').textContent = '';
    try {
      const parameters = validateParameters(readParameters());
      const y = await runExperiment({...parameters});
      if (!Number.isFinite(y) || y < 0 || y > 100) throw new Error('La mesure reçue est invalide. Aucun essai débité.');
      state.parameters = {...parameters};
      state.experiments.push({parameters:{...parameters}, y, date:new Date().toISOString()});
      save();
      $('message').textContent = state.experiments.length === BUDGET ? 'Budget atteint. Exportez votre carnet ou commencez une nouvelle session.' : 'Mesure ajoutée au carnet.';
    } catch (error) {$('message').textContent = error.message;}
    finally {busy = false; render();}
  });
  $('x-factor').addEventListener('change', () => {state.xFactor = $('x-factor').value; save(); drawChart('scatter-chart', true);});
  $('export').addEventListener('click', () => {
    const columns = ['essai','date_iso',...factors.map(f => `${f.id}${f.unit ? ` (${f.unit})` : ''}`),'rendement_pct'];
    const rows = state.experiments.map((e,i) => [i+1,e.date,...factors.map(f => e.parameters[f.id]),e.y]);
    const csv = '\uFEFF' + [columns,...rows].map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = `doe-session-${new Date().toISOString().slice(0,10)}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('restart').addEventListener('click', () => $('reset-dialog').showModal());
  $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
  $('confirm-reset').addEventListener('click', () => {
    if (busy) return;
    state = fresh();
    for (const f of factors) $(f.id).value = $(`${f.id}-slider`).value = state.parameters[f.id];
    $('x-factor').value = state.xFactor; $('message').textContent = 'Nouvelle session prête.';
    save(); render(); $('reset-dialog').close();
  });
  load(); buildControls(); render();
})();
