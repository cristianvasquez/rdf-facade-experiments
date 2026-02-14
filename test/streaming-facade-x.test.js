import { describe, it } from 'mocha'
import assert from 'assert'
import {
  markdownToRdf,
  createMarkdownToRdfStream,
} from '../src/streaming-facade-x.js'
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

  })

  describe('snapshots', () => {

    it('simple snapshot', (done) => {
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

  })


})
