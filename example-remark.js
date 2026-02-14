// Remark Facade example - direct AST with position info, tables, frontmatter
import SerializerTurtle from '@rdfjs/serializer-turtle'
import { Readable } from 'readable-stream'
import { nsArray } from './src/namespaces.js'
import { markdownToRdf } from './src/remark-facade.js'

const markdown = `---
title: Test Document
author: John Doe
---

# Document Title

This is a paragraph with **bold** and *italic* text.

## Section with Table

| Name | Age | City |
|------|-----|------|
| Alice | 30 | NYC |
| Bob | 25 | LA |

## Code Section

\`\`\`javascript
function hello() {
  console.log('world')
}
\`\`\`

A [link](http://example.com) and some \`inline code\`.
`

// Convert markdown to RDF quads using remark facade
const quads = markdownToRdf(markdown, {
  useNamedNodes: false
})

// Serialize to Turtle
const serializer = new SerializerTurtle({ prefixes: nsArray })
const input = Readable.from(quads)
const output = serializer.import(input)

output.pipe(process.stdout)