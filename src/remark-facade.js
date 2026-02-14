import rdf from 'rdf-ext'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import { ns } from './namespaces.js'

/**
 * Creates RDF quads from a remark AST node.
 * Directly represents the AST structure as RDF.
 *
 * @param {Object} ast - The remark AST
 * @param {Object} options - Configuration options
 * @param {boolean} options.useNamedNodes - If true, uses named nodes instead of blank nodes
 * @param {string} options.baseUri - Base URI for named nodes
 * @returns {Array} Array of RDF quads
 */
export function astToRdf(ast, options = {}) {
  const {
    useNamedNodes = false,
    baseUri = 'http://example.org/doc#'
  } = options

  const quads = []
  let nodeCounter = 0
  const nodeMap = new WeakMap()

  function getSubject(node) {
    if (nodeMap.has(node)) {
      return nodeMap.get(node)
    }

    const subject = useNamedNodes
      ? rdf.namedNode(`${baseUri}node-${nodeCounter++}`)
      : rdf.blankNode()

    nodeMap.set(node, subject)
    return subject
  }

  function processNode(node) {
    const subject = getSubject(node)

    // Add type
    quads.push(rdf.quad(
      subject,
      rdf.namedNode(ns.rdf.type),
      rdf.namedNode(ns.rmk(node.type))
    ))

    // Process all properties
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type') continue

      // Handle position object
      if (key === 'position' && value && typeof value === 'object') {
        const posSubject = getSubject(value)

        quads.push(rdf.quad(
          subject,
          rdf.namedNode(ns.fxr(key)),
          posSubject
        ))

        // Position start
        if (value.start) {
          const startSubject = getSubject(value.start)
          quads.push(rdf.quad(posSubject, rdf.namedNode(ns.fxr('start')), startSubject))

          if (value.start.line !== undefined) {
            quads.push(rdf.quad(startSubject, rdf.namedNode(ns.fxr('line')),
              rdf.literal(String(value.start.line), rdf.namedNode(ns.xsd('integer')))))
          }
          if (value.start.column !== undefined) {
            quads.push(rdf.quad(startSubject, rdf.namedNode(ns.fxr('column')),
              rdf.literal(String(value.start.column), rdf.namedNode(ns.xsd('integer')))))
          }
          if (value.start.offset !== undefined) {
            quads.push(rdf.quad(startSubject, rdf.namedNode(ns.fxr('offset')),
              rdf.literal(String(value.start.offset), rdf.namedNode(ns.xsd('integer')))))
          }
        }

        // Position end
        if (value.end) {
          const endSubject = getSubject(value.end)
          quads.push(rdf.quad(posSubject, rdf.namedNode(ns.fxr('end')), endSubject))

          if (value.end.line !== undefined) {
            quads.push(rdf.quad(endSubject, rdf.namedNode(ns.fxr('line')),
              rdf.literal(String(value.end.line), rdf.namedNode(ns.xsd('integer')))))
          }
          if (value.end.column !== undefined) {
            quads.push(rdf.quad(endSubject, rdf.namedNode(ns.fxr('column')),
              rdf.literal(String(value.end.column), rdf.namedNode(ns.xsd('integer')))))
          }
          if (value.end.offset !== undefined) {
            quads.push(rdf.quad(endSubject, rdf.namedNode(ns.fxr('offset')),
              rdf.literal(String(value.end.offset), rdf.namedNode(ns.xsd('integer')))))
          }
        }
        continue
      }

      // Handle arrays (children, align, etc.)
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && item.type) {
            // It's a child node
            const childSubject = processNode(item)
            quads.push(rdf.quad(
              subject,
              rdf.namedNode(ns.fxr(key)),
              childSubject
            ))
          } else {
            // It's a simple value (e.g., align array)
            quads.push(rdf.quad(
              subject,
              rdf.namedNode(ns.fxr(key)),
              rdf.literal(String(item))
            ))
          }
        }
        continue
      }

      // Handle simple values
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        quads.push(rdf.quad(
          subject,
          rdf.namedNode(ns.fxr(key)),
          rdf.literal(String(value))
        ))
      }
    }

    return subject
  }

  processNode(ast)
  return quads
}

/**
 * Converts markdown to RDF using remark parser.
 *
 * @param {string} markdown - The markdown text
 * @param {Object} options - Configuration options
 * @returns {Array} Array of RDF quads
 */
export function markdownToRdf(markdown, options = {}) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)

  const ast = processor.parse(markdown)
  return astToRdf(ast, options)
}

export { markdownToRdf as default }