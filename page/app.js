// Wissensgraph – Oberfläche. Der Motor steckt in Hostwerk (/knowledge …): Graph bauen, fragen, Gedächtnis, Obsidian,
// Claude einbinden und vergessen. Bauen und Fragen laufen ohne Rückfrage (change:knowledge); alles, was Dateien in
// Projekten oder Claudes Anbindung ändert (connect:claude), bestätigt Hostwerk vorher.
const { html, t, raw } = Hostwerk;
const $ = (id) => document.getElementById(id);
const enc = encodeURIComponent;
let st = null;      // Zustand aus /knowledge
let cur = null;     // gewähltes Projekt/Ordner
let tab = 'graph';
let view = null;    // verkleinerter Graph für die Zeichnung
let pos = null;     // Layout
let sel = null;     // gewählter Knoten
let group = '';     // Gruppenfilter
let listMode = false;
let building = false;
const cam = { x: 0, y: 0, z: 1 };

const src = () => (st && st.sources.find((s) => s.id === cur)) || null;
const lang = () => (Hostwerk.info().lang === 'en' ? 'en' : 'de');
const declined = (e) => /Abgelehnt|Declined/.test(e.message);
const fail = (e) => { if (!declined(e)) Hostwerk.toast(e.message, { kind: 'error' }); };
const md = (s) => html`<div class="kg-md">${raw(KG.markdown(s))}</div>`;

/* ---------------- Kopfzeile: Projekt wählen, bauen ---------------- */
async function loadStatus() {
  st = await Hostwerk.get('/knowledge');
  if (!cur) { try { cur = await Hostwerk.storage.get('project'); } catch { cur = null; } }
  if (!cur || !st.sources.some((s) => s.id === cur)) cur = (st.sources.find((s) => s.built) || st.sources[0] || {}).id || null;
  renderHead();
}
function renderHead() {
  const s = src();
  Hostwerk.render('#head', html`
    <label class="label" for="pick">${t('project')}</label>
    <select class="select" id="pick">${st.sources.map((x) => html`<option value="${x.id}" ${x.id === cur ? raw('selected') : ''}>${x.name}${x.kind === 'folder' ? (x.vault ? ' (Obsidian)' : ` (${t('folder')})`) : ''}</option>`)}</select>
    <button class="btn sm ghost" id="addFolder">${t('addFolder')}</button>
    ${s ? html`<span class="small muted">${s.built ? t('builtAgo', { when: KG.ago(s.builtAt, lang()) }) : t('notBuilt')}</span>
      <div class="right row-tight">${st.paused ? html`<span class="badge warn">${t('paused')}</span>` : ''}<button class="btn sm ${s.built ? 'ghost' : 'primary'}" id="build" ${building ? raw('disabled') : ''}>${building ? t('building') : s.built ? t('update') : t('build')}</button></div>` : ''}`);
  const pick = $('pick');
  if (pick) pick.onchange = () => { cur = pick.value; sel = null; view = null; Hostwerk.storage.set('project', cur).catch(() => {}); renderHead(); show(tab); };
  $('addFolder').onclick = addFolder;
  if ($('build')) $('build').onclick = () => build(false);
}
async function addFolder() {
  try {
    const dir = await Hostwerk.pickFolder(t('addFolder'));
    if (!dir) return;
    const f = await Hostwerk.post('/knowledge/folders', { path: dir });
    cur = f.id; await loadStatus(); show(tab);
  } catch (e) { fail(e); }
}
async function build(full) {
  const s = src(); if (!s || building) return;
  building = true; renderHead();
  const before = s.builtAt;
  try {
    await Hostwerk.post(`/knowledge/${enc(s.id)}/build`, { full: !!full });
    for (let i = 0; i < 600; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const n = await Hostwerk.get('/knowledge');
      const x = n.sources.find((y) => y.id === s.id);
      if (x && x.builtAt && x.builtAt !== before) { st = n; break; }
    }
    view = null; Hostwerk.toast(t('built'), { kind: 'success' });
  } catch (e) { fail(e); }
  building = false; await loadStatus(); show(tab);
}

/* ---------------- Graph ---------------- */
async function renderGraph() {
  const s = src();
  if (!s) { Hostwerk.render('#graph', html`<div class="card"><div class="empty"><h3>${t('noProjects')}</h3><p>${t('noProjectsText')}</p><div class="empty-action"><button class="btn primary" id="e-add">${t('addFolder')}</button></div></div></div>`); $('e-add').onclick = addFolder; return; }
  if (!s.built) { Hostwerk.render('#graph', html`<div class="card"><div class="empty"><h3>${t('emptyTitle')}</h3><p>${t('emptyText')}</p><div class="empty-action"><button class="btn primary" id="e-build">${t('build')}</button></div></div></div>`); $('e-build').onclick = () => build(false); return; }
  if (!view) { view = await Hostwerk.get(`/knowledge/${enc(s.id)}/graph?limit=700${group !== '' ? `&community=${enc(group)}` : ''}`); pos = KG.layout(view.nodes, view.edges); }
  const v = view;
  Hostwerk.render('#graph', html`
    <div class="row" style="margin-bottom:10px;flex-wrap:wrap">
      <input class="input" id="find" placeholder="${t('findPlaceholder')}" aria-label="${t('findPlaceholder')}" style="max-width:260px">
      <select class="select" id="group" style="width:auto;max-width:260px" aria-label="${t('group')}"><option value="">${t('allGroups')}</option>${v.communities.filter((c) => c.size >= 3).map((c) => html`<option value="${c.id}" ${String(c.id) === String(group) ? raw('selected') : ''}>${c.label} (${c.size})</option>`)}</select>
      <div class="seg" role="group" aria-label="${t('viewMode')}"><button class="${listMode ? '' : 'active'}" id="m-map">${t('map')}</button><button class="${listMode ? 'active' : ''}" id="m-list">${t('list')}</button></div>
      <span class="small muted right">${t('stats', { nodes: Hostwerk.fmt.number(v.total.nodes), edges: Hostwerk.fmt.number(v.total.edges), groups: v.communities.length, mod: v.modularity })}</span>
    </div>
    <div class="kg-wrap">
      <div class="card card-pad">${listMode ? html`<div id="nodelist" class="kg-scroll"></div>` : html`<canvas id="cv" class="kg-canvas" tabindex="0" aria-label="${t('canvasLabel')}"></canvas>
        <div class="kg-legend small muted">${v.communities.slice(0, 8).map((c) => html`<span><i class="kg-dot" style="${`background:${KG.color(c.id)}`}"></i>${c.label}</span>`)}</div>`}</div>
      <div class="card card-pad stack" id="side"></div>
    </div>`);
  $('group').onchange = (e) => { group = e.target.value; view = null; sel = null; renderGraph(); };
  $('m-map').onclick = () => { listMode = false; renderGraph(); };
  $('m-list').onclick = () => { listMode = true; renderGraph(); };
  const find = $('find');
  find.onkeydown = (e) => { if (e.key === 'Enter') { const hit = KG.search(v.nodes, find.value, 1)[0]; if (hit) select(hit.id, true); else Hostwerk.toast(t('notFound'), { kind: 'warn' }); } };
  if (listMode) renderList(); else drawSetup();
  renderSide();
}
function renderList() {
  const nodes = view.nodes.slice().sort((a, b) => b.d - a.d).slice(0, 300);
  Hostwerk.render('#nodelist', html`${nodes.map((n) => html`<button class="list-item" style="width:100%;text-align:left" data-node="${n.id}"><i class="kg-dot" style="${`background:${KG.color(n.c)}`}"></i><span class="grow ellipsis">${n.label}</span><span class="tiny muted">${n.kind} · ${n.d}</span></button>`)}`);
  for (const b of document.querySelectorAll('[data-node]')) b.onclick = () => select(b.dataset.node, false);
}
async function renderSide() {
  const side = $('side'); if (!side) return;
  if (!sel) {
    const gods = view.gods.map((id) => view.nodes.find((n) => n.id === id)).filter(Boolean);
    Hostwerk.render(side, html`<h3 style="margin:0">${t('central')}</h3><p class="small muted" style="margin:0">${t('centralHint')}</p>
      ${gods.map((n) => html`<button class="list-item" style="width:100%;text-align:left" data-pick="${n.id}"><i class="kg-dot" style="${`background:${KG.color(n.c)}`}"></i><span class="grow ellipsis">${n.label}</span><span class="tiny muted">${n.d}</span></button>`)}`);
    for (const b of side.querySelectorAll('[data-pick]')) b.onclick = () => select(b.dataset.pick, true);
    return;
  }
  const n = view.nodes.find((x) => x.id === sel) || { id: sel, label: sel };
  Hostwerk.render(side, html`<div class="hw-skeleton" style="height:120px"></div>`);
  try {
    const r = await Hostwerk.post(`/knowledge/${enc(cur)}/explain`, { name: n.id });
    Hostwerk.render(side, html`${md(r.text)}
      <div class="row-tight" style="flex-wrap:wrap"><button class="btn sm" id="s-ask">${t('askAbout')}</button><button class="btn sm ghost" id="s-from">${t('pathFrom')}</button><button class="btn sm ghost" id="s-close">${t('close')}</button></div>`);
    $('s-ask').onclick = () => { pending.question = n.label; Hostwerk.setTab('ask'); };
    $('s-from').onclick = () => { pending.from = n.label; Hostwerk.setTab('ask'); };
    $('s-close').onclick = () => { sel = null; draw(); renderSide(); };
  } catch (e) { Hostwerk.render(side, html`<p class="c-err small">${e.message}</p>`); }
}
function select(id, center) {
  sel = id;
  if (center && pos && pos.get(id)) { const p = pos.get(id); cam.x = -p.x; cam.y = -p.y; cam.z = Math.max(cam.z, 1.8); }
  draw(); renderSide();
}

// Zeichnen
let cv = null; let ctx = null; let hover = null;
function drawSetup() {
  cv = $('cv'); if (!cv) return;
  ctx = cv.getContext('2d');
  const resize = () => { const r = cv.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); };
  new ResizeObserver(resize).observe(cv);
  let drag = null;
  cv.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = (e) => {
    const r = cv.getBoundingClientRect();
    if (drag) { const s = scale(r); const dx = (e.clientX - drag.x) / s; const dy = (e.clientY - drag.y) / s; if (Math.abs(dx) + Math.abs(dy) > 0.004) drag.moved = true; cam.x = drag.cx + dx; cam.y = drag.cy + dy; draw(); return; }
    const h = hit(e.clientX - r.left, e.clientY - r.top); if (h !== hover) { hover = h; cv.title = h ? (view.nodes.find((n) => n.id === h) || {}).label || '' : ''; draw(); }
  };
  cv.onpointerup = (e) => { const r = cv.getBoundingClientRect(); if (drag && !drag.moved) { const h = hit(e.clientX - r.left, e.clientY - r.top); if (h) select(h, false); } drag = null; };
  cv.onwheel = (e) => { e.preventDefault(); cam.z = Math.min(12, Math.max(0.4, cam.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); draw(); };
  cv.onkeydown = (e) => {
    const step = 0.15 / cam.z;
    if (e.key === '+' || e.key === '=') cam.z = Math.min(12, cam.z * 1.2); else if (e.key === '-') cam.z = Math.max(0.4, cam.z / 1.2);
    else if (e.key === 'ArrowLeft') cam.x += step; else if (e.key === 'ArrowRight') cam.x -= step; else if (e.key === 'ArrowUp') cam.y += step; else if (e.key === 'ArrowDown') cam.y -= step;
    else if (e.key === '0') { cam.x = 0; cam.y = 0; cam.z = 1; } else return;
    e.preventDefault(); draw();
  };
  resize();
}
const scale = (r) => Math.min(r.width, r.height) * 0.46 * cam.z;
function toScreen(p, r) { const s = scale(r); return [r.width / 2 + (p.x + cam.x) * s, r.height / 2 + (p.y + cam.y) * s]; }
const radius = (n) => 2.5 + Math.sqrt(n.d || 0) * 1.1;
function hit(mx, my) {
  if (!cv) return null;
  const r = cv.getBoundingClientRect(); let best = null; let bd = 1e9;
  for (const n of view.nodes) { const p = pos.get(n.id); if (!p) continue; const [x, y] = toScreen(p, r); const d = (x - mx) ** 2 + (y - my) ** 2; const rr = Math.max(6, radius(n) + 3); if (d < rr * rr && d < bd) { bd = d; best = n.id; } }
  return best;
}
function draw() {
  if (!cv || !ctx || !view) return;
  const r = cv.getBoundingClientRect();
  const css = getComputedStyle(document.documentElement);
  const text = css.getPropertyValue('--text').trim() || '#111';
  const line = css.getPropertyValue('--line-2').trim() || '#999';
  ctx.clearRect(0, 0, r.width, r.height);
  const near = new Set(); if (sel) for (const e of view.edges) { if (e[0] === sel) near.add(e[1]); if (e[1] === sel) near.add(e[0]); }
  ctx.lineWidth = 1;
  for (const e of view.edges) {
    const a = pos.get(e[0]); const b = pos.get(e[1]); if (!a || !b) continue;
    const on = sel && (e[0] === sel || e[1] === sel);
    ctx.globalAlpha = sel ? (on ? 0.9 : 0.08) : 0.22;
    ctx.strokeStyle = on ? KG.color((view.nodes.find((n) => n.id === sel) || {}).c) : line;
    if (e[3]) ctx.setLineDash([3, 3]); else ctx.setLineDash([]);
    const [x1, y1] = toScreen(a, r); const [x2, y2] = toScreen(b, r);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.setLineDash([]);
  const top = new Set(view.nodes.slice().sort((a, b) => b.d - a.d).slice(0, Math.round(18 * Math.min(cam.z, 3))).map((n) => n.id));
  for (const n of view.nodes) {
    const p = pos.get(n.id); if (!p) continue;
    const [x, y] = toScreen(p, r);
    if (x < -20 || y < -20 || x > r.width + 20 || y > r.height + 20) continue;
    const dim = sel && n.id !== sel && !near.has(n.id);
    ctx.globalAlpha = dim ? 0.18 : 1;
    ctx.fillStyle = KG.color(n.c);
    const rad = radius(n) * (n.id === sel ? 1.6 : 1);
    ctx.beginPath();
    if (n.kind === 'class' || n.kind === 'table' || n.kind === 'type') ctx.rect(x - rad, y - rad, rad * 2, rad * 2);
    else if (n.kind === 'doc' || n.kind === 'note') { ctx.moveTo(x, y - rad * 1.2); ctx.lineTo(x + rad * 1.2, y); ctx.lineTo(x, y + rad * 1.2); ctx.lineTo(x - rad * 1.2, y); ctx.closePath(); }
    else ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    if (n.id === sel || n.id === hover) { ctx.strokeStyle = text; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
    if ((top.has(n.id) && !dim) || n.id === sel || n.id === hover || (sel && near.has(n.id) && cam.z > 1.4)) {
      ctx.globalAlpha = dim ? 0.3 : 1; ctx.fillStyle = text; ctx.font = `${n.id === sel ? 600 : 400} 12px system-ui, sans-serif`;
      ctx.fillText(n.label.length > 34 ? `${n.label.slice(0, 32)}…` : n.label, x + rad + 4, y + 4);
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------------- Fragen ---------------- */
const pending = { question: '', from: '' };
async function renderAsk() {
  const s = src(); if (!s) return Hostwerk.render('#ask', html`<p class="muted">${t('noProjects')}</p>`);
  Hostwerk.render('#ask', html`
    <div class="grid grid-2">
      <div class="stack">
        <div class="card card-pad stack">
          <label class="label" for="q">${t('question')}</label>
          <textarea class="input" id="q" rows="2" placeholder="${t('questionPlaceholder')}">${pending.question}</textarea>
          <div class="row"><span class="tiny muted grow">${t('askHint')}</span><button class="btn primary" id="go">${t('ask')}</button></div>
        </div>
        <div class="card card-pad stack">
          <div class="label">${t('pathTitle')}</div>
          <div class="row"><input class="input" id="pf" placeholder="${t('from')}" value="${pending.from}"><input class="input" id="pt" placeholder="${t('to')}"><button class="btn" id="pgo">${t('findPath')}</button></div>
          <div class="row"><input class="input" id="en" placeholder="${t('explainPlaceholder')}"><button class="btn" id="ego">${t('explain')}</button></div>
        </div>
        <div class="card card-pad" id="answer"><p class="muted small">${t('answerHere')}</p></div>
      </div>
      <div class="card card-pad stack" id="history"></div>
    </div>`);
  pending.question = ''; pending.from = '';
  const answer = async (p) => { Hostwerk.render('#answer', html`<div class="hw-skeleton" style="height:140px"></div>`); try { const r = await p; Hostwerk.render('#answer', md(r.text)); loadHistory(); } catch (e) { Hostwerk.render('#answer', html`<p class="c-err">${e.message}</p>`); } };
  $('go').onclick = () => { const q = $('q').value.trim(); if (q) answer(Hostwerk.post(`/knowledge/${enc(s.id)}/query`, { question: q })); };
  $('q').onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('go').click(); };
  $('pgo').onclick = () => { const a = $('pf').value.trim(); const b = $('pt').value.trim(); if (a && b) answer(Hostwerk.post(`/knowledge/${enc(s.id)}/path`, { from: a, to: b })); };
  $('ego').onclick = () => { const n = $('en').value.trim(); if (n) answer(Hostwerk.post(`/knowledge/${enc(s.id)}/explain`, { name: n })); };
  loadHistory();
}
async function loadHistory() {
  const s = src(); if (!s || !$('history')) return;
  try {
    const h = await Hostwerk.get(`/knowledge/${enc(s.id)}/questions`);
    Hostwerk.render('#history', html`
      ${h.unanswered.length ? html`<h3 style="margin:0">${t('openQuestions')}</h3><p class="small muted" style="margin:0">${t('openQuestionsHint')}</p>
        ${h.unanswered.map((q) => html`<div class="list-item"><span class="grow">${q}</span><button class="btn xs ghost" data-remember="${q}">${t('remember')}</button></div>`)}` : ''}
      <h3 style="margin:0">${t('history')}</h3>
      ${h.questions.length ? html`<div class="kg-scroll">${h.questions.slice(0, 40).map((q) => html`<button class="list-item" style="width:100%;text-align:left" data-again="${q.q}"><span class="grow ellipsis">${q.q}</span><span class="badge ${q.status === 'ok' ? 'ok' : 'warn'}">${q.client || ''}</span><span class="tiny muted">${KG.ago(q.at, lang())}</span></button>`)}</div>` : html`<p class="muted small">${t('noHistory')}</p>`}`);
    for (const b of document.querySelectorAll('[data-again]')) b.onclick = () => { $('q').value = b.dataset.again; $('go').click(); };
    for (const b of document.querySelectorAll('[data-remember]')) b.onclick = () => { pending.memo = b.dataset.remember; Hostwerk.setTab('memory'); };
  } catch { /* egal */ }
}

/* ---------------- Bericht ---------------- */
async function renderReport() {
  const s = src(); if (!s || !s.built) return Hostwerk.render('#report', html`<div class="card"><div class="empty"><p>${t('emptyText')}</p></div></div>`);
  try {
    const r = await Hostwerk.get(`/knowledge/${enc(s.id)}/report`);
    Hostwerk.render('#report', html`<div class="card card-pad"><div class="row" style="margin-bottom:6px"><span class="grow small muted">${t('reportHint')}</span><button class="btn sm ghost" id="copy">${t('copy')}</button></div>${md(r.md)}</div>`);
    $('copy').onclick = () => Hostwerk.copy(r.md).then(() => Hostwerk.toast(t('copied'), { kind: 'success' }));
  } catch (e) { fail(e); }
}

/* ---------------- Gedächtnis ---------------- */
async function renderMemory() {
  const s = src(); if (!s) return Hostwerk.render('#memory', html`<p class="muted">${t('noProjects')}</p>`);
  let list = [];
  try { list = await Hostwerk.get(`/knowledge/${enc(s.id)}/memory`); } catch (e) { fail(e); }
  const review = list.filter((m) => !m.confirmed);
  const SRC = { user: t('src.user'), claude: 'Claude', hostwerk: 'Hostwerk' };
  const item = (m) => html`<div class="list-item" style="align-items:flex-start">
      <div class="grow" style="min-width:0"><b>${m.text}</b>${m.detail ? html`<div class="small muted">${m.detail}</div>` : ''}${m.links.length ? html`<div class="tiny muted">${t('about')}: ${m.links.join(', ')}</div>` : ''}</div>
      <span class="badge ${m.source === 'claude' ? 'accent' : ''}">${SRC[m.source] || m.source}</span>
      ${!m.confirmed ? html`<button class="btn xs primary" data-ok="${m.id}">${t('confirm')}</button>` : ''}
      <button class="btn xs ghost" data-edit="${m.id}">${t('edit')}</button><button class="btn xs ghost danger" data-del="${m.id}">${t('delete')}</button>
    </div>`;
  Hostwerk.render('#memory', html`
    <div class="grid grid-2">
      <div class="stack">
        ${review.length ? html`<div class="card card-pad stack"><h3 style="margin:0">${t('review')}</h3><p class="small muted" style="margin:0">${t('reviewHint')}</p>${review.map(item)}</div>` : ''}
        <div class="card card-pad stack"><h3 style="margin:0">${t('memoryAll')}</h3>${list.length ? list.filter((m) => m.confirmed).map(item) : html`<p class="muted small">${t('memoryEmpty')}</p>`}</div>
      </div>
      <div class="card card-pad stack" id="memform"></div>
    </div>`);
  memForm(null);
  for (const b of document.querySelectorAll('[data-ok]')) b.onclick = async () => { try { await Hostwerk.put(`/knowledge/${enc(s.id)}/memory/${enc(b.dataset.ok)}`, { confirmed: true }); renderMemory(); } catch (e) { fail(e); } };
  for (const b of document.querySelectorAll('[data-del]')) b.onclick = async () => { try { await Hostwerk.del(`/knowledge/${enc(s.id)}/memory/${enc(b.dataset.del)}`); renderMemory(); } catch (e) { fail(e); } };
  for (const b of document.querySelectorAll('[data-edit]')) b.onclick = () => memForm(list.find((m) => m.id === b.dataset.edit));
}
function memForm(m) {
  const s = src();
  Hostwerk.render('#memform', html`<h3 style="margin:0">${m ? t('editEntry') : t('newEntry')}</h3>
    <label class="label" for="mt">${t('entryText')}</label><input class="input" id="mt" value="${m ? m.text : pending.memo || ''}">
    <label class="label" for="md">${t('entryDetail')}</label><textarea class="input" id="md" rows="3">${m ? m.detail || '' : ''}</textarea>
    <label class="label" for="ml">${t('entryLinks')}</label><input class="input" id="ml" value="${m ? m.links.join(', ') : ''}" placeholder="LiveUpdate.deploy, server/minecraft/manager.js">
    <p class="tiny muted" style="margin:0">${t('noSecrets')}</p>
    <div class="row"><span class="grow"></span>${m ? html`<button class="btn ghost" id="mcancel">${t('cancel')}</button>` : ''}<button class="btn primary" id="msave">${t('save')}</button></div>`);
  pending.memo = '';
  if ($('mcancel')) $('mcancel').onclick = () => memForm(null);
  $('msave').onclick = async () => {
    const body = { text: $('mt').value.trim(), detail: $('md').value.trim(), links: $('ml').value.split(',').map((x) => x.trim()).filter(Boolean) };
    if (!body.text) return;
    try { if (m) await Hostwerk.put(`/knowledge/${enc(s.id)}/memory/${enc(m.id)}`, body); else await Hostwerk.post(`/knowledge/${enc(s.id)}/memory`, body); Hostwerk.toast(t('saved'), { kind: 'success' }); renderMemory(); } catch (e) { fail(e); }
  };
}

/* ---------------- Obsidian ---------------- */
async function renderObsidian() {
  const s = src(); if (!s) return Hostwerk.render('#obsidian', html`<p class="muted">${t('noProjects')}</p>`);
  const o = s.options || {};
  Hostwerk.render('#obsidian', html`
    <div class="grid grid-2">
      <div class="stack">
        <div class="card card-pad stack">
          <h3 style="margin:0">${t('obsExport')}</h3><p class="small muted" style="margin:0">${t('obsExportHint')}</p>
          <div class="row"><input class="input mono" id="od" value="${o.exportDir || ''}" placeholder="${t('obsFolder')}" aria-label="${t('obsFolder')}"><button class="btn" id="odp">${t('choose')}</button></div>
          <div class="row"><span class="grow"></span><button class="btn primary" id="oexp" ${s.built ? '' : raw('disabled')}>${t('obsExportBtn')}</button></div>
          <div id="ores"></div>
        </div>
        <div class="card card-pad stack">
          <h3 style="margin:0">${t('obsSync')}</h3><p class="small muted" style="margin:0">${t('obsSyncHint')}</p>
          <div class="row"><span class="grow"></span><button class="btn" id="osync" ${o.exportDir ? '' : raw('disabled')}>${t('obsSyncBtn')}</button></div>
        </div>
      </div>
      <div class="stack">
        <div class="card card-pad stack">
          <h3 style="margin:0">${t('obsVaults')}</h3><p class="small muted" style="margin:0">${t('obsVaultsHint')}</p>
          ${(o.vaults || []).map((v, i) => html`<div class="list-item"><span class="grow ellipsis mono small">${v.path}</span><button class="btn xs ghost" data-vrm="${i}">${t('remove')}</button></div>`)}
          <div class="row"><span class="grow"></span><button class="btn" id="vadd">${t('obsAddVault')}</button></div>
        </div>
        <div class="card card-pad stack">
          <h3 style="margin:0">${t('obsImport')}</h3><p class="small muted" style="margin:0">${t('obsImportHint')}</p>
          <div class="row"><span class="grow"></span><button class="btn" id="iload">${t('obsPickVault')}</button></div>
          <div id="inotes"></div>
        </div>
      </div>
    </div>`);
  $('odp').onclick = async () => { const d = await Hostwerk.pickFolder(t('obsFolder')).catch(() => null); if (d) $('od').value = d; };
  $('oexp').onclick = async () => {
    const dir = $('od').value.trim(); if (!dir) return Hostwerk.toast(t('obsFolder'), { kind: 'warn' });
    Hostwerk.render('#ores', html`<div class="hw-skeleton" style="height:60px"></div>`);
    try {
      const r = await Hostwerk.post(`/knowledge/${enc(s.id)}/obsidian/export`, { dir });
      Hostwerk.render('#ores', html`<div class="callout ok"><div class="callout-body">${t('obsDone', { written: r.written, removed: r.removed })}${r.kept.length ? html`<div class="small">${t('obsKept', { n: r.kept.length })}</div>` : ''}<div class="mono tiny">${r.dir}</div></div></div><button class="btn sm" id="oopen">${t('obsOpen')}</button>`);
      $('oopen').onclick = () => Hostwerk.openUrl(r.open).catch(fail);
      await loadStatus();
    } catch (e) { Hostwerk.render('#ores', ''); fail(e); }
  };
  $('osync').onclick = async () => { try { const r = await Hostwerk.post(`/knowledge/${enc(s.id)}/obsidian/sync`, {}); Hostwerk.toast(t('obsSynced', { n: r.updated }), { kind: 'success' }); } catch (e) { fail(e); } };
  const saveVaults = async (vaults) => { try { await Hostwerk.put(`/knowledge/${enc(s.id)}/options`, { vaults }); await loadStatus(); renderObsidian(); Hostwerk.toast(t('obsVaultsSaved'), { kind: 'success' }); } catch (e) { fail(e); } };
  $('vadd').onclick = async () => { const d = await Hostwerk.pickFolder(t('obsAddVault')).catch(() => null); if (d) saveVaults([...(o.vaults || []), { path: d }]); };
  for (const b of document.querySelectorAll('[data-vrm]')) b.onclick = () => saveVaults((o.vaults || []).filter((_, i) => i !== Number(b.dataset.vrm)));
  $('iload').onclick = async () => {
    const d = await Hostwerk.pickFolder(t('obsPickVault')).catch(() => null); if (!d) return;
    try {
      const r = await Hostwerk.post(`/knowledge/${enc(s.id)}/obsidian/notes`, { dir: d });
      Hostwerk.render('#inotes', html`<div class="kg-scroll">${r.notes.slice(0, 300).map((n) => html`<label class="kg-check"><input type="checkbox" value="${n.file}"><span><b>${n.title}</b><span class="tiny muted"> ${n.file}</span><div class="small muted">${n.summary}</div></span></label>`)}</div>
        <div class="row"><span class="grow small muted">${t('obsNotesFound', { n: r.notes.length })}</span><button class="btn primary" id="ido">${t('obsImportBtn')}</button></div>`);
      $('ido').onclick = async () => { const files = [...document.querySelectorAll('#inotes input:checked')].map((x) => x.value); if (!files.length) return; try { const x = await Hostwerk.post(`/knowledge/${enc(s.id)}/obsidian/import`, { dir: d, files }); Hostwerk.toast(t('obsImported', { n: x.added }), { kind: 'success' }); } catch (e) { fail(e); } };
    } catch (e) { fail(e); }
  };
}

/* ---------------- Claude ---------------- */
async function renderClaude() {
  const s = src(); if (!s) return Hostwerk.render('#claude', html`<p class="muted">${t('noProjects')}</p>`);
  let c = { connected: false, items: [], issues: [] };
  try { c = await Hostwerk.get(`/knowledge/${enc(s.id)}/claude`); } catch (e) { fail(e); }
  const has = (name) => c.items.some((x) => x.path.endsWith(name));
  Hostwerk.render('#claude', html`
    ${!st.mcp.connected ? html`<div class="callout warn" style="margin-bottom:14px"><div class="callout-body"><b class="callout-title">${t('mcpOff')}</b>${t('mcpOffText')}</div><button class="btn sm" id="tomcp">${t('mcpConnect')}</button></div>` : ''}
    <div class="grid grid-2">
      <div class="stack">
        <div class="card card-pad stack">
          <div class="card-head" style="padding:0;border:0"><h3>${t('connectTitle')}</h3>${c.connected ? html`<span class="badge ${c.ok ? 'ok' : 'warn'}">${c.ok ? t('connected') : t('needsRepair')}</span>` : html`<span class="badge">${t('notConnected')}</span>`}</div>
          <p class="small muted" style="margin:0">${t('connectHint')}</p>
          <label class="kg-check"><input type="checkbox" id="cmd" ${!c.connected || has('CLAUDE.md') ? raw('checked') : ''}><span><b>CLAUDE.md</b><div class="small muted">${t('optClaudeMd')}</div></span></label>
          <label class="kg-check"><input type="checkbox" id="cag" ${has('AGENTS.md') ? raw('checked') : ''}><span><b>AGENTS.md</b><div class="small muted">${t('optAgents')}</div></span></label>
          <label class="kg-check"><input type="checkbox" id="csk" ${!c.connected || has('SKILL.md') ? raw('checked') : ''}><span><b>Skill</b><div class="small muted">${t('optSkill')}</div></span></label>
          ${c.issues.length ? html`<div class="callout warn"><div class="callout-body">${c.issues.map((i) => html`<div class="small">${i.issue} – <span class="mono tiny">${i.path}</span></div>`)}</div></div>` : ''}
          <div class="row"><span class="grow"></span>${c.issues.length ? html`<button class="btn" id="crep">${t('repair')}</button>` : ''}<button class="btn primary" id="ccon">${c.connected ? t('reconnect') : t('connect')}</button></div>
          ${c.items.length ? html`<div class="small muted">${t('writtenFiles')}</div>${c.items.map((x) => html`<div class="kg-path">${x.path}</div>`)}` : ''}
        </div>
        <div class="card card-pad stack">
          <div class="setting-row"><div class="txt"><b>${t('pause')}</b><span>${t('pauseHint')}</span></div><label class="switch"><input type="checkbox" id="pz" ${st.paused ? raw('checked') : ''}><span class="track"></span><span class="thumb"></span></label></div>
        </div>
      </div>
      <div class="stack">
        <div class="card card-pad stack">
          <h3 style="margin:0">${t('forgetTitle')}</h3>
          <p class="small muted" style="margin:0">${t('forgetHint')}</p>
          <label class="kg-check"><input type="checkbox" id="fdata" checked><span>${t('forgetData')}</span></label>
          <label class="kg-check"><input type="checkbox" id="fmem"><span>${t('forgetMemory')}</span></label>
          <label class="kg-check"><input type="checkbox" id="fobs"><span>${t('forgetObsidian')}</span></label>
          <div class="row"><button class="btn ghost danger" id="fall">${t('forgetAll')}</button><span class="grow"></span><button class="btn danger" id="fone">${t('forgetProject')}</button></div>
          <div id="fres"></div>
        </div>
        <div class="card card-pad stack">
          <h3 style="margin:0">${t('safetyTitle')}</h3>
          <ul class="small" style="margin:0;padding-left:18px">${['safety1', 'safety2', 'safety3', 'safety4', 'safety5'].map((k) => html`<li>${t(k)}</li>`)}</ul>
        </div>
      </div>
    </div>`);
  if ($('tomcp')) $('tomcp').onclick = () => Hostwerk.navigate('/claude');
  $('ccon').onclick = async () => { try { await Hostwerk.post(`/knowledge/${enc(s.id)}/claude/connect`, { claudeMd: $('cmd').checked, agentsMd: $('cag').checked, skill: $('csk').checked }); Hostwerk.toast(t('connectedToast'), { kind: 'success' }); await loadStatus(); renderClaude(); } catch (e) { fail(e); } };
  if ($('crep')) $('crep').onclick = async () => { try { await Hostwerk.post(`/knowledge/${enc(s.id)}/claude/repair`, {}); renderClaude(); } catch (e) { fail(e); } };
  $('pz').onchange = async (e) => { try { await Hostwerk.put('/knowledge', { paused: e.target.checked }); await loadStatus(); } catch (er) { fail(er); e.target.checked = !e.target.checked; } };
  const opts = () => ({ data: $('fdata').checked, memory: $('fmem').checked, obsidian: $('fobs').checked });
  const done = (r) => {
    Hostwerk.render('#fres', html`<div class="callout ${r.verify.clean ? 'ok' : 'warn'}"><div class="callout-body"><b class="callout-title">${r.verify.clean ? t('forgotClean') : t('forgotLeft')}</b>
      <div class="small">${t('forgotSummary', { removed: r.removed.length, kept: r.kept.length, memory: r.memory })}</div>
      ${r.kept.map((k) => html`<div class="tiny mono">${k.path} – ${k.why}</div>`)}${r.verify.left.map((p) => html`<div class="tiny mono">${p}</div>`)}</div></div>`);
  };
  $('fone').onclick = async () => { try { const r = await Hostwerk.post(`/knowledge/${enc(s.id)}/claude/forget`, opts()); done(r); view = null; await loadStatus(); } catch (e) { fail(e); } };
  $('fall').onclick = async () => { try { const r = await Hostwerk.post('/knowledge/forget-all', opts()); done(r); view = null; await loadStatus(); } catch (e) { fail(e); } };
}

/* ---------------- Reiter ---------------- */
function show(next) {
  tab = next || 'graph';
  for (const el of document.querySelectorAll('[data-tab]')) el.hidden = el.dataset.tab !== tab;
  if (!st) return;
  const fn = { graph: renderGraph, ask: renderAsk, report: renderReport, memory: renderMemory, obsidian: renderObsidian, claude: renderClaude }[tab];
  if (fn) Promise.resolve(fn()).catch(fail);
}
Hostwerk.ready().then(async (info) => {
  tab = info.tab || 'graph';
  Hostwerk.on('tab', show);
  Hostwerk.on('theme', () => draw());
  Hostwerk.on('lang', () => { loadStatus().then(() => show(tab)).catch(fail); });
  try { await loadStatus(); } catch (e) { fail(e); }
  show(tab);
});
