// Wissensgraph – reine Logik ohne Seite (auch in Node testbar): Markdown sicher anzeigen, Graph auslegen, Farben, Suche.
(function (root) {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);

  /** Kleines, sicheres Markdown (Überschriften, Listen, fett, kursiv, Code, Zitate) – alles andere wird als Text gezeigt. */
  function markdown(md) {
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])_([^_]+)_(?=[\s).,]|$)/g, '$1<i>$2</i>')
      .replace(/\[\[([^\]]+)\]\]/g, '<span class="kg-wiki">$1</span>');
    const out = []; let list = false;
    for (const raw of String(md || '').split(/\r?\n/)) {
      const line = raw.replace(/\s+$/, '');
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      const li = line.match(/^\s*[-*]\s+(.*)$/);
      if (!li && list) { out.push('</ul>'); list = false; }
      if (h) out.push(`<h${Math.min(4, h[1].length + 1)} class="kg-h">${inline(h[2])}</h${Math.min(4, h[1].length + 1)}>`);
      else if (li) { if (!list) { out.push('<ul class="kg-list">'); list = true; } out.push(`<li>${inline(li[1])}</li>`); }
      else if (/^>\s?/.test(line)) out.push(`<blockquote class="kg-quote">${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
    if (list) out.push('</ul>');
    return out.join('');
  }

  /** Farbe je Gruppe – gut unterscheidbar, in hellem und dunklem Design lesbar. */
  const PALETTE = ['#7c3aed', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#db2777', '#0d9488', '#9333ea', '#65a30d', '#ea580c', '#2563eb', '#be123c'];
  const color = (c) => (c == null || c < 0 ? '#94a3b8' : PALETTE[c % PALETTE.length]);
  const KIND_SHAPE = { class: 'square', type: 'square', file: 'circle', doc: 'diamond', note: 'diamond', table: 'square', function: 'circle', method: 'circle', package: 'ring' };

  /** Zufall mit festem Startwert – gleiche Daten ergeben immer dasselbe Bild. */
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  /**
   * Kräfte-Layout (Fruchterman-Reingold, mit Gitter für die Abstoßung): nodes [{ id, c, d }], edges [[from, to]].
   * Startpositionen je Gruppe auf einem Kreis → Gruppen bleiben beieinander. Liefert Map id → { x, y } im Bereich ±1.
   */
  function layout(nodes, edges, { iterations = 160, seed = 7 } = {}) {
    const n = nodes.length;
    const pos = new Map();
    if (!n) return pos;
    const groups = [...new Set(nodes.map((x) => x.c))].sort((a, b) => a - b);
    const gi = new Map(groups.map((g, i) => [g, i]));
    const P = nodes.map((x) => {
      const a = (gi.get(x.c) / Math.max(1, groups.length)) * Math.PI * 2;
      const r = groups.length > 1 ? 0.55 : 0;
      const j = rng(hash(x.id));
      return { id: x.id, x: Math.cos(a) * r + (j() - 0.5) * 0.4, y: Math.sin(a) * r + (j() - 0.5) * 0.4, dx: 0, dy: 0, d: x.d || 0 };
    });
    const idx = new Map(P.map((p, i) => [p.id, i]));
    const E = edges.map((e) => [idx.get(e[0]), idx.get(e[1])]).filter((e) => e[0] !== undefined && e[1] !== undefined && e[0] !== e[1]);
    const k = Math.sqrt(4 / n) * 0.9;
    let temp = 0.12;
    const cell = k * 2.5;
    for (let it = 0; it < iterations; it++) {
      for (const p of P) { p.dx = 0; p.dy = 0; }
      // Abstoßung nur zu Nachbarn im Gitter (schnell auch bei vielen Knoten)
      const grid = new Map();
      P.forEach((p, i) => { const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i); });
      for (let i = 0; i < n; i++) {
        const p = P[i]; const gx = Math.floor(p.x / cell); const gy = Math.floor(p.y / cell);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          for (const j of grid.get(`${gx + ox},${gy + oy}`) || []) {
            if (j <= i) continue;
            const q = P[j]; let dx = p.x - q.x; let dy = p.y - q.y; let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1e-4) { dx = 1e-3 * (i - j); dy = 1e-3; dist = 1e-3; }
            const f = (k * k) / dist;
            p.dx += (dx / dist) * f; p.dy += (dy / dist) * f; q.dx -= (dx / dist) * f; q.dy -= (dy / dist) * f;
          }
        }
      }
      for (const [a, b] of E) {
        const p = P[a]; const q = P[b]; const dx = p.x - q.x; const dy = p.y - q.y; const dist = Math.sqrt(dx * dx + dy * dy) || 1e-3;
        const f = (dist * dist) / k;
        p.dx -= (dx / dist) * f; p.dy -= (dy / dist) * f; q.dx += (dx / dist) * f; q.dy += (dy / dist) * f;
      }
      for (const p of P) {
        p.dx -= p.x * 0.05; p.dy -= p.y * 0.05; // leichter Zug zur Mitte
        const len = Math.sqrt(p.dx * p.dx + p.dy * p.dy) || 1;
        p.x += (p.dx / len) * Math.min(len, temp); p.y += (p.dy / len) * Math.min(len, temp);
      }
      temp *= 0.97;
    }
    // auf ±1 normieren
    let mx = 0; for (const p of P) mx = Math.max(mx, Math.abs(p.x), Math.abs(p.y));
    for (const p of P) pos.set(p.id, { x: p.x / (mx || 1), y: p.y / (mx || 1) });
    return pos;
  }

  /** Knoten suchen (Teil von Name oder Datei, Groß/klein egal), beste zuerst. */
  function search(nodes, q, limit = 12) {
    const s = String(q || '').trim().toLowerCase();
    if (!s) return [];
    return nodes.map((n) => { const l = String(n.label).toLowerCase(); const f = String(n.file || '').toLowerCase(); const score = l === s ? 4 : l.startsWith(s) ? 3 : l.includes(s) ? 2 : f.includes(s) ? 1 : 0; return [n, score]; })
      .filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1] || (b[0].d || 0) - (a[0].d || 0)).slice(0, limit).map(([n]) => n);
  }

  /** Relative Zeit („vor 5 Min“). */
  function ago(ts, lang) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000)); const de = lang !== 'en';
    if (s < 60) return de ? 'gerade eben' : 'just now';
    const m = Math.round(s / 60); if (m < 60) return de ? `vor ${m} Min` : `${m} min ago`;
    const h = Math.round(m / 60); if (h < 48) return de ? `vor ${h} Std` : `${h} h ago`;
    const d = Math.round(h / 24); return de ? `vor ${d} Tagen` : `${d} days ago`;
  }

  const api = { markdown, color, layout, search, ago, esc, KIND_SHAPE, PALETTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KG = api;
})(typeof window !== 'undefined' ? window : globalThis);
