import React, { useState, useEffect, useRef } from 'react'
import {
  ReactFlow, Background, Controls,
  useNodesState, useEdgesState,
  Handle, Position,
} from '@xyflow/react'
import YAML from 'yaml'
import rdf from 'rdf-ext'
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite'
import { Store, Writer as N3Writer } from 'n3'
import eyeling from 'eyeling/eyeling.js'
import 'rdf-elements/rdf-elements.js'
import { ns } from '../src/namespaces.js'
import { markdownToRdf as remarkToRdf } from '../src/remark-facade.js'
import { markdownToRdf as facadeXToRdf } from '../src/streaming-facade-x.js'

// ─── Example loading ──────────────────────────────────────────────────────────

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { frontmatter: {}, content: raw }
  try { return { frontmatter: YAML.parse(m[1]), content: m[2] } }
  catch { return { frontmatter: {}, content: raw } }
}

const exampleFiles = import.meta.glob('./examples/*/example.md', {
  query: '?raw', import: 'default', eager: true,
})

const examples = Object.entries(exampleFiles)
  .map(([path, raw]) => {
    const id = path.match(/\.\/examples\/(\d+-[^/]+)\/example\.md/)?.[1] ?? path
    const { frontmatter: fm, content: markdown } = parseFrontmatter(raw)
    return {
      id,
      title: fm.title ?? id.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: fm.description ?? '',
      markdown,
      sparql: fm.construct ?? '',
      n3rules: fm.n3rules ?? '',
      facade: fm.facade ?? 'facade-x',
      preserveOrder: fm['preserve-order'] ?? true,
      ignore: fm.ignore ?? false,
    }
  })
  .filter(ex => !ex.ignore)
  .sort((a, b) => a.id.localeCompare(b.id))

// ─── Utilities ────────────────────────────────────────────────────────────────

const queryEngine = new QueryEngine()
const nsPrefixes = new Map(Object.entries(ns).map(([k, v]) => [k, v()]))

function quadsToTurtle(quads) {
  return new Promise((resolve, reject) => {
    const w = new N3Writer()
    w.addQuads(quads)
    w.end((err, r) => err ? reject(err) : resolve(r))
  })
}

// ─── Node styles ──────────────────────────────────────────────────────────────

const COLORS = {
  markdown: '#ff6b6b',
  facade: '#4dabf7',
  transform: '#cc5de8',
  semantic: '#51cf66',
}

const wrap = (color) => ({
  width: '100%', height: '100%', background: '#fff',
  border: `2px solid ${color}`, borderRadius: 8,
  display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box',
})

const head = (color) => ({
  padding: '8px 12px', background: '#f8f9fa',
  borderBottom: '1px solid #e0e0e0', borderLeft: `4px solid ${color}`,
  display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
})

const body = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }

const Badge = ({ label }) => (
  <span style={{ background: '#e9ecef', color: '#495057', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500 }}>
    {label}
  </span>
)

const Title = ({ text }) => (
  <span style={{ fontWeight: 600, fontSize: 13, flex: 1, color: '#1a1a1a' }}>{text}</span>
)

// ─── Node components ──────────────────────────────────────────────────────────

function MarkdownNode({ data }) {
  return (
    <div style={wrap(COLORS.markdown)}>
      <Handle type="source" position={Position.Right} />
      <div style={head(COLORS.markdown)}>
        <Title text="Markdown" /><Badge label="input" />
      </div>
      <div style={body}>
        <textarea
          style={{ flex: 1, border: 'none', padding: 12, fontFamily: 'monospace', fontSize: 12, resize: 'none', outline: 'none', minHeight: 0, width: '100%' }}
          value={data.markdown ?? ''}
          onChange={(e) => data.onChange?.(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

// Shared component for nodes that display RDF via rdf-editor web component
function RdfDisplayNode({ color, label, sub, target = false, source = false, rdfDataset, turtle }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    customElements.whenDefined('rdf-editor').then(() => {
      el.mediaType = 'text/turtle'
      if (rdfDataset != null) {
        el.dataset = rdfDataset
        el.prefixes = nsPrefixes
      } else if (turtle != null) {
        el.value = turtle
      }
    })
  }, [rdfDataset, turtle])

  return (
    <div style={wrap(color)}>
      {target && <Handle type="target" position={Position.Left} />}
      {source && <Handle type="source" position={Position.Right} />}
      <div style={head(color)}><Title text={label} /><Badge label={sub} /></div>
      <div style={body}>
        <rdf-editor ref={ref} style={{ flex: 1, width: '100%', minHeight: 0 }} />
      </div>
    </div>
  )
}

function FacadeNode({ data }) {
  return (
    <RdfDisplayNode
      color={COLORS.facade} label="Facade RDF" sub="intermediate"
      target source rdfDataset={data.rdfDataset}
    />
  )
}

function SemanticNode({ data }) {
  return (
    <RdfDisplayNode
      color={COLORS.semantic} label="Target RDF" sub="output"
      target rdfDataset={data.rdfDataset} turtle={data.turtle}
    />
  )
}

function TransformNode({ data }) {
  const sparqlRef = useRef(null)
  const onChangeRef = useRef(data.onChange)
  onChangeRef.current = data.onChange

  // Set sparql-editor value when the example changes
  useEffect(() => {
    if (data.mode !== 'sparql') return
    customElements.whenDefined('sparql-editor').then(() => {
      if (sparqlRef.current) sparqlRef.current.value = data.value ?? ''
    })
  }, [data.exampleId, data.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Attach sparql-editor change listener
  useEffect(() => {
    const el = sparqlRef.current
    if (!el || data.mode !== 'sparql') return
    const handler = (e) => { if (!e.detail?.error) onChangeRef.current?.(e.detail.value) }
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
  }, [data.mode])

  const isN3 = data.mode === 'n3rules'
  return (
    <div style={wrap(COLORS.transform)}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div style={head(COLORS.transform)}>
        <Title text={isN3 ? 'N3 Rules' : 'SPARQL CONSTRUCT'} />
        <Badge label={isN3 ? 'eyeling' : 'editable'} />
      </div>
      <div style={body}>
        {isN3 ? (
          <textarea
            style={{ flex: 1, border: 'none', padding: 12, fontFamily: 'monospace', fontSize: 12, resize: 'none', outline: 'none', minHeight: 0, width: '100%' }}
            value={data.value ?? ''}
            onChange={(e) => data.onChange?.(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <sparql-editor ref={sparqlRef} style={{ flex: 1, width: '100%', minHeight: 0 }} />
        )}
      </div>
    </div>
  )
}

// ─── Node types — defined at module level for React Flow stability ────────────

const nodeTypes = {
  markdownNode: MarkdownNode,
  facadeNode: FacadeNode,
  transformNode: TransformNode,
  semanticNode: SemanticNode,
}

// ─── Initial layout ───────────────────────────────────────────────────────────

const W = 450, H = 550, GAP = 80

const initialNodes = [
  { id: 'markdown',  type: 'markdownNode',  position: { x: 0,                 y: 0 }, data: {}, style: { width: W, height: H } },
  { id: 'facade',    type: 'facadeNode',    position: { x: W + GAP,           y: 0 }, data: {}, style: { width: W, height: H } },
  { id: 'transform', type: 'transformNode', position: { x: (W + GAP) * 2,     y: 0 }, data: {}, style: { width: W, height: H } },
  { id: 'semantic',  type: 'semanticNode',  position: { x: (W + GAP) * 3,     y: 0 }, data: {}, style: { width: W, height: H } },
]

const initialEdges = [
  { id: 'e1', source: 'markdown',  target: 'facade',    animated: true },
  { id: 'e2', source: 'facade',    target: 'transform', animated: true },
  { id: 'e3', source: 'transform', target: 'semantic',  animated: true },
]

// ─── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const [example, setExample]         = useState(examples[0])
  const [markdown, setMarkdown]       = useState(examples[0]?.markdown ?? '')
  const [sparql, setSparql]           = useState(examples[0]?.sparql ?? '')
  const [n3rules, setN3rules]         = useState(examples[0]?.n3rules ?? '')
  const [facadeDataset, setFacadeDataset]   = useState(null)
  const [semanticDataset, setSemanticDataset] = useState(null)
  const [semanticTurtle, setSemanticTurtle]   = useState(null)

  const mode = example?.n3rules ? 'n3rules' : 'sparql'

  function loadExample(id) {
    const ex = examples.find(e => e.id === id)
    if (!ex) return
    setExample(ex)
    setMarkdown(ex.markdown)
    setSparql(ex.sparql)
    setN3rules(ex.n3rules)
    setFacadeDataset(null)
    setSemanticDataset(null)
    setSemanticTurtle(null)
  }

  // ── Pipeline: markdown + transform → facade + semantic ──
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        // Step 1: facade
        let facadeQuads
        if (example.facade === 'facade-remark') {
          facadeQuads = remarkToRdf(markdown)
        } else {
          facadeQuads = await facadeXToRdf(markdown, {
            facade: example.facade,
            useNumbered: example.preserveOrder,
            useRdfsMember: !example.preserveOrder,
          })
        }
        if (cancelled) return
        setFacadeDataset(rdf.dataset(facadeQuads))

        // Step 2: transform
        if (mode === 'n3rules') {
          const factsN3 = await quadsToTurtle(facadeQuads)
          if (cancelled) return
          const result = eyeling.reasonStream(factsN3 + '\n' + n3rules, { includeInputFactsInClosure: false })
          if (!cancelled) { setSemanticTurtle(result.closureN3 ?? ''); setSemanticDataset(null) }
        } else {
          if (!sparql) return
          const store = new Store(facadeQuads)
          const qr = await queryEngine.queryQuads(sparql, { sources: [store] })
          const qquads = await qr.toArray()
          if (!cancelled) { setSemanticDataset(rdf.dataset(qquads)); setSemanticTurtle(null) }
        }
      } catch (e) { console.error('Pipeline error:', e) }
    }
    run()
    return () => { cancelled = true }
  }, [markdown, sparql, n3rules, example, mode])

  // ── Sync pipeline state into React Flow node data ──
  useEffect(() => {
    setNodes(prev => prev.map(node => {
      if (node.id === 'markdown')  return { ...node, data: { markdown, onChange: setMarkdown } }
      if (node.id === 'facade')    return { ...node, data: { rdfDataset: facadeDataset } }
      if (node.id === 'transform') return { ...node, data: {
        mode,
        value: mode === 'n3rules' ? n3rules : sparql,
        onChange: mode === 'n3rules' ? setN3rules : setSparql,
        exampleId: example.id,
      }}
      if (node.id === 'semantic')  return { ...node, data: mode === 'n3rules'
        ? { turtle: semanticTurtle }
        : { rdfDataset: semanticDataset }
      }
      return node
    }))
  }, [markdown, facadeDataset, semanticDataset, semanticTurtle, sparql, n3rules, mode, example]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 16px', background: '#f8f9fa', borderBottom: '1px solid #d0d0d0', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <strong style={{ fontSize: 14 }}>Markdown → RDF</strong>
        <select
          value={example?.id}
          onChange={(e) => loadExample(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13 }}
        >
          {examples.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
        </select>
        {example?.description && (
          <span style={{ color: '#666', fontSize: 12, fontStyle: 'italic' }}>{example.description}</span>
        )}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          deleteKeyCode={null}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
