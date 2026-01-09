import rdf from 'rdf-ext'
import { ns } from './namespaces.js'

export default function remarkToRdf () {
  // Return a transformer function (not a compiler)
  return function transformer (tree, file) {
    const quads = []
    processNode(tree, quads)
    file.data.quads = quads
    return tree
  }
}

function processNode (node, quads, parent = null, index = null) {

  // ----------------------------------------------------
  // MODIFY HERE: Replace blankNode() with namedNode(uri)
  // if you want stable URIs for nodes
  // e.g., namedNode(`http://example.org/doc#node-${someId}`)
  // ----------------------------------------------------
  const subject = rdf.blankNode()

  // Add rdf:type
  quads.push(rdf.quad(
    subject,
    rdf.namedNode(ns.rdf.type),
    rdf.namedNode(ns.md(capitalize(node.type))),
  ))

  // Link from parent using rdf:_N (1-indexed container property)
  if (parent !== null && index !== null) {
    quads.push(rdf.quad(
      parent,
      rdf.namedNode(ns.rdf(`_${index + 1}`)),
      subject,
    ))
  }

  // Add node properties as literals
  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'children' || key === 'position') {
      continue
    }

    quads.push(rdf.quad(
      subject,
      rdf.namedNode(ns.fx(key)),
      rdf.literal(String(value)),
    ))
  }

  // Add position data
  if (node.position) {
    const pos = node.position
    const posSubject = rdf.blankNode()

    quads.push(rdf.quad(
      subject,
      rdf.namedNode(ns.fx.position),
      posSubject,
    ))

    quads.push(rdf.quad(
      posSubject,
      rdf.namedNode(ns.fx.startLine),
      rdf.literal(String(pos.start.line)),
    ))
    quads.push(rdf.quad(
      posSubject,
      rdf.namedNode(ns.fx.startColumn),
      rdf.literal(String(pos.start.column)),
    ))
    quads.push(rdf.quad(
      posSubject,
      rdf.namedNode(ns.fx.startOffset),
      rdf.literal(String(pos.start.offset)),
    ))
    quads.push(rdf.quad(
      posSubject,
      rdf.namedNode(ns.fx.endLine),
      rdf.literal(String(pos.end.line)),
    ))
    quads.push(rdf.quad(
      posSubject,
      rdf.namedNode(ns.fx.endColumn),
      rdf.literal(String(pos.end.column)),
    ))
    quads.push(rdf.quad(
      posSubject,
      rdf.namedNode(ns.fx.endOffset),
      rdf.literal(String(pos.end.offset)),
    ))
  }

  // Process children recursively
  if (node.children) {
    node.children.forEach((child, i) => {
      processNode(child, quads, subject, i)
    })
  }

  return subject
}

function capitalize (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
