---
tldr: Improve playground UX with focus mode (click node to expand), pipeline navigation, and better example context
status: completed
---

# Plan: Playground focus mode and usability

## Context

- Spec: [[spec - facade pipeline - document to structural RDF to semantic RDF via CONSTRUCT]]
- Branch: `task/react-flow-playground`

The React Flow migration is done (4-node canvas, all examples working).
The current issue: nodes are small, content is hard to read and edit.
The audience is colleagues unfamiliar with the facade concept — the playground needs to be self-explanatory and comfortable to work in.

## Phases

### Phase 1 - Focus mode (single node) - status: done

Click a node header → canvas is replaced by a full-height view of that node's content.
Click the header again (or a back button) → return to the flow.

1. [x] Add focus mode to App.jsx
   - => `focusedNodeId` state added (null = flow view)
   - => clicking any node header sets `focusedNodeId` (cursor:pointer on all headers)
   - => `FocusView` component renders instead of ReactFlow when focused
   - => `FocusView` shows full-height content: textarea for markdown/n3rules, rdf-editor for facade/semantic, sparql-editor for sparql transform
   - => "← Back" button returns to flow; description shown in focus header
   - => `290b56a` feat: add focus mode

### Phase 2 - Pipeline navigation in focus mode - status: done

While in focus mode, arrow buttons (or keyboard) cycle through pipeline steps without going back to the flow.

1. [x] Add prev/next navigation to `FocusView`
   - => `‹ [prev label]` and `[next label] ›` buttons in focus header; disabled at ends
   - => position shown as `NodeName (2 / 4)`
   - => keyboard `ArrowLeft`/`ArrowRight` navigate when active element is not textarea/input
   - => `a4c803d` feat: add pipeline navigation in focus mode

### Phase 3 - Split view (two nodes) - status: done

Show two pipeline nodes side by side in focus mode — useful for comparing markdown input with facade output, or transform with semantic output.

1. [x] Add split view to `FocusView`
   - => `⊞ Split` button in single-pane header opens second slot (defaults to next node, or prev if at end)
   - => two-column layout: each column has independent `PaneNav` (‹ / ›) and `FocusPaneContent`
   - => `⊠ Close split` returns to single-pane view; `← Back` resets both panes
   - => `FocusPaneContent` extracted as reusable component; keyboard nav unchanged (controls left pane)
   - => `d317b3a` feat: add split view in focus mode

### Phase 4 - Example context - status: done

Examples should explain themselves to colleagues new to the facade idea.

1. [x] Add description to focus mode header
   - => description shown in focus header (both single-pane and split modes) — done in Phase 1
   - => hidden from toolbar when in focus view (no duplicate)
2. [x] Audit example descriptions
   - => all 5 examples have `description:` in frontmatter
   - => 01: "Using emphasis (*text*) to denote relationships" ✓
   - => 02: "Explicit entity and property declarations" ✓
   - => 03: "Using nested markdown lists to express hierarchies" ✓
   - => 04: "Using markdown tables to represent structured data" ✓
   - => 05: "Same document as example-01, using remark tree facade and N3 rules instead of SPARQL CONSTRUCT" ✓
   - => no updates needed

## Verification

- [x] Click any node header → enters focus mode with full-height editable content
- [x] Edit markdown in focus mode → facade and semantic update reactively
- [x] Arrow buttons navigate between all 4 pipeline steps
- [x] Two nodes can be shown side by side
- [x] Each example has a description that a new colleague can follow

## Adjustments

<!-- Plans evolve. Document changes with timestamps. -->

## Progress Log

- 2603021 — Phase 1 complete: focus mode implemented in App.jsx. Click any node header to enter full-height view; ← Back returns to flow. All four node types (markdown, facade, transform, semantic) supported.
- 2603022 — Phase 2 complete: prev/next nav buttons in focus header with position indicator; keyboard ArrowLeft/Right navigate when not editing.
- 2603023 — Phase 3 complete: split view with ⊞ Split button; two independently navigable panes; FocusPaneContent extracted as shared component.
- 2603024 — Phase 4 complete: all 5 examples have clear descriptions; description already shown in focus headers from Phase 1. Plan complete.
