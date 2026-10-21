![Knowledge graph](banner.svg)

# Knowledge graph

Turns your projects (code, docs, Obsidian notes) into a searchable knowledge graph, for you and for Claude. Claude asks the graph instead of searching through files, learns along the way, and can be disconnected again at any time without leaving traces.

An official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension. The engine runs inside Hostwerk, entirely on your computer: no AI and no internet are needed to build the graph. This extension is its interface.

## What you get

- **Graph:** classes, functions, methods, files, docs, SQL tables and rationale comments (`WHY:`, `NOTE:`, `ADR-…`).
  - **Connections:** calls, imports, inheritance, links between documents, foreign keys.
  - **Certainty:** every connection is marked `EXTRACTED` (written that way in the source) or `INFERRED` (resolved by name). Ambiguous names are counted, never guessed.
  - **Groups:** subsystems found with the Louvain method. The graph also shows central nodes and the utility nodes used everywhere.
  - **Map:** an interactive map, plus a text list with the same content for keyboard and screen readers.
- **Ask:**
  - a question in plain words returns a compact excerpt with `file:line`;
  - **explain** shows one symbol with all its connections;
  - **path** finds how A reaches B.
  - Ambiguous names return a list of candidates.
- **Report:** central nodes, groups, surprising connections, rationale, topics asked about most, open questions and suggested questions.
- **Learning:**
  - Claude stores lasting insights with `graph_learn`, linked to the matching nodes. You confirm, edit or delete them.
  - Questions without a match show up as *open questions*.
  - Topics asked about often rank higher in future answers.
- **Obsidian:**
  - **Export as a vault:** one note per node, groups as tags, colours in the graph view. Notes you edit stay untouched on the next export.
  - **Memory notes sync back:** edits you make to memory notes in Obsidian are brought back into Hostwerk.
  - **Read your own vaults into the graph:** `[[links]]` connect notes with each other and with the code.
  - **Pick single notes for memory.**
- **Claude:**
  - **Tools:** `graph_query`, `graph_explain`, `graph_path`, `graph_report`, `graph_learn` and `graph_projects`. They come from the Hostwerk MCP server that Claude Desktop or Claude Code already uses. Claude Code automatically uses the project of the folder it is working in.
- **No maintenance:** before every question Hostwerk checks in milliseconds whether files changed, and re-reads only those.

## Claude stays intact

- **Settings are never touched:** the extension never changes Claude's own settings (no `settings.json`, no hooks, no config JSON).
- **One small section in `CLAUDE.md`/`AGENTS.md`:** only if you choose it. It is a single marked section of at most 3 KB. Before saving, Hostwerk checks that the rest of the file stays exactly the same.
- **Optional skill:** a skill folder `.claude/skills/hostwerk-graph` with an owner file.
- **Forget:**
  - It undoes exactly what Hostwerk wrote, using a change log: the file is restored byte for byte, including Windows line endings.
  - Self-created files and folders are removed.
  - A skill you changed stays and is then yours.
  - Leftovers are found even without the change log, and a final check confirms "no traces left".
- **Pause:** Claude gets the short note "paused" and works as usual. Nothing is deleted.
- **Short answers:** answers to Claude are capped so they don't fill its context. Secrets are rejected.

## Where you find it

- In the sidebar under *Develop*, right after *Projects*, with the tabs Graph, Ask, Report, Memory, Obsidian and Claude
- As the tab **Knowledge graph** in Hostwerk's *Projects* area (with its own view switcher)
- Shortcuts **Ctrl+Alt+G** (graph) and **Ctrl+Alt+K** (ask) – changeable under Settings → General → Shortcuts
- Group colours follow Hostwerk's accent colour and light/dark mode
- Loading errors show a message with *Try again*
- The extension “Claude” may add tabs, actions and settings here, every other extension tabs (`allowExtensions`)

## Permissions

| Permission | Why |
|---|---|
| `read:knowledge` | Read projects, graph, report, question history, memory and Claude status |
| `change:knowledge` | Build and query the graph, add folders, edit memory, Obsidian export. These only touch the graph's own data, so there is no prompt each time. |
| `connect:claude` | Write the section/skill into a project and forget them again. Hostwerk asks first. |
| `storage` | Remembers the chosen project and the search options |

## Develop

Logic in `page/lib.js` (no DOM). Tests: `node --test tests/*.test.js`. Check: `node check.js . --strict` (Hostwerk SDK). The engine is in Hostwerk (`server/services/knowledge/`), with its own tests in `scripts/knowledge-test.js`.

License: MIT
