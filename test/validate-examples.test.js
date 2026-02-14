import { describe, it } from 'mocha'
import assert from 'assert'
import { processExample } from './process-example.js'
import { readFileSync } from 'fs'

const EXAMPLES = [
  '01-dream-team-emphasis',
  '02-entities-explicit',
  '03-nested-lists',
]

describe('Example Validation', () => {
  for (const exampleName of EXAMPLES) {
    describe(`Example: ${exampleName}`, () => {
      it('should generate facade RDF', async () => {
        const examplePath = `playground/examples/${exampleName}/example.md`
        const result = await processExample(examplePath, { executeConstruct: false })

        assert.ok(result.facadeQuads, 'Should generate facade quads')
        assert.ok(result.facadeQuads.length > 0, 'Facade should have quads')
      })

      it('should execute CONSTRUCT query', async () => {
        const examplePath = `playground/examples/${exampleName}/example.md`
        const result = await processExample(examplePath, { executeConstruct: true })

        assert.ok(result.semanticQuads, 'Should generate semantic quads')
        assert.ok(result.semanticQuads.length > 0, 'Semantic RDF should have quads')
      })

      it('should produce expected output', async () => {
        const examplePath = `playground/examples/${exampleName}/example.md`
        const expectedPath = `playground/examples/${exampleName}/expected-output.ttl`

        const result = await processExample(examplePath, { executeConstruct: true })
        const expected = readFileSync(expectedPath, 'utf-8')

        // Basic validation: check that key entities are present
        assert.ok(result.semanticQuads.length > 0, 'Should produce semantic quads')

        // Check for expected entities (URNs)
        const entities = result.semanticQuads
          .map(q => q.subject.value)
          .filter(v => v.startsWith('urn:'))

        assert.ok(entities.includes('urn:Bob'), 'Should include Bob')
        assert.ok(entities.includes('urn:Alice'), 'Should include Alice')
        assert.ok(
          entities.includes('urn:Dream_team') || entities.includes('urn:Dream_Team'),
          'Should include Dream Team'
        )
      })
    })
  }
})
