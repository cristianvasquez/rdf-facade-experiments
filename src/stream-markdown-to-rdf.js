import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import { getMarkdown, parseMarkdownToStructure } from 'stream-markdown-parser'
import { ns } from './namespaces.js'

/**
 * Creates a Transform stream that converts markdown to RDF quads in a streaming fashion.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.useNamedNodes - If true, uses named nodes with URIs instead of blank nodes
 * @param {string} options.baseUri - Base URI for generating named node URIs (required if useNamedNodes is true)
 * @param {boolean} options.useRdfsMember - If true, emits rdfs:member in addition to rdf:_N predicates
 * @returns {Transform} A Transform stream that outputs RDF quads
 */
export function createMarkdownToRdfStream(options = {}) {
  const {
    useNamedNodes = false,
    baseUri = 'http://example.org/doc#',
    useRdfsMember = false
  } = options

  let buffer = ''
  let nodeCounter = 0
  const md = getMarkdown()

  /**
   * Creates a subject node (either blank node or named node)
   */
  function createSubject() {
    if (useNamedNodes) {
      return rdf.namedNode(`${baseUri}node-${nodeCounter++}`)
    }
    return rdf.blankNode()
  }

  /**
   * Capitalizes the first letter of a string
   */
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  /**
   * Builds a hierarchical tree based on heading levels
   */
  function buildHierarchy(nodes) {
    const root = { type: 'document', children: [] }
    const stack = [{ node: root, level: 0 }]

    for (const node of nodes) {
      if (node.type === 'heading') {
        const level = parseInt(node.level || 1)

        // Pop stack until we find the parent level
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }

        // Create section for this heading
        const section = {
          type: 'section',
          heading: node,
          content: []
        }

        // Add to parent's children
        const parent = stack[stack.length - 1].node
        if (!parent.children) parent.children = []
        parent.children.push(section)

        // Push this section onto stack
        stack.push({ node: section, level })
      } else {
        // Add content to current section
        const current = stack[stack.length - 1].node
        if (!current.content) current.content = []
        current.content.push(node)
      }
    }

    return root
  }

  /**
   * Processes a node and its children recursively, emitting quads
   */
  function* processNode(node, parent = null, index = null) {
    const subject = createSubject()

    // Add rdf:type
    yield rdf.quad(
      subject,
      rdf.namedNode(ns.rdf.type),
      rdf.namedNode(ns.md(capitalize(node.type)))
    )

    // Link from parent using rdf:_N (1-indexed container property)
    if (parent !== null && index !== null) {
      yield rdf.quad(
        parent,
        rdf.namedNode(ns.rdf(`_${index + 1}`)),
        subject
      )

      // Also emit rdfs:member if requested
      if (useRdfsMember) {
        yield rdf.quad(
          parent,
          rdf.namedNode(ns.rdfs('member')),
          subject
        )
      }
    }

    // Add node properties as literals (skip structural properties)
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'children' || key === 'items' ||
          key === 'heading' || key === 'content' || key === 'raw' ||
          key === 'loading' || key === 'level') {  // Skip level - it's implicit in hierarchy
        continue
      }

      // Handle different value types
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        yield rdf.quad(
          subject,
          rdf.namedNode(ns.fx(key)),
          rdf.literal(String(value))
        )
      }
    }

    // Add raw content if available
    if (node.raw) {
      yield rdf.quad(
        subject,
        rdf.namedNode(ns.fx('raw')),
        rdf.literal(node.raw)
      )
    }

    // Process heading (for sections)
    if (node.heading) {
      yield* processNode(node.heading, subject, 0)
    }

    // Process content (for sections)
    if (node.content && Array.isArray(node.content)) {
      for (let i = 0; i < node.content.length; i++) {
        yield* processNode(node.content[i], subject, i + (node.heading ? 1 : 0))
      }
    }

    // Process children
    if (node.children && Array.isArray(node.children)) {
      const startIdx = (node.heading ? 1 : 0) + (node.content ? node.content.length : 0)
      for (let i = 0; i < node.children.length; i++) {
        yield* processNode(node.children[i], subject, startIdx + i)
      }
    }

    // Process list items
    if (node.items && Array.isArray(node.items)) {
      for (let i = 0; i < node.items.length; i++) {
        yield* processNode(node.items[i], subject, i)
      }
    }

    return subject
  }

  return new Transform({
    objectMode: true,
    transform (chunk, encoding, callback) {
      // Accumulate chunks
      buffer += chunk.toString()
      callback()
    },
    flush (callback) {
      try {
        // Parse the complete markdown when stream ends
        const nodes = parseMarkdownToStructure(buffer, md, { final: true })

        // Build hierarchical tree based on heading levels
        const tree = buildHierarchy(nodes)

        // Process the tree and emit quads
        for (const quad of processNode(tree)) {
          this.push(quad)
        }

        callback()
      } catch (error) {
        callback(error)
      }
    }
  })
}

/**
 * Convenience function to process markdown string and collect all quads
 *
 * @param {string} markdown - The markdown text to process
 * @param {Object} options - Configuration options (passed to createMarkdownToRdfStream)
 * @returns {Promise<Array>} Promise that resolves to array of RDF quads
 */
export async function markdownToRdf(markdown, options = {}) {
  return new Promise((resolve, reject) => {
    const quads = []
    const stream = createMarkdownToRdfStream(options)

    stream.on('data', (quad) => {
      quads.push(quad)
    })

    stream.on('end', () => {
      resolve(quads)
    })

    stream.on('error', reject)

    // Write the markdown and close the stream
    stream.write(markdown)
    stream.end()
  })
}

export { createMarkdownToRdfStream as default }
