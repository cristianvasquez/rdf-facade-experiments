// main.js
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import remarkToRdf from './src/remark-to-rdf.js'
import rdfStringify from './src/rdf-stringify.js'

const vFile = await unified()
.use(remarkParse)
.use(remarkToRdf)
.use(rdfStringify)
.process('# Hello world!\n\nSome text with **bold**.')

const quads = vFile.data.quads
const turtle = await vFile.result
console.log(turtle)
