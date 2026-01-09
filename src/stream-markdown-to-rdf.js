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
 * @returns {Transform} A Transform stream that outputs RDF quads
 */
export function createMarkdownToRdfStream(options = {}) {
  const { useNamedNodes = false, baseUri = 'http://example.org/doc#' } = options

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
   * Processes a parsed node and its children recursively, emitting quads
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
    }

    // Add node properties as literals
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'children' || key === 'items' || key === 'raw' || key === 'loading') {
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

    // Process children
    if (node.children && Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        yield* processNode(node.children[i], subject, i)
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

        // Process each top-level node and emit quads
        for (let i = 0; i < nodes.length; i++) {
          for (const quad of processNode(nodes[i], null, null)) {
            this.push(quad)
          }
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
