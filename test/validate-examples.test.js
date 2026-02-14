import { describe, it } from 'mocha'
import assert from 'assert'
import { processExample } from './process-example.js'
import { compareSnapshot, shouldUpdateSnapshots } from './snapshot-helper.js'

const EXAMPLES = [
  '01-team-alpha-emphasis',
  '02-entities-explicit',
  '03-nested-lists',
]

const UPDATE_SNAPSHOTS = shouldUpdateSnapshots()

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

        assert.ok(result.semanticQuads, 'Should generate semantic quads')
        assert.ok(result.semanticQuads.length > 0, 'Semantic RDF should have quads')

        const comparison = await compareSnapshot(
          result.semanticQuads,
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
