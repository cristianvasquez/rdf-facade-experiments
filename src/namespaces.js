import rdf from 'rdf-ext'

const ns = {
  rdf: rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  rdfs: rdf.namespace('http://www.w3.org/2000/01/rdf-schema#'),
  xsd: rdf.namespace('http://www.w3.org/2001/XMLSchema#'),

  // Facade-X (streaming parser)
  fx: rdf.namespace('http://sparql.xyz/facade-x/ns/'),
  md: rdf.namespace('http://example.org/markdown#'),
  xyz: rdf.namespace('http://sparql.xyz/facade-x/data/'),

  // Remark Facade (remark parser)
  fxr: rdf.namespace('http://example.org/facade-remark#'),
  rmk: rdf.namespace('http://example.org/remark#'),

  // Excel Facade
  xls: rdf.namespace('http://example.org/excel#'),

  ex: rdf.namespace('http://example.org/'),
  data: rdf.namespace('http://example.org/data#'),
  foaf: rdf.namespace('http://xmlns.com/foaf/0.1/'),
  dct: rdf.namespace('http://purl.org/dc/terms/'),

}

function toPlain (prefixes) {
  const result = []
  for (const [key, value] of Object.entries({ ...prefixes })) {
    result.push([key, value()])
  }
  return result
}

const nsArray = toPlain(ns)

export { ns, nsArray }
