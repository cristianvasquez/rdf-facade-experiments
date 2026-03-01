---
tldr: Remark facade restructured as a heading-scoped tree — headings become containers, position attributes replace explicit ordering
---

# Remark Facade

## Target

Replace the current node-for-node AST mirror with a tree where headings define containment.
The flat mirror is structurally faithful but hard to query: CONSTRUCT and N3 rules must navigate sibling lists rather than parent–child relationships.
A heading-scoped tree makes "all content under section X" a single pattern.

## Behaviour

- All remark node types are preserved (`rmk:heading`, `rmk:paragraph`, `rmk:code`, `rmk:blockquote`, etc.)
- **Heading nodes become containers**: all content between a heading and the next heading at the same or higher depth becomes children of that heading
- A heading nested inside another heading becomes a child of its parent heading, not a sibling
- Non-heading content (paragraphs, code, lists, blockquotes) is attached as a child of the nearest enclosing heading
- Children are linked via repeated `fxr:children` predicate — no ordering predicate
- **Each node retains position attributes** (`fxr:position` → start/end with `fxr:line`, `fxr:column`, `fxr:offset`) — sufficient to derive document order when needed
- The document root remains a `rmk:root` node; top-level content before any heading is a direct child of root
- `rmk:depth` is preserved on heading nodes (1–6)

## Design

### Heading stack
A stack tracks the current container.
On encountering a heading, pop entries whose depth ≥ the new heading's depth, then push the new heading as the current container.
All non-heading nodes are appended as children of the stack top.

```
root
└── heading (depth 1) "Introduction"
    ├── paragraph
    ├── code
    └── heading (depth 2) "Background"
        └── paragraph
```

### Repeated children predicate
`fxr:children` is repeated for each child — same as current facade.
Order is not encoded in the predicate; use `fxr:line`/`fxr:offset` to sort when order matters.

### Position on every node
The existing position triples (`fxr:position → fxr:start/fxr:end → fxr:line / fxr:column / fxr:offset`) are kept on every node.
This makes ordering derivable from the facts without an explicit sequence structure.

## Friction

- Heading depth comparisons in SPARQL or N3 rules require the depth value to be present (`fxr:depth`); omitting it breaks nesting logic
- Content before the first heading in a document attaches to root — queries that assume all content is under a heading need to account for this

## Interactions

- Replaces the existing node-for-node remark facade in [[spec - facade pipeline - document to structural RDF to semantic RDF via CONSTRUCT]]
- The facade pipeline spec's description of the remark facade needs updating to reflect tree structure

## Mapping

> [[src/remark-facade.js]]

## Notes

Reference implementation for the tree-building logic: `simpleAst` in `docs-and-graphs/src/simpleAst.js`.
Key difference: simpleAst collapses node types to a simple set; this spec keeps all remark types and only changes containment.
