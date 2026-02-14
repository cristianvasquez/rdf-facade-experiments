import { readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { markdownToRdf as facadeXToRdf } from '../src/streaming-facade-x.js'
import { markdownToRdf as remarkToRdf } from '../src/remark-facade.js'
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite'
import { Store } from 'n3'
import { printQuads } from '../src/serialize-utils.js'

/**
 * Extract frontmatter from markdown
 */
function extractFrontmatter(markdown) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = markdown.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: null, content: markdown }
  }

  const frontmatter = parseYaml(match[1])
  const content = match[2]

  return { frontmatter, content }
}

/**
 * Process a markdown example file
 */
export async function processExample(filePath, options = {}) {
  const {
    showFacade = false,
    showConstruct = false,
    executeConstruct = true,
    verbose = false
  } = options

  // Read markdown file
  const markdown = readFileSync(filePath, 'utf-8')

  // Extract frontmatter and content
  const { frontmatter, content } = extractFrontmatter(markdown)

  if (verbose) {
    console.log('=== MARKDOWN CONTENT ===')
    console.log(content)
    console.log()
  }

  // Determine which facade to use
  const facade = frontmatter?.facade || 'facade-x'

  // Generate facade RDF
  if (verbose) console.log(`Generating facade RDF using ${facade}...`)

  let facadeQuads
  if (facade === 'facade-remark') {
    facadeQuads = remarkToRdf(content)
  } else {
    // facade-x
    const preserveOrder = frontmatter?.['preserve-order'] ?? true
    const useRdfsMember = !preserveOrder  // preserve-order: false → useRdfsMember: true
    const useNumbered = preserveOrder     // preserve-order: true → useNumbered: true
    facadeQuads = await facadeXToRdf(content, { useRdfsMember, useNumbered })
  }

  if (showFacade || verbose) {
    console.log('\n=== FACADE RDF ===')
    console.log(`Total quads: ${facadeQuads.length}\n`)
    await printQuads(facadeQuads)
    console.log()
  }

  // Check for CONSTRUCT query
  if (!frontmatter || !frontmatter.construct) {
    console.log('No CONSTRUCT query found in frontmatter')
    return { facadeQuads }
  }

  const constructQuery = frontmatter.construct

  if (showConstruct || verbose) {
    console.log('=== CONSTRUCT QUERY ===')
    console.log(constructQuery)
    console.log()
  }

  // Execute CONSTRUCT
  if (!executeConstruct) {
    return { facadeQuads, constructQuery }
  }

  if (verbose) console.log('Executing CONSTRUCT query...')

  // Load facade into N3 store
  const store = new Store(facadeQuads)

  // Execute CONSTRUCT using Comunica
  const engine = new QueryEngine()

  try {
    const result = await engine.queryQuads(constructQuery, {
      sources: [store]
    })

    const semanticQuads = await result.toArray()

    console.log('\n=== SEMANTIC RDF (OUTPUT) ===')
    console.log(`Total quads: ${semanticQuads.length}\n`)
    await printQuads(semanticQuads)

    return { facadeQuads, constructQuery, semanticQuads }
  } catch (error) {
    console.error('\n=== ERROR EXECUTING CONSTRUCT ===')
    console.error(error.message)
    if (verbose) {
      console.error(error.stack)
    }
    throw error
  }
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: node test/process-example.js <example-file> [options]')
    console.log('')
    console.log('Options:')
    console.log('  --facade         Show facade RDF')
    console.log('  --construct      Show CONSTRUCT query')
    console.log('  --no-execute     Skip CONSTRUCT execution')
    console.log('  --verbose        Show all steps')
    console.log('')
    console.log('Examples:')
    console.log('  node test/process-example.js examples/01-team-alpha-emphasis/example.md')
    console.log('  node test/process-example.js examples/01-team-alpha-emphasis/example.md --facade')
    console.log('  node test/process-example.js examples/01-team-alpha-emphasis/example.md --verbose')
    process.exit(1)
  }

  const filePath = args[0]
  const options = {
    showFacade: args.includes('--facade'),
    showConstruct: args.includes('--construct'),
    executeConstruct: !args.includes('--no-execute'),
    verbose: args.includes('--verbose')
  }

  try {
    await processExample(filePath, options)
  } catch (error) {
    console.error('Error processing example:', error.message)
    process.exit(1)
  }
}
