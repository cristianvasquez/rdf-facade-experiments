# Session: Fix N3 Rules Textarea Cursor Jump

**Date:** 2603030807

---

## Human

please do the todo

---

## Assistant

Read the open todo: `todo - 2603021048 - n3 rules textarea cursor jumps when editing in graph node.md`

**Todo summary:**
The textarea inside `TransformNode` in `playground/App.jsx` causes the cursor to jump to the bottom while typing N3 rules in the React Flow graph node.

**Root cause identified:**
Every keystroke triggered:
1. `onChange` → `setN3rules`
2. `n3rules` in `setNodes` `useEffect` deps → `setNodes` called
3. `TransformNode` re-renders with new `data.value`
4. Controlled textarea (`value={data.value}`) re-rendered → cursor reset

**Fix applied** (`playground/App.jsx`, `TransformNode` component):
- Added `n3Ref = useRef(null)`
- Switched textarea from controlled (`value=`) to uncontrolled (`defaultValue=`)
- Added a `useEffect` that imperatively resets the textarea value only when `data.exampleId` or `data.mode` changes (i.e., example switch or mode toggle — not on every keystroke)

```jsx
// Before
<textarea
  value={data.value ?? ''}
  onChange={(e) => data.onChange?.(e.target.value)}
  spellCheck={false}
/>

// After
const n3Ref = useRef(null)

useEffect(() => {
  if (data.mode !== 'n3rules' || !n3Ref.current) return
  n3Ref.current.value = data.value ?? ''
}, [data.exampleId, data.mode])

<textarea
  ref={n3Ref}
  defaultValue={data.value ?? ''}
  onChange={(e) => data.onChange?.(e.target.value)}
  spellCheck={false}
/>
```

**Commits:**
- `a6cf122` fix: uncontrolled N3 textarea to prevent cursor jump on keystroke
- `7c39fd2` solved: n3 rules textarea cursor jump (todo renamed to solved)

---

## Human

/eidos:done

---

## Assistant

Session export initiated.
