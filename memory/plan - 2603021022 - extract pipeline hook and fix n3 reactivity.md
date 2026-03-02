---
tldr: Extract the playground pipeline into a usePipeline hook and fix N3 rules reactivity
status: active
---

# Plan: Extract pipeline hook and fix N3 reactivity

## Context

- Spec: [[spec - facade pipeline - document to structural RDF to semantic RDF via CONSTRUCT]]
- Spec: [[spec - n3 rules lifting - N3 rules as alternative semantic lifting via eyeling]]

The playground `App.jsx` contains the full pipeline execution as an inline `useEffect`.
Edits to the N3 rules textarea are not reliably reflected in the Target RDF output.
Two problems:
1. **Abstraction**: pipeline logic is tangled with React state management in `App`
2. **Reactivity**: pipeline errors are silently swallowed (`catch(e) { console.error }`), so any failure leaves the output stale — and the rdf-editor web component may not reliably react to imperative `el.value = turtle` updates

Related fix already applied (2603021022): N3 closure output is now parsed into a proper `rdf.dataset` (via `turtleToDataset`) instead of passed as a raw string, so it goes through the dataset path which applies `nsPrefixes` for prettification and is more reliably reactive.

## Phases

### Phase 1 - Diagnose and harden reactivity - status: open

Goal: Confirm whether N3 edits now trigger correct output updates after today's fix, and ensure errors are visible rather than silent.

1. [ ] Add pipeline error state and surface it in the UI
   - Add `const [pipelineError, setPipelineError] = useState(null)` in App
   - In the `catch(e)` block, call `setPipelineError(e.message ?? String(e))`
   - Clear error at the start of each run: `setPipelineError(null)`
   - Display error visually in the SemanticNode (e.g. red text below the rdf-editor)

2. [ ] Verify N3 reactivity end-to-end
   - Load example `05-team-alpha-n3`
   - Edit an N3 rule (e.g. change `:Team` to `:Group`) and confirm the Target RDF updates
   - Confirm the output is now prettified with correct prefixes (from today's fix)
   - If still broken: add a `console.log` trace inside the pipeline effect to confirm it fires and check for caught errors

### Phase 2 - Extract usePipeline hook - status: open

Goal: Move pipeline execution out of `App` into `playground/usePipeline.js` for clean separation.

1. [ ] Create `playground/usePipeline.js`
   - Signature: `usePipeline({ markdown, sparql, n3rules, example })` → `{ facadeDataset, semanticDataset, error, isRunning }`
   - Move all pipeline logic from `App`'s `useEffect` into the hook
   - Preserve the `cancelled` flag pattern for cleanup
   - Expose `isRunning` state (set to `true` at run start, `false` on completion or error)

2. [ ] Replace inline pipeline effect in App with `usePipeline`
   - Import and call `usePipeline({ markdown, sparql, n3rules, example })`
   - Destructure `{ facadeDataset, semanticDataset, error, isRunning }` from the hook
   - Remove the now-redundant state declarations (`facadeDataset`, `semanticDataset`, `semanticTurtle`, `pipelineError` if added in Phase 1)
   - Remove `setSemanticTurtle` from App entirely (now dead after today's fix)

3. [ ] Pass `error` and `isRunning` to the semantic node
   - Update `SemanticNode` to accept and display an error prop
   - Show a spinner or "running…" indicator when `isRunning` is true

### Phase 3 - Clean up dead code - status: open

1. [ ] Remove `semanticTurtle` / `setSemanticTurtle` state and all references
   - State was made redundant by Phase 1's fix (N3 output now always produces a dataset)
   - Remove from `App` state declarations
   - Remove from `FocusPaneContent` and `FocusView` prop signatures
   - Remove `else if (semanticTurtle)` branch in `FocusPaneContent`

2. [ ] Remove `turtle` prop from `SemanticNode`
   - `SemanticNode` no longer needs the `turtle` prop after the above
   - Simplify `RdfDisplayNode` if the `turtle` branch is unused elsewhere

## Verification

- Loading the N3 example shows prettified, prefixed output in Target RDF
- Editing an N3 rule updates the output within a second or two
- Pipeline errors (invalid N3 syntax) display a readable message in the UI rather than silently failing
- `usePipeline` is a self-contained module with no React UI imports

## Adjustments

## Progress Log

- 2603021022 — Plan created. N3 prefix fix already applied (closureN3 → dataset via turtleToDataset).
