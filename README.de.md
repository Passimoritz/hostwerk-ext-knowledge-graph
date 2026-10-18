# Wissensgraph

Macht aus deinen Projekten (Code, Doku, Obsidian-Notizen) einen durchsuchbaren Wissensgraphen – für dich und für Claude. Claude fragt den Graphen, statt Dateien zu durchsuchen, lernt dazu und lässt sich jederzeit spurlos wieder trennen.

Eine offizielle [Hostwerk](https://github.com/Passimoritz/hostwerk-public)-Erweiterung (SDK 2.3). Der Motor läuft in Hostwerk, ganz auf deinem Rechner: Zum Bauen des Graphen braucht es weder KI noch Internet. Diese Erweiterung ist die Oberfläche dazu.

## Was du bekommst

- **Graph:** Klassen, Funktionen, Methoden, Dateien, Doku, SQL-Tabellen und Begründungen aus Kommentaren (`WHY:`, `NOTE:`, `ADR-…`).
  - **Verbindungen:** Aufrufe, Importe, Vererbung, Verweise zwischen Dokumenten, Fremdschlüssel.
  - **Sicherheit:** Jede Verbindung ist markiert: `EXTRACTED` (steht so im Quelltext) oder `INFERRED` (über den Namen aufgelöst). Mehrdeutiges wird gezählt, nie geraten.
  - **Gruppen:** Teilbereiche, gefunden mit dem Louvain-Verfahren. Dazu zeigt der Graph zentrale Knoten und Werkzeug-Knoten, die überall benutzt werden.
  - **Karte:** eine interaktive Karte, dazu eine Textliste mit demselben Inhalt für Tastatur und Screenreader.
- **Fragen:**
  - Eine Frage in normalen Worten liefert einen knappen Ausschnitt mit `Datei:Zeile`.
  - **Erklären** zeigt ein Symbol mit allen Verbindungen.
  - **Weg** zeigt, wie A zu B kommt.
  - Mehrdeutige Namen liefern eine Auswahl.
- **Bericht:** zentrale Knoten, Gruppen, überraschende Verbindungen, Begründungen, häufig Gefragtes, offene Fragen und Vorschläge.
- **Lernen:**
  - Claude merkt sich mit `graph_learn` dauerhafte Erkenntnisse, verknüpft mit den passenden Knoten. Du bestätigst, änderst oder löschst sie.
  - Fragen ohne Treffer erscheinen als *offene Fragen*.
  - Oft Gefragtes landet bei späteren Antworten weiter oben.
- **Obsidian:**
  - **Export als Tresor:** eine Notiz je Knoten, Gruppen als Tags, Farben in der Graph-Ansicht. Was du dort änderst, bleibt beim nächsten Export unangetastet.
  - **Gedächtnis-Notizen wandern zurück:** Änderungen, die du in Obsidian an Gedächtnis-Notizen machst, übernimmt Hostwerk.
  - **Eigene Tresore in den Graphen aufnehmen:** `[[Links]]` verbinden Notizen untereinander und mit dem Code.
  - **Einzelne Notizen ins Gedächtnis übernehmen.**
- **Claude:**
  - **Werkzeuge:** `graph_query`, `graph_explain`, `graph_path`, `graph_report`, `graph_learn` und `graph_projects`. Sie kommen über den Hostwerk-MCP-Server, den Claude Desktop oder Claude Code ohnehin nutzt. Claude Code nimmt automatisch das Projekt des Ordners, in dem es gerade arbeitet.
- **Ohne Wartung:** Vor jeder Frage prüft Hostwerk in Millisekunden, ob sich Dateien geändert haben, und liest nur diese neu ein.

## So bleibt Claude heil

- **Einstellungen bleiben unberührt:** Die Erweiterung ändert nie Claudes eigene Einstellungen (keine `settings.json`, keine Hooks, keine Konfig-JSON).
- **Ein kleiner Abschnitt in `CLAUDE.md`/`AGENTS.md`:** nur wenn du das willst. Es ist genau ein markierter Abschnitt mit höchstens 3 KB. Vor dem Speichern prüft Hostwerk, dass der Rest der Datei gleich bleibt.
- **Optionaler Skill:** ein Skill-Ordner `.claude/skills/hostwerk-graph` mit Besitzer-Datei.
- **Vergessen:**
  - Es macht über ein Änderungsbuch genau das rückgängig, was Hostwerk geschrieben hat: Die Datei ist danach Byte für Byte wie vorher, auch mit Windows-Zeilenenden.
  - Selbst angelegte Dateien und Ordner verschwinden.
  - Ein von dir geänderter Skill bleibt und gehört dann dir.
  - Reste werden auch ohne Änderungsbuch gefunden, und eine Prüfung bestätigt am Ende „keine Spuren mehr“.
- **Pausieren:** Claude bekommt nur den kurzen Hinweis „pausiert“ und arbeitet wie gewohnt. Nichts wird gelöscht.
- **Kurze Antworten:** Antworten an Claude sind begrenzt, damit sein Kontext nicht vollläuft. Geheimnisse werden abgelehnt.

## Berechtigungen

| Berechtigung | Wofür |
|---|---|
| `read:knowledge` | Projekte, Graph, Bericht, Fragenverlauf, Gedächtnis und Claude-Status lesen |
| `change:knowledge` | Graph bauen und abfragen, Ordner aufnehmen, Gedächtnis pflegen, Obsidian-Export. Das betrifft nur die eigenen Daten des Graphen, deshalb ohne Rückfrage je Aufruf. |
| `connect:claude` | Abschnitt/Skill ins Projekt schreiben und wieder vergessen. Hostwerk fragt vorher. |

Lizenz: MIT
