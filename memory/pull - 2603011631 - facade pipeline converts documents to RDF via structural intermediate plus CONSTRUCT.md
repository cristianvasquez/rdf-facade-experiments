# Pull: facade pipeline — document → structural RDF → semantic RDF

## Collected Material

### Concern 1 — Two-stage pipeline (process-example.js)

The full pipeline:
1. Read markdown file
2. Extract YAML frontmatter → selects facade implementation + holds CONSTRUCT query
3. Parse document → Facade-X RDF (structural quads)
4. Load facade quads into N3 store
5. Execute CONSTRUCT query (via Comunica) against that store → semantic quads

Frontmatter keys used:
- `facade: facade-x | facade-remark` — which parser to invoke (default: facade-x)
- `preserve-order: true|false` — controls rdf:_N numbering vs rdfs:member (default: true)
- `construct: <SPARQL CONSTRUCT string>` — the lifting query

Returns `{ facadeQuads, constructQuery, semanticQuads }`.

### Concern 2 — Streaming Facade-X parser (streaming-facade-x.js)

Produces a structural RDF graph mirroring document containment:
- `md:Document > md:Section > md:Heading / md:Paragraph > md:Emphasis / md:Text`
- Headings create sections; nesting follows heading levels (stack-based hierarchy builder)
- Child ordering: `rdf:_1 / rdf:_2 / …` (numbered) and/or `rdfs:member` — configurable
- Properties stored as `fx:raw`, `fx:text`, `fx:center`, etc. via `ns.fx(key)`
- Subjects: blank nodes by default; URIs if `useNamedNodes: true` + `baseUri`

Implemented as a Node.js `Transform` stream (object mode). Buffers all input, parses on `flush`.

Two exports:
- `createMarkdownToRdfStream(options)` — Transform stream (streaming API)
- `markdownToRdf(markdown, options)` — convenience Promise wrapper

### Concern 3 — Remark Facade parser (remark-facade.js)

Alternative parser backed by the remark AST (via unified + remark-parse + remark-gfm + remark-frontmatter).

Differences vs streaming:
- Faithfully mirrors the remark AST node types (`rmk:` namespace), including `position` sub-nodes with line/col/offset
- Properties use `fxr:` namespace
- Arrays (children, align) emitted as multiple quads with the same predicate (no ordering)
- No streaming — synchronous, returns array of quads directly

Two exports:
- `astToRdf(ast, options)` — works directly on a parsed remark AST
- `markdownToRdf(markdown, options)` — parse + convert in one call

### Concern 4 — Excel Facade (excel-facade.js)

Converts Excel workbooks (.xlsx via ExcelJS) to RDF with spatial structure:
- `xls:Workbook > xls:Sheet > xls:Cell` (by row/column coordinates: `xls:x`, `xls:y`)
- Merge regions captured separately as `xls:MergeRegion` with `startX/endX/startY/endY + value`
- Slave cells (type=1) skipped — merge regions take their place
- Cell value typed: xsd:decimal / xsd:boolean / xsd:dateTime / xsd:string
- Optional style sub-node: `xls:bold`, `xls:fillColor` (#RRGGBB)
- RichText cells concatenated to plain string

Two exports:
- `workbookToRdf(workbook, options)` — works on loaded ExcelJS Workbook
- `excelToRdf(filePath, options)` — loads .xlsx file and converts

### Concern 5 — Namespaces (namespaces.js)

Each facade has its own namespace set:
- `fx:` / `md:` — streaming facade (types + properties)
- `fxr:` / `rmk:` — remark facade
- `xls:` — Excel facade
- Standard: `rdf:`, `rdfs:`, `xsd:`, `ex:`, `foaf:`

Exported as `ns` (object of namespace builders) and `nsArray` (flat array for Turtle serializer prefix map).

### Concern 6 — Test / snapshot infrastructure

- 5 example markdown documents in `playground/examples/`
- Each example has `facade.ttl` (structural output) and `result.ttl` (after CONSTRUCT) snapshots
- `UPDATE_SNAPSHOTS=true` env var regenerates snapshots
- Both streaming facade test and snapshot-based test suites

---

## Patterns

- Frontmatter as document configuration: the CONSTRUCT query travels *with* the document, not in a separate file
- Structural representation preserves document hierarchy as RDF containment — blank nodes default, named nodes optional
- Two parsers exist for different tradeoffs: streaming (custom, ordering-aware) vs remark (AST-faithful, position-aware)
- Spatial semantics in Excel: cells addressed by (x, y) rather than document flow
- CONSTRUCT as the "lifting" step from structural to semantic RDF — explicit, queryable, tracing possible

## Dependencies

- `rdf-ext` — core RDF data factory
- `readable-stream` — Node.js stream compatibility
- `stream-markdown-parser` — custom markdown tokenizer used by streaming facade
- `unified` / `remark-*` — standard markdown parsing ecosystem
- `exceljs` — .xlsx reading
- `@comunica/query-sparql-rdfjs-lite` — SPARQL engine (CONSTRUCT execution)
- `n3` — RDF store for facade quads
- `@rdfjs/serializer-turtle` — Turtle output

---

## Intent Sketch

### What the system does
- Takes a document (markdown or Excel) and produces two RDF graphs: a structural *facade* graph and a semantic *result* graph
- The facade graph mirrors document structure (containment, ordering, spatial position)
- The semantic graph is produced by running a user-supplied CONSTRUCT query against the facade
- The CONSTRUCT query is embedded in the document's frontmatter — intent and mapping travel together

### Design decisions to survive a rewrite
- The facade step is intentionally dumb — it preserves structure without interpretation
- Semantics are supplied externally (CONSTRUCT) not inferred by the parser
- Two parser implementations exist because different use cases require different tradeoffs (streaming vs richer AST, ordering vs position)
- Excel uses (x, y) spatial coordinates — merge regions are first-class, not collapsed into cells
- Blank nodes are the default identity strategy; named nodes are opt-in when IRIs matter downstream
