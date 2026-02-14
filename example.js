// Facade-X example - hierarchical structure with numbered predicates
import SerializerTurtle from '@rdfjs/serializer-turtle'
import { nsArray } from './src/namespaces.js'
import { createMarkdownToRdfStream } from './src/streaming-facade-x.js'

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

const serializer = new SerializerTurtle({ prefixes: nsArray })
const quadStream = createMarkdownToRdfStream()
const output = serializer.import(quadStream)
output.pipe(process.stdout)
quadStream.write(markdown)
quadStream.end()
