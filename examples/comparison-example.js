import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkToRdf from '../src/remark-to-rdf.js'
import { markdownToRdf, createMarkdownToRdfStream } from '../src/stream-markdown-to-rdf.js'
import { performance } from 'perf_hooks'

const testMarkdown = `
# Main Title

This is a paragraph with **bold** and *italic* text.

## Section 1

A list:
- Item 1
- Item 2
- Item 3

### Subsection 1.1

Some [link](https://example.com) and \`code\`.

## Section 2

Another paragraph here.

### Subsection 2.1

- Nested
  - List
    - Items
`

// Approach 1: Original remark-based (non-streaming)
async function remarkApproach() {
  const start = performance.now()

  const processor = unified()
    .use(remarkParse)
    .use(remarkToRdf)

  const tree = processor.parse(testMarkdown)
  const file = processor.runSync(tree, { path: 'test.md' })

  const quads = file.data.quads
  const duration = performance.now() - start

  return { quads, duration, approach: 'Remark (AST-based)' }
}

// Approach 2: New streaming approach
async function streamingApproach() {
  const start = performance.now()

  const quads = await markdownToRdf(testMarkdown)
  const duration = performance.now() - start

  return { quads, duration, approach: 'Stream Markdown Parser' }
}

// Compare both approaches
async function compare() {
  console.log('=== Comparing Markdown to RDF Approaches ===\n')
  console.log(`Input markdown: ${testMarkdown.length} characters\n`)

  // Run both approaches
  const remarkResult = await remarkApproach()
  const streamResult = await streamingApproach()

  // Compare results
  console.log('Results:')
  console.log(`  ${remarkResult.approach}:`)
  console.log(`    - Generated ${remarkResult.quads.length} quads`)
  console.log(`    - Duration: ${remarkResult.duration.toFixed(2)}ms\n`)

  console.log(`  ${streamResult.approach}:`)
  console.log(`    - Generated ${streamResult.quads.length} quads`)
  console.log(`    - Duration: ${streamResult.duration.toFixed(2)}ms\n`)

  // Analyze types
  function getNodeTypes(quads) {
    const types = new Set()
    quads.forEach(q => {
      if (q.predicate.value.includes('type')) {
        types.add(q.object.value.split(/[#/]/).pop())
      }
    })
    return Array.from(types).sort()
  }

  const remarkTypes = getNodeTypes(remarkResult.quads)
  const streamTypes = getNodeTypes(streamResult.quads)

  console.log('Node types generated:')
  console.log(`  Remark: ${remarkTypes.join(', ')}`)
  console.log(`  Stream: ${streamTypes.join(', ')}\n`)

  // Compare predicates used
  function getPredicates(quads) {
    const preds = new Set()
    quads.forEach(q => {
      const shortPred = q.predicate.value.split(/[#/]/).pop()
      preds.add(shortPred)
    })
    return Array.from(preds).sort()
  }

  const remarkPreds = getPredicates(remarkResult.quads)
  const streamPreds = getPredicates(streamResult.quads)

  console.log('Predicates used:')
  console.log(`  Remark: ${remarkPreds.join(', ')}`)
  console.log(`  Stream: ${streamPreds.join(', ')}\n`)

  // Key differences
  console.log('Key Differences:')
  console.log('  Remark approach:')
  console.log('    + Includes position data (line/column/offset)')
  console.log('    + Uses unified/remark ecosystem')
  console.log('    + Full AST parsing before processing')
  console.log('    - Requires complete markdown in memory')
  console.log('    - More dependencies\n')

  console.log('  Stream approach:')
  console.log('    + Can process markdown incrementally')
  console.log('    + Lighter dependency footprint')
  console.log('    + Progressive parsing support')
  console.log('    + Simpler API (native Node.js streams)')
  console.log('    - No position data (by default)')
  console.log('    - Different node structure\n')

  // Streaming demonstration
  console.log('=== Demonstrating True Streaming ===\n')

  const chunkSize = 20
  const chunks = testMarkdown.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || []

  console.log(`Processing ${testMarkdown.length} characters in ${chunks.length} chunks of ~${chunkSize} chars each`)

  return new Promise((resolve) => {
    let quadCount = 0
    const stream = createMarkdownToRdfStream()

    stream.on('data', (quad) => {
      quadCount++
    })

    stream.on('end', () => {
      console.log(`✓ Successfully processed ${quadCount} quads via streaming\n`)
      resolve()
    })

    // Simulate streaming by writing chunks with delays
    let i = 0
    const writeNext = () => {
      if (i < chunks.length) {
        stream.write(chunks[i])
        i++
        setTimeout(writeNext, 5) // Small delay to simulate async data arrival
      } else {
        stream.end()
      }
    }
    writeNext()
  })
}

compare().catch(console.error)