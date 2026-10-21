## 1.5.0

- Group colours follow Hostwerk's accent and light/dark mode instead of a fixed palette. / Gruppenfarben folgen Hostwerks Akzent und Hell/Dunkel statt einer festen Palette.
- Real shortcuts (Ctrl+Alt+G graph, Ctrl+Alt+K ask) through `contributes.shortcuts`. / Echte Tastenkürzel (Strg+Alt+G Graph, Strg+Alt+K Fragen) über `contributes.shortcuts`.
- Tab “Knowledge graph” in Hostwerk's Projects area, with its own view switcher. / Reiter „Wissensgraph“ im Bereich Projekte, mit eigener Ansichtswahl.
- Sidebar under Develop after Projects (`page.nav`); “Claude” may add tabs, actions and settings, everyone else tabs (`allowExtensions`). / Seitenleiste unter Entwickeln nach Projekte (`page.nav`); „Claude“ darf Reiter, Aktionen und Einstellungen ergänzen, alle anderen Reiter (`allowExtensions`).
- Loading errors with “Try again” instead of an endless skeleton; design scale instead of fixed pixels. / Ladefehler mit „Erneut versuchen“ statt ewigem Skelett; Design-Skala statt fester Pixel.
- Release package contains everything except the repository tooling. / Release-Paket enthält alles außer dem Repo-Werkzeug.

## 1.4.1

- Remembers the chosen project and the search options again (permission "storage" was missing – Hostwerk declined it with a warning). / Merkt sich das gewählte Projekt und die Such-Einstellungen wieder (Recht „storage“ fehlte – Hostwerk hat es mit einer Warnung abgelehnt).

## 1.4.0

- New animated icon and a banner for Hostwerk's new extension page, category “ai”. / Neues bewegtes Symbol und ein Banner für die neue Erweiterungsseite, Kategorie „ai“.

## 1.3.0

- Reading mode per project: automatic (precise from 600 code files), precise or fast. Precise uses tree-sitter in Hostwerk: definitions, calls and inheritance from the real syntax tree for JavaScript/TypeScript, Python and Java – fewer "ambiguous" names in large projects. A badge shows when a graph was read precisely. / Genau auslesen mit tree-sitter.

## 1.2.1

- Keyboard shortcuts appear in Hostwerk's shortcut overview (F1 or ?) while the graph is open. / Tastenkürzel in Hostwerks Übersicht.

## 1.2.0

- Focus view: show only the neighbourhood of one class, function or file (1–3 steps, rings by distance) – also for nodes the overview leaves out in large projects. Double-click a node, press F or use the Focus button; Esc returns to the whole graph. Search finds nodes outside the drawn graph and focuses them. / Fokus-Ansicht.
- Ask: narrow down for large projects – only in folders/patterns (server/minecraft, ui/**/*.jsx), without folders, only certain kinds, 1–3 steps of surroundings. Tests and build output count less automatically. / Eingrenzen beim Fragen.

## 1.1.0

- Memory: drag entries into another area (About me, General, This project) or change area and type right on the card (keyboard too). / Gedächtnis: Einträge ziehen.

## 1.0.0

- First release: knowledge graph from code, docs and Obsidian notes; ask/explain/path, report, memory with review of what Claude learned, Obsidian export/sync/import, connect Claude per project and forget without traces. / Erste Fassung.
