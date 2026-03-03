import { excelToRdf } from '../src/excel-facade.js'
import { printQuads } from '../src/serialize-utils.js'

/**
 * CLI runner for excel-facade.
 *
 * Usage:
 *   node test/excel-example.js path/to/file.xlsx [--named-nodes]
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node test/excel-example.js <file.xlsx> [--named-nodes]')
    process.exit(1)
  }

  const filePath = args[0]
  const useNamedNodes = args.includes('--named-nodes')

  try {
    const quads = await excelToRdf(filePath, { useNamedNodes })
    console.error(`Total quads: ${quads.length}`)
    await printQuads(quads)
  } catch (error) {
    console.error('Error processing file:', error.message)
    process.exit(1)
  }
}
