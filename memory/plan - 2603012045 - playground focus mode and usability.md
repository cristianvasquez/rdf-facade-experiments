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

### Phase 1 - Focus mode (single node) - status: active

Click a node header → canvas is replaced by a full-height view of that node's content.
Click the header again (or a back button) → return to the flow.

1. [ ] Add focus mode to App.jsx
   - `focusedNodeId` state (null = flow view)
   - clicking a node header sets `focusedNodeId`
   - render `FocusView` component instead of ReactFlow when `focusedNodeId` is set
   - `FocusView` shows the node's full content (textarea or rdf-editor) at full height
   - a back button returns to the flow view

### Phase 2 - Pipeline navigation in focus mode - status: open

While in focus mode, arrow buttons (or keyboard) cycle through pipeline steps without going back to the flow.

1. [ ] Add prev/next navigation to `FocusView`
   - pipeline order: markdown → facade → transform → semantic
   - `←` and `→` buttons navigate between nodes
   - show current position (e.g. "2 / 4" or node name as breadcrumb)
   - keyboard arrow keys also navigate (when not editing text)

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

<!-- Timestamped entries tracking work done. Updated after every action. -->
