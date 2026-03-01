---
tldr: Two-stage pipeline — document → structural facade RDF → semantic RDF via embedded CONSTRUCT query
category: core
---

# Facade Pipeline

## Target

Convert heterogeneous documents (markdown, Excel) into semantic RDF by first producing a faithful structural intermediate graph and then lifting it via a SPARQL CONSTRUCT query embedded in the document.

## Behaviour

- A document is parsed into a **facade graph** — a structural RDF representation that mirrors the document's containment and ordering without interpreting meaning
- A **CONSTRUCT query** embedded in the document's frontmatter transforms the facade graph into a **semantic graph**
- The two steps are independent: facade output can be inspected before the CONSTRUCT runs
- Markdown documents select their parser via a `facade:` frontmatter key
- When no CONSTRUCT is present, the pipeline returns the facade graph only
- Snapshot tests capture both the facade and the semantic output for each example

### Playground (browser UI)
- The pipeline is visualised as a **canvas of four connected nodes**: Markdown Input → Facade RDF → SPARQL CONSTRUCT → Target RDF
- All four nodes are live: editing markdown or the SPARQL query re-runs the full pipeline (500ms debounce)
- Facade and semantic outputs are displayed in `rdf-editor` web components; the query in a `sparql-editor`
- Nodes are draggable (by header), resizable (edge handles via Moveable), and connected by animated arrows (LeaderLine)
- Canvas supports pan and zoom (Panzoom); node positions and pan/zoom state are persisted to localStorage
- Example documents are loaded from `playground/examples/*/example.md` at build time via Vite's `import.meta.glob`

## Design

### Two-stage separation
The facade step is deliberately interpretation-free. All semantic decisions live in the CONSTRUCT query. This makes the structural output inspectable and reusable with different queries.

### Document-as-configuration
The CONSTRUCT query travels with the document in its frontmatter, not in a separate mapping file. Intent and mapping are co-located.

### Facade parsers — structural representations

**Streaming Facade-X** (`streaming-facade-x.js`)
- Hierarchy built from heading levels: Document > Section > Heading + content items
- Children linked with numbered predicates (`rdf:_1`, `rdf:_2`, …) and/or `rdfs:member`
- Properties stored as plain literals under `fx:` namespace
- Implemented as a Node.js Transform stream; buffers until flush

**Remark Facade** (`remark-facade.js`)
- Mirrors the remark AST node-for-node, preserving `position` (line/col/offset)
- Children linked with repeated `fxr:children` predicates (no ordering)
- Richer type fidelity (all remark node types); better for position-aware downstream queries

**Excel Facade** (`excel-facade.js`)
- Cells addressed spatially: `xls:x` (column), `xls:y` (row)
- Merge regions captured as `xls:MergeRegion` with bounding coordinates — first-class, not collapsed
- Optional style extraction: bold, fill colour (#RRGGBB)
- Value typing: xsd:decimal / xsd:boolean / xsd:dateTime / xsd:string

### Subject identity
Blank nodes by default. Named nodes opt-in via `useNamedNodes: true` + `baseUri` — required when IRIs need to survive into the semantic graph or be referenced externally.

### Namespaces per facade
Each facade uses its own namespace to avoid collisions:
- `fx:` / `md:` — streaming facade
- `fxr:` / `rmk:` — remark facade
- `xls:` — Excel facade

## Interactions

- `processExample` orchestrates the full pipeline (Node.js): read → frontmatter parse → facade → CONSTRUCT → semantic quads
- Facade quads are loaded into an N3 store; Comunica executes the CONSTRUCT against it
- `serialize-utils` provides Turtle printing for inspection
- Snapshot tests in `test/validate-examples.test.js` cover both facade and semantic outputs
- `CanvasExampleComponent` runs the same pipeline in the browser, re-executing on every edit
- The playground shares the same facade modules (`src/`) — same code, different host environment

## Mapping

> [[src/streaming-facade-x.js]]
> [[src/remark-facade.js]]
> [[src/excel-facade.js]]
> [[src/namespaces.js]]
> [[src/serialize-utils.js]]
> [[test/process-example.js]]
> [[playground/playground.js]]
> [[playground/CanvasExampleComponent.js]]
> [[playground/config.js]]
