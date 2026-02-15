# Canvas Playground Testing Checklist

The canvas-based playground has been implemented. Use this checklist to verify all functionality.

## Access

- **Canvas Playground**: http://localhost:3000/ (running now)
- **Original Panel Playground**: Available in `playground-panels/` directory

## Visual Verification

### Initial Load
- [ ] Page loads without JavaScript errors (check browser console)
- [ ] Four canvas nodes are visible:
  - [ ] Node 1 (Markdown Input) - red border
  - [ ] Node 2 (Facade RDF) - blue border
  - [ ] Node 3 (SPARQL CONSTRUCT) - purple border
  - [ ] Node 4 (Target RDF) - green border
- [ ] SVG arrows connect the nodes (1→2→3→4)
- [ ] Example selector dropdown is visible
- [ ] First example is loaded by default

### Node Dragging
- [ ] Click and drag from any node header (not from content area)
- [ ] Node follows mouse cursor smoothly
- [ ] Arrows update in real-time during drag
- [ ] Arrows remain connected to correct nodes
- [ ] Can drag nodes to any position on canvas
- [ ] Canvas scrolls if nodes are dragged beyond viewport

### Node Collapse
- [ ] Click collapse button (▼) on any node
- [ ] Node content hides, only header visible
- [ ] Collapse button rotates 90° (-90deg)
- [ ] Arrows still connect to collapsed nodes correctly
- [ ] Click again to expand
- [ ] Content reappears

## Functional Tests

### Test 1: Example Loading
1. Open http://localhost:3000/
2. Verify first example loads (should be "Team Alpha Emphasis")
3. Click example selector dropdown
4. Select different examples
5. **Expected**: Each loads with its own markdown, SPARQL, and initial RDF output

### Test 2: Markdown Editing
1. Load example "01-team-alpha-emphasis"
2. Edit markdown in the Markdown Input node
3. Wait 500ms (debounce)
4. **Expected**: Facade RDF and Target RDF nodes update automatically

### Test 3: SPARQL Editing
1. Load any example
2. Modify the SPARQL query (e.g., add a filter)
3. Wait 500ms
4. **Expected**: Target RDF node updates with new query results

### Test 4: Preserve Order Toggle
1. Load any example
2. Look at Facade RDF output
3. Toggle "Preserve order" checkbox in Facade node
4. **Expected**:
   - Checked: Uses `rdf:_1`, `rdf:_2`, etc.
   - Unchecked: Uses `rdfs:member`

### Test 5: Facade Variants
1. Load "04-tables" (uses facade-remark)
2. Verify it processes correctly
3. Load "01-team-alpha-emphasis" (uses facade-x)
4. Verify it processes correctly
5. **Expected**: Both work with their respective facades

### Test 6: Error Handling
1. In Markdown node, enter invalid characters or corrupt the syntax
2. **Expected**: Error messages appear in Facade/Target RDF nodes
3. Fix the markdown
4. **Expected**: Processing resumes normally

### Test 7: Multiple Nodes Drag
1. Drag all four nodes to new positions
2. Arrange them vertically or in a different layout
3. **Expected**: Arrows remain connected and update smoothly

### Test 8: Example Switching While Dragged
1. Drag nodes to custom positions
2. Switch to a different example
3. **Expected**: New example loads, nodes reset to default positions

## Performance Checks

- [ ] No lag when dragging nodes
- [ ] Arrows update smoothly (no flickering)
- [ ] Markdown editing is responsive (500ms debounce working)
- [ ] No memory leaks (check browser dev tools)
- [ ] No console errors

## Browser Compatibility

Test in:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)

## Comparison with Original

To verify the panel-based version still works:

1. Stop the dev server (Ctrl+C)
2. Update `vite.config.js` temporarily to point to `playground-panels`
3. Run `pnpm dev`
4. Verify original panel layout works
5. Restore to use `playground/` directory

## Known Issues / Notes

- Canvas workspace is 1600px × 800px (scrollable)
- Default node positions:
  - Node 1: (50px, 100px)
  - Node 2: (400px, 100px)
  - Node 3: (750px, 100px)
  - Node 4: (1100px, 100px)
- Collapse button must be clicked directly (not part of drag zone)
- Node positions are not saved between page reloads

## Success Criteria

All checkboxes above should be checked ✓ for full feature parity with the original panel-based playground.
