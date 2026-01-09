import { describe, it } from 'mocha'
import assert from 'assert'
import {
  markdownToRdf,
  createMarkdownToRdfStream,
} from '../src/stream-markdown-to-rdf.js'
import { Readable } from 'readable-stream'
import rdf from 'rdf-ext'
import { ns } from '../src/namespaces.js'

describe('stream-markdown-to-rdf', () => {
  describe('markdownToRdf (convenience function)', () => {
    it('should convert simple markdown to RDF quads', async () => {
      const markdown = '# Hello World\n\nThis is a test.'
      const quads = await markdownToRdf(markdown)

      assert.ok(Array.isArray(quads), 'Should return an array of quads')
      assert.ok(quads.length > 0, 'Should generate at least one quad')

      // Check that we have some heading-related quads
      const headingQuads = quads.filter(q =>
        q.object.equals(rdf.namedNode(ns.md('Heading'))),
      )
      assert.ok(headingQuads.length > 0, 'Should have heading quads')
    })

    it('should handle empty markdown', async () => {
      const markdown = ''
      const quads = await markdownToRdf(markdown)

      assert.ok(Array.isArray(quads), 'Should return an array')
      // Empty markdown might still generate a root node, or be empty
      assert.ok(quads.length >= 0, 'Should handle empty input')
    })

    it('should handle markdown with links', async () => {
      const markdown = '[Example](https://example.com "Example Site")'
      const quads = await markdownToRdf(markdown)

      assert.ok(quads.length > 0, 'Should generate quads')

      // Check for href property
      const hrefQuads = quads.filter(q =>
        q.predicate.equals(rdf.namedNode(ns.fx('href'))) &&
        q.object.value === 'https://example.com',
      )
      assert.ok(hrefQuads.length > 0, 'Should have href property')

      // Check for title property
      const titleQuads = quads.filter(q =>
        q.predicate.equals(rdf.namedNode(ns.fx('title'))) &&
        q.object.value === 'Example Site',
      )
      assert.ok(titleQuads.length > 0, 'Should have title property')
    })

    it('should handle markdown with lists', async () => {
      const markdown = `
- Item 1
- Item 2
- Item 3
`
      const quads = await markdownToRdf(markdown)

      assert.ok(quads.length > 0, 'Should generate quads for list')

      // Check for list-related types
      const listQuads = quads.filter(q =>
        q.predicate.equals(rdf.namedNode(ns.rdf.type)) &&
        (q.object.value.includes('List') ||
          q.object.value.includes('Listitem')),
      )
      assert.ok(listQuads.length > 0, 'Should have list-related quads')
    })

    it('should use named nodes when requested', async () => {
      const markdown = '# Test'
      const quads = await markdownToRdf(markdown, {
        useNamedNodes: true,
        baseUri: 'http://test.org/doc#',
      })

      assert.ok(quads.length > 0, 'Should generate quads')

      // Check that some subjects are named nodes with our base URI
      const namedNodeSubjects = quads.filter(q =>
        q.subject.termType === 'NamedNode' &&
        q.subject.value.startsWith('http://test.org/doc#'),
      )
      assert.ok(namedNodeSubjects.length > 0, 'Should have named node subjects')
    })
  })

  describe('createMarkdownToRdfStream (streaming)', () => {

    it('should handle piping from a readable stream', (done) => {
      const markdown = '# Piped Stream\n\nTesting pipes.'
      const quads = []

      const stream = createMarkdownToRdfStream()

      stream.on('data', (quad) => {
        quads.push(quad)
      })

      stream.on('end', () => {
        assert.ok(quads.length > 0, 'Should generate quads from piped input')
        done()
      })

      stream.on('error', done)

      // Create a readable stream with the markdown
      const readable = Readable.from([markdown])
      readable.pipe(stream)
    })

    it('should preserve parent-child relationships with rdf:_N properties',
      async () => {
        const markdown = `
# Parent

## Child 1

## Child 2
`
        const quads = await markdownToRdf(markdown)

        // Look for container membership properties (rdf:_1, rdf:_2, etc.)
        const containerProps = quads.filter(q =>
          q.predicate.value.match(
            /http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#_\d+/),
        )

        assert.ok(containerProps.length > 0,
          'Should have container membership properties')
      })

    it('should handle complex nested structures', async () => {
      const markdown = `
# Document Title

This is a paragraph with **bold** and *italic* text.

## Section 1

A list:
- Item 1
- Item 2
  - Nested item

## Section 2

A [link](http://example.com) and some \`code\`.
`
      const quads = await markdownToRdf(markdown)

      assert.ok(quads.length > 0, 'Should handle complex markdown')

      // Verify we have different types of nodes
      const types = new Set()
      quads.forEach(q => {
        if (q.predicate.equals(rdf.namedNode(ns.rdf.type))) {
          types.add(q.object.value)
        }
      })

      assert.ok(types.size > 5, 'Should have multiple different node types')
    })
  })

})
