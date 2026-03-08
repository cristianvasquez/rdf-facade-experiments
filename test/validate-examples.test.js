import { describe, it } from 'mocha'
import assert from 'assert'
import { Parser } from 'n3'
import { processExample } from './process-example.js'
import { compareSnapshot, shouldUpdateSnapshots } from './snapshot-helper.js'

const EXAMPLES = [
  '01-services-n3',
  '02-team-alpha-emphasis',
  '03-entities-explicit',
  '04-nested-lists',
  '05-tables',
]

const UPDATE_SNAPSHOTS = shouldUpdateSnapshots()

/**
 * Parse a Turtle string into RDFJS quads using n3 Parser.
 * Used to convert n3rulesOutput (Turtle text) into a comparable quad array.
 */
function parseTurtle (turtle) {
  const parser = new Parser()
  return parser.parse(turtle)
}

describe('Example Validation (Snapshot-based)', () => {
  for (const exampleName of EXAMPLES) {
    describe(`Example: ${exampleName}`, () => {
      it('should match facade RDF snapshot', async () => {
        const examplePath = `playground/examples/${exampleName}/example.md`
        const snapshotPath = `test/snapshots/${exampleName}/facade.ttl`

        const result = await processExample(examplePath, {
          executeConstruct: false,
          verbose: false,
          showFacade: false
        })

        assert.ok(result.facadeQuads, 'Should generate facade quads')
        assert.ok(result.facadeQuads.length > 0, 'Facade should have quads')

        const comparison = await compareSnapshot(
          result.facadeQuads,
          snapshotPath,
          UPDATE_SNAPSHOTS
        )

        if (comparison.created) {
          console.log(`      ✓ Created snapshot: ${snapshotPath}`)
        }

        if (!comparison.match) {
          console.log('\n      Expected:')
          console.log('      ' + comparison.expected.split('\n').join('\n      '))
          console.log('\n      Actual:')
          console.log('      ' + comparison.actual.split('\n').join('\n      '))
        }

        assert.ok(
          comparison.match,
          `Facade RDF does not match snapshot. Run with UPDATE_SNAPSHOTS=true to update.`
        )
      })

      it('should match result RDF snapshot', async () => {
        const examplePath = `playground/examples/${exampleName}/example.md`
        const snapshotPath = `test/snapshots/${exampleName}/result.ttl`

        const result = await processExample(examplePath, {
          executeConstruct: true,
          verbose: false,
          showFacade: false,
          showConstruct: false
        })

        // N3 rules examples return n3rulesOutput (Turtle string); SPARQL examples return semanticQuads
        const resultQuads = result.semanticQuads
          ? result.semanticQuads
          : parseTurtle(result.n3rulesOutput || '')

        assert.ok(resultQuads, 'Should generate result quads')
        assert.ok(resultQuads.length > 0, 'Result RDF should have quads')

        const comparison = await compareSnapshot(
          resultQuads,
          snapshotPath,
          UPDATE_SNAPSHOTS
        )

        if (comparison.created) {
          console.log(`      ✓ Created snapshot: ${snapshotPath}`)
        }

        if (!comparison.match) {
          console.log('\n      Expected:')
          console.log('      ' + comparison.expected.split('\n').join('\n      '))
          console.log('\n      Actual:')
          console.log('      ' + comparison.actual.split('\n').join('\n      '))
        }

        assert.ok(
          comparison.match,
          `Result RDF does not match snapshot. Run with UPDATE_SNAPSHOTS=true to update.`
        )
      })
    })
  }
})
