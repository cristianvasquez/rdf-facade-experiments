---
tldr: N3 rules textarea cursor jumps below when editing in the React Flow graph node
category: bug
---

# Todo: N3 rules textarea cursor jumps when editing in graph node

The textarea inside the `TransformNode` React Flow node causes the cursor to jump to the bottom while typing.

Likely cause: React controlled component pattern with `value={data.value}` — each keystroke triggers `setN3rules` → re-render → `setNodes` → node data update → textarea re-renders, potentially resetting cursor position.

Related code: `playground/App.jsx` — `TransformNode` component (N3 textarea) and the node data sync `useEffect`.

Possible fix: use an uncontrolled textarea with a ref + manual sync, or debounce the state update so the textarea isn't re-rendered on every keystroke.
