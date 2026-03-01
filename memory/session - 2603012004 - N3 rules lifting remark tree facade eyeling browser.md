# Session — N3 rules lifting, remark tree facade, eyeling browser

**Date:** 2026-03-01
**Branch:** `task/eidos-init`
**Commits this session:** 6

---

## What was done

### Specs created

**`/eidos:spec` — N3 rules lifting**
Discussion: replace SPARQL CONSTRUCT with N3 rules via `eyeling` library. Decided they coexist — presence of `n3rules:` vs `construct:` frontmatter key selects the strategy. N3 rules are embedded in frontmatter, same pattern as CONSTRUCT.

Spec created: `eidos/spec - n3 rules lifting - N3 rules as alternative semantic lifting via eyeling.md`

Key friction noted:
- `log:notIncludes` scales poorly (quadratic with fact volume)
- eyeling is CJS; needs `createRequire` in ESM context
- `math:difference` preferred over `math:sum` when left operand unknown

---

**`/eidos:spec` — remark facade tree**
Discussion: current remark facade mirrors remark AST node-for-node (flat siblings). The new design makes headings into containers — all block content between a heading and the next same-or-higher heading becomes children of that heading.

Decisions:
- Replaces current facade (not a new variant)
- Children use repeated `fxr:children` (no ordering predicate)
- Position attributes preserved (`fxr:line`, `fxr:column`, `fxr:offset`) — sufficient for ordering when needed
- All remark types preserved

Spec created: `eidos/spec - remark facade - heading-scoped tree with position attributes.md`
Pipeline spec updated to cross-link.

Reference: `docs-and-graphs/src/simpleAst.js` (same tree-building logic but collapses types; this spec keeps all remark types).

---

### Implementation

**Example 05 — Team Alpha with N3 rules + remark tree facade**

Steps:
1. Installed `eyeling` package
2. Updated `src/remark-facade.js` — added `restructureToTree(ast)` function; called in `markdownToRdf` before `astToRdf`
3. Updated `test/process-example.js` — `n3rules:` detection; serializes facade quads to Turtle via N3 Writer; calls `eyeling.reason({}, facts + rules)`
4. Created `playground/examples/05-team-alpha-n3/example.md`

N3 rules in the example navigate the tree:
- h1 headings → `:Team` with `:name`
- h2 under h1 → `foaf:Person` with `foaf:name`, linked via `:hasMember`
- emphasis in paragraph → `:relationship` literal
- text after emphasis → `:target` literal (note: leading space artefact from remark)

Output verified:
```turtle
_:b2 a :Team .
_:b2 :name "Team Alpha" .
_:b7 a foaf:Person .
_:b2 :hasMember _:b7 .
_:b7 foaf:name "Bob" .
_:b7 :relationship "knows" .
_:b7 :target " Alice" .
```

---

**Playground — dynamic transform node**

Updated `playground/playground.js` to read `n3rules` from frontmatter.

Updated `playground/CanvasExampleComponent.js`:
- `transformMode` set from example: `'sparql'` or `'n3rules'`
- `renderTransformNode()` replaces `renderSparqlNode()` — renders `<sparql-editor>` or `<textarea>` depending on mode
- N3 rules textarea triggers debounced re-run on edit

---

**eyeling browser execution**

Discovery: `eyeling.js` is a self-contained bundle with no external runtime dependencies. It sets `self.eyeling` in browser/worker context. The `index.js` wrapper (which uses `child_process`) is only for the subprocess-based synchronous Node API.

`reasonStream(n3text, opts)` is synchronous and browser-compatible.

Changes:
- `vite.config.js` — added `optimizeDeps` with Node.js built-ins marked external (they only appear in dead code paths for remote URI dereferencing)
- `CanvasExampleComponent.js` — imports `eyeling/eyeling.js` directly; `quadsToTurtle` helper (N3 Writer); calls `eyeling.reasonStream(factsN3 + rules, { includeInputFactsInClosure: false })`; displays `result.closureN3` in semantic output

---

**Tests fixed**

- Removed `05-wikilinks` from EXAMPLES list (file doesn't exist)
- Added `05-team-alpha-n3`
- Added `parseTurtle` helper (n3 Parser) so `n3rulesOutput` Turtle string can be compared as quads
- Regenerated `04-tables` facade snapshot (changed by tree restructure)
- Created new `05-team-alpha-n3` facade + result snapshots

Result: **14/14 passing**

---

## Open items

- `semanticEl.value = result.closureN3` in the playground shows raw Turtle without prefix declarations — could be improved to a proper rdf-editor dataset view
- Leading space in target values (e.g. `" Alice"`) — remark text node artefact; could be trimmed in rules or in the facade
- `05-team-alpha-n3` uses blank nodes throughout — no named URIs; URI construction with `string:concat` left for a future example

---

## Commits

```
39dcd52 test: update snapshots for remark tree facade; add 05-team-alpha-n3, remove 05-wikilinks
ab463f5 feat: run N3 rules live in browser via eyeling.reasonStream
deb940d feat: playground transform node adapts to SPARQL or N3 rules per example
bbeeb06 feat: remark tree facade + N3 rules lifting via eyeling (example 05)
eb51489 spec: remark facade as heading-scoped tree; update pipeline spec
8a21b6b spec: N3 rules as alternative semantic lifting via eyeling
```
