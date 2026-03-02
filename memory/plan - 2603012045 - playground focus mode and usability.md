---
tldr: Improve playground UX with focus mode (click node to expand), pipeline navigation, and better example context
status: active
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

### Phase 3 - Split view (two nodes) - status: open

Show two pipeline nodes side by side in focus mode — useful for comparing markdown input with facade output, or transform with semantic output.

1. [ ] Add split view to `FocusView`
   - a split button in focus mode opens a second slot
   - second slot independently navigable
   - pairs naturally: markdown+facade, facade+transform, transform+semantic

### Phase 4 - Example context - status: open

Examples should explain themselves to colleagues new to the facade idea.

1. [ ] Add description to focus mode header
   - show the current example's `description` field (from frontmatter) in the focus view header
   - if empty, no placeholder needed — just absent
2. [ ] Audit example descriptions
   - check all 5 examples have a useful `description:` in frontmatter
   - update any that are missing or too terse

## Verification

- [ ] Click any node header → enters focus mode with full-height editable content
- [ ] Edit markdown in focus mode → facade and semantic update reactively
- [ ] Arrow buttons navigate between all 4 pipeline steps
- [ ] Two nodes can be shown side by side
- [ ] Each example has a description that a new colleague can follow

## Adjustments

<!-- Plans evolve. Document changes with timestamps. -->

## Progress Log

- 2603021 — Phase 1 complete: focus mode implemented in App.jsx. Click any node header to enter full-height view; ← Back returns to flow. All four node types (markdown, facade, transform, semantic) supported.
- 2603022 — Phase 2 complete: prev/next nav buttons in focus header with position indicator; keyboard ArrowLeft/Right navigate when not editing.
