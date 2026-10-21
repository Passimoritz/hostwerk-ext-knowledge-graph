const test = require('node:test');
const assert = require('node:assert');
const KG = require('../page/lib.js');

test('Markdown wird sicher angezeigt (kein HTML aus dem Text)', () => {
  const h = KG.markdown('# Titel\n- **fett** und `code`\n<script>alert(1)</script>\n> Zitat');
  assert.ok(h.includes('<h2 class="kg-h">Titel</h2>'));
  assert.ok(h.includes('<b>fett</b>') && h.includes('<code>code</code>'));
  assert.ok(!h.includes('<script>') && h.includes('&lt;script&gt;'));
  assert.ok(h.includes('<blockquote class="kg-quote">Zitat</blockquote>'));
});

test('Wiki-Links und Unterstriche in Namen bleiben lesbar', () => {
  const h = KG.markdown('Siehe [[Plan]] und my_var_name');
  assert.ok(h.includes('<span class="kg-wiki">Plan</span>'));
  assert.ok(h.includes('my_var_name'));
});

test('Layout ist deterministisch und bleibt im Rahmen', () => {
  const nodes = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, c: i % 3, d: i % 7 }));
  const edges = nodes.slice(1).map((n, i) => [nodes[i].id, n.id]);
  const a = KG.layout(nodes, edges, { iterations: 60 });
  const b = KG.layout(nodes, edges, { iterations: 60 });
  assert.deepStrictEqual([...a.entries()], [...b.entries()]);
  for (const p of a.values()) { assert.ok(Math.abs(p.x) <= 1.0001 && Math.abs(p.y) <= 1.0001); assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y)); }
});

test('Verbundene Knoten liegen näher beieinander als unverbundene', () => {
  const nodes = [{ id: 'a', c: 0 }, { id: 'b', c: 0 }, { id: 'c', c: 1 }, { id: 'd', c: 1 }];
  const p = KG.layout(nodes, [['a', 'b'], ['c', 'd']], { iterations: 120 });
  const dist = (x, y) => Math.hypot(p.get(x).x - p.get(y).x, p.get(x).y - p.get(y).y);
  assert.ok(dist('a', 'b') < dist('a', 'c'));
});

test('Layout ohne Knoten und mit Schleifen stürzt nicht ab', () => {
  assert.strictEqual(KG.layout([], []).size, 0);
  const p = KG.layout([{ id: 'x', c: 0 }], [['x', 'x'], ['x', 'fehlt']]);
  assert.strictEqual(p.size, 1);
});

test('Suche: exakter Name vor Anfang vor Teil vor Datei', () => {
  const nodes = [{ id: 1, label: 'runJob', file: 'a.js', d: 1 }, { id: 2, label: 'run', file: 'b.js', d: 1 }, { id: 3, label: 'prerun', file: 'c.js', d: 9 }, { id: 4, label: 'x', file: 'src/run.js', d: 50 }];
  assert.deepStrictEqual(KG.search(nodes, 'run').map((n) => n.id), [2, 1, 3, 4]);
  assert.deepStrictEqual(KG.search(nodes, ''), []);
});

test('Farben: gleiche Gruppe gleiche Farbe, unbekannt grau', () => {
  assert.strictEqual(KG.color(2), KG.color(2 + KG.PALETTE.length));
  assert.strictEqual(KG.color(-1), '#94a3b8');
});

test('Relative Zeit in beiden Sprachen', () => {
  assert.strictEqual(KG.ago(Date.now() - 5 * 60000, 'de'), 'vor 5 Min');
  assert.strictEqual(KG.ago(Date.now() - 3 * 3600000, 'en'), '3 h ago');
});

test('Fokus-Ansicht: Mitte, Ringe nach Schritten, deterministisch', () => {
  const nodes = [{ id: 'm', c: 0 }, { id: 'a', c: 1, label: 'a' }, { id: 'b', c: 0, label: 'b' }, { id: 'x', c: 2, label: 'x' }];
  const dist = { m: 0, a: 1, b: 1, x: 2 };
  const p = KG.radial(nodes, dist);
  assert.deepStrictEqual(p.get('m'), { x: 0, y: 0 });
  const r = (id) => Math.hypot(p.get(id).x, p.get(id).y);
  assert.ok(Math.abs(r('a') - r('b')) < 1e-9 && r('x') > r('a') && r('x') <= 0.951);
  assert.deepStrictEqual([...KG.radial(nodes, dist).entries()], [...p.entries()]);
});

test('Gruppenfarben folgen Akzent und Hell/Dunkel', () => {
  const dark = KG.palette('#7c5cff', 'dark'); const light = KG.palette('#7c5cff', 'light');
  assert.strictEqual(dark.colors.length, 12);
  assert.match(dark.colors[0], /^hsl\(252 /); // Startton = Akzent
  assert.notStrictEqual(dark.colors[0], light.colors[0]); // hell dunkler, dunkel heller
  assert.match(light.colors[0], / 40%\)$/); assert.match(dark.colors[0], / 64%\)$/);
  assert.strictEqual(new Set(dark.colors).size, 12);
  assert.match(KG.palette('rgb(16, 185, 129)', 'dark').colors[0], /^hsl\(160 /);
  assert.strictEqual(KG.color(-1, dark), dark.none);
  assert.strictEqual(KG.color(3), KG.PALETTE[3]); // ohne Palette: Rückfall
});
