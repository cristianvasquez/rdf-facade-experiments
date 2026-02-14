import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { printQuads } from '../src/serialize-utils.js'
import SerializerTurtle from '@rdfjs/serializer-turtle'
import { nsArray } from '../src/namespaces.js'
import { Readable } from 'readable-stream'

/**
 * Serialize quads to Turtle format (without console output)
 */
async function quadsToTurtle(quads) {
  const serializer = new SerializerTurtle({ prefixes: nsArray })
  const quadStream = Readable.from(quads)
  const output = serializer.import(quadStream)

  return new Promise((resolve, reject) => {
    let result = ''
    output.on('data', (chunk) => {
      result += chunk.toString()
    })
    output.on('end', () => resolve(result))
    output.on('error', reject)
  })
}

/**
 * Save a snapshot to disk
 */
export function saveSnapshot(snapshotPath, content) {
  const dir = dirname(snapshotPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(snapshotPath, content, 'utf-8')
}

/**
 * Load a snapshot from disk
 */
export function loadSnapshot(snapshotPath) {
  if (!existsSync(snapshotPath)) {
    return null
  }
  return readFileSync(snapshotPath, 'utf-8')
}

/**
 * Compare quads against a snapshot
 * Returns { match: boolean, actual: string, expected: string }
 */
export async function compareSnapshot(quads, snapshotPath, updateSnapshots = false) {
  const actual = await quadsToTurtle(quads)

  if (updateSnapshots) {
    saveSnapshot(snapshotPath, actual)
    return { match: true, actual, expected: actual }
  }

  const expected = loadSnapshot(snapshotPath)

  if (expected === null) {
    // Snapshot doesn't exist - save it
    saveSnapshot(snapshotPath, actual)
    return { match: true, actual, expected: actual, created: true }
  }

  // Normalize whitespace for comparison
  const normalizeWhitespace = (str) => str.trim().replace(/\s+/g, ' ')
  const match = normalizeWhitespace(actual) === normalizeWhitespace(expected)

  return { match, actual, expected }
}

/**
 * Check if we're in update snapshot mode
 */
export function shouldUpdateSnapshots() {
  return process.env.UPDATE_SNAPSHOTS === 'true' ||
         process.argv.includes('--update-snapshots')
}
