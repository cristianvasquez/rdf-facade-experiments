import SerializerTurtle from '@rdfjs/serializer-turtle'
import { nsArray } from './namespaces.js'
import { Readable } from 'readable-stream'

/**
 * Print quads in Turtle format to console
 * @param {Array} quads - Array of RDF quads
 */
export async function printQuads(quads) {
  const serializer = new SerializerTurtle({ prefixes: nsArray })

  // Create a readable stream from the quads array
  const quadStream = Readable.from(quads)

  // Serialize to turtle
  const output = serializer.import(quadStream)

  return new Promise((resolve, reject) => {
    let result = ''

    output.on('data', (chunk) => {
      result += chunk.toString()
    })

    output.on('end', () => {
      console.log(result)
      resolve(result)
    })

    output.on('error', reject)
  })
}
