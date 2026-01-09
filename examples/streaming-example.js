import { createMarkdownToRdfStream, markdownToRdf } from '../src/stream-markdown-to-rdf.js'
import { createReadStream } from 'fs'
import { Writable } from 'readable-stream'
import rdf from 'rdf-ext'
import { ns } from '../src/namespaces.js'

// Example 1: Using the convenience function
async function example1() {
  console.log('\n=== Example 1: Convenience Function ===\n')

  const markdown = `
# Document Title

This is a paragraph with **bold** and *italic* text.

## Section 1

A list:
- Item 1
- Item 2
- Item 3

## Section 2

A [link](http://example.com) and some \`inline code\`.
`

  const quads = await markdownToRdf(markdown)

  console.log(`Generated ${quads.length} RDF quads`)
  console.log('\nFirst 10 quads:')
  quads.slice(0, 10).forEach(quad => {
    console.log(`  ${quad.subject.value} -> ${quad.predicate.value} -> ${quad.object.value}`)
  })
}

// Example 2: Using the streaming API
async function example2() {
  console.log('\n\n=== Example 2: Streaming API ===\n')

  const markdown = '# Streaming Test\n\nThis demonstrates streaming markdown to RDF.'

  return new Promise((resolve, reject) => {
    const quads = []
    const stream = createMarkdownToRdfStream()

    stream.on('data', (quad) => {
      quads.push(quad)
    })

    stream.on('end', () => {
      console.log(`Generated ${quads.length} quads via streaming`)

      // Show the types of nodes created
      const types = new Set()
      quads.forEach(q => {
        if (q.predicate.equals(rdf.namedNode(ns.rdf.type))) {
          types.add(q.object.value)
        }
      })

      console.log('\nNode types found:')
      types.forEach(type => console.log(`  - ${type}`))

      resolve()
    })

    stream.on('error', reject)

    // Write markdown in chunks to simulate streaming
    const chunks = markdown.match(/.{1,15}/g) || []
    chunks.forEach(chunk => stream.write(chunk))
    stream.end()
  })
}

// Example 3: Using named nodes instead of blank nodes
async function example3() {
  console.log('\n\n=== Example 3: Using Named Nodes ===\n')

  const markdown = '# Test\n\nNamed node example.'

  const quads = await markdownToRdf(markdown, {
    useNamedNodes: true,
    baseUri: 'http://example.org/markdown#'
  })

  console.log(`Generated ${quads.length} quads with named nodes`)
  console.log('\nSample quads (showing named node URIs):')
  quads.slice(0, 5).forEach(quad => {
    console.log(`  ${quad.subject.value}`)
    console.log(`    ${quad.predicate.value}`)
    console.log(`    ${quad.object.value}\n`)
  })
}

// Example 4: Piping from a file (if you have a markdown file)
async function example4() {
  console.log('\n\n=== Example 4: Processing from Memory ===\n')

  const markdown = `
# My Document

## Introduction

This is an example of processing markdown.

### Features

- Headings
- Lists
- **Bold** and *italic*
- [Links](https://example.com)
`

  return new Promise((resolve, reject) => {
    let quadCount = 0
    const stream = createMarkdownToRdfStream()

    const counter = new Writable({
      objectMode: true,
      write(quad, encoding, callback) {
        quadCount++
        callback()
      }
    })

    counter.on('finish', () => {
      console.log(`Processed ${quadCount} quads from markdown`)
      resolve()
    })

    counter.on('error', reject)

    stream.pipe(counter)
    stream.write(markdown)
    stream.end()
  })
}

// Example 5: Analyzing the RDF structure
async function example5() {
  console.log('\n\n=== Example 5: Analyzing RDF Structure ===\n')

  const markdown = `
# Parent Heading

## Child 1

Paragraph under child 1.

## Child 2

Paragraph under child 2.
`

  const quads = await markdownToRdf(markdown)

  // Count quads by predicate type
  const predicateCounts = {}
  quads.forEach(quad => {
    const pred = quad.predicate.value
    predicateCounts[pred] = (predicateCounts[pred] || 0) + 1
  })

  console.log('Quad counts by predicate:')
  Object.entries(predicateCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pred, count]) => {
      const shortPred = pred.split(/[#/]/).pop()
      console.log(`  ${shortPred}: ${count}`)
    })

  // Look for container membership properties (parent-child relationships)
  const containerProps = quads.filter(q =>
    q.predicate.value.match(/_\d+$/)
  )

  console.log(`\nFound ${containerProps.length} parent-child relationships`)
}

// Run all examples
async function main() {
  try {
    await example1()
    await example2()
    await example3()
    await example4()
    await example5()
    console.log('\n✓ All examples completed successfully\n')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

main()