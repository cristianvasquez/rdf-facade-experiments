// rdf-stringify.js
import SerializerTurtle from '@rdfjs/serializer-turtle'
import { Readable } from 'stream'
import { ns } from './namespaces.js'

function toPlain (prefixes) {
  const result = []
  for (const [key, value] of Object.entries({ ...prefixes })) {
    result.push([key, value()])
  }
  return result
}

export default function rdfStringify (options = {}) {
  const prefixes = options.prefixes ?? toPlain(ns)

  // Set the compiler
  this.compiler = compiler

  function compiler (tree, file) {
    const quads = file.data.quads || []
    const serializer = new SerializerTurtle({ prefixes })

    // Create a proper iterable stream from the quads array
    const input = Readable.from(Array.from(quads))
    const output = serializer.import(input)

    // Return a promise - unified handles async compilers
    return new Promise((resolve, reject) => {
      let result = ''
      output.on('data', chunk => { result += chunk })
      output.on('end', () => resolve(result))
      output.on('error', reject)
    })
  }
}
