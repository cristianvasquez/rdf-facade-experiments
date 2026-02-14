# RDF Facade Experiments

Experimental playground for **Markdown Facade** - converting markdown to RDF using explicit semantic mappings via SPARQL CONSTRUCT queries.

## Core Concept

1. **Markdown** → **AST** → **Facade RDF** (structural representation)
2. **SPARQL CONSTRUCT** (embedded in frontmatter) → **Semantic RDF**
3. Multiple markdown syntaxes can express the same semantics

## Quick Start

```bash
# Install dependencies
pnpm install

# Run tests (validates all examples)
pnpm test

# Process a specific example
node test/process-example.js examples/01-team-alpha-emphasis/example.md

# Show facade RDF
node test/process-example.js examples/01-team-alpha-emphasis/example.md --facade

# Show all steps
node test/process-example.js examples/01-team-alpha-emphasis/example.md --verbose
```

## Working Examples (4/6)

All examples produce the same semantic output from different markdown syntaxes:

```turtle
<urn:team-alpha> a :Team ;
  :hasMember <urn:Bob>, <urn:Alice> .

<urn:Bob> a foaf:Person ; foaf:knows <urn:Alice> .
<urn:Alice> a foaf:Person ; :likes <urn:Icecream> .
```

### ✅ Example 01: Headings + Emphasis

```markdown
# Dream team
## Bob
*knows* Alice
```

**Pattern:** Structural hierarchy (H1=Team, H2=Person), emphasis for relationships

### ✅ Example 02: Explicit Properties

```markdown
## Bob
*is a* Person

*knows* Alice
```

**Pattern:** Uniform property declarations with emphasis

### ✅ Example 03: Nested Lists

```markdown
## Dream team
- Bob
  - Knows
    - Alice
```

**Pattern:** Hierarchical lists for nested relationships

### ✅ Example 06: YAML Blocks

````markdown
```yaml
teams:
  - name: Team Alpha
    members: [Bob, Alice]
people:
  - name: Bob
    knows: [Alice]
```
````

**Pattern:** Structured data in code blocks (YAML/JSON)

### ❌ Not Working (Parser Limitations)

- **Example 04: Tables** - Parser doesn't extract table rows/cells
- **Example 05: Wikilinks** - Parser doesn't recognize `[[...]]` syntax

## Repository Structure

```
rdf-facade-experiments/
├── src/
│   ├── stream-markdown-to-rdf.js    # Core: Markdown → Facade RDF
│   └── namespaces.js                # RDF namespace definitions
├── test/
│   ├── process-example.js           # Example processor with CONSTRUCT
│   ├── validate-examples.test.js    # Automated validation tests
│   └── stream-markdown-to-rdf.test.js
├── examples/
│   ├── 01-team-alpha-emphasis/
│   ├── 02-entities-explicit/
│   ├── 03-nested-lists/
│   ├── 04-tables/                   # Not working
│   ├── 05-wikilinks/                # Not working
│   └── 06-yaml-blocks/
└── MARKDOWN_FACADE_INSIGHTS.md      # Design documentation
```

## How It Works

### 1. Facade Generation

The markdown AST is converted to RDF with hierarchical structure:

```javascript
import { markdownToRdf } from './src/stream-markdown-to-rdf.js'

const markdown = `# Dream team\n## Bob\n*knows* Alice`
const facadeQuads = await markdownToRdf(markdown)
```

**Facade vocabulary:**
- `md:Document`, `md:Section`, `md:Heading`, `md:Paragraph`
- `md:Emphasis`, `md:Text`, `md:List`, `md:List_item`
- `md:Code_block` (with `fx:data` for parsed YAML/JSON)
- Properties: `fx:text`, `fx:raw`, `fx:language`

### 2. CONSTRUCT Execution

SPARQL CONSTRUCT queries extract semantics from the facade:

```sparql
PREFIX md: <http://example.org/markdown#>
PREFIX fx: <http://sparql.xyz/facade-x/ns/>

CONSTRUCT {
  ?person foaf:knows ?other .
}
WHERE {
  ?section a md:Section ;
    rdf:_1 [ a md:Heading ; fx:text ?personName ] ;
    rdf:_2 [ a md:Paragraph ;
             rdf:_1 [ a md:Emphasis ; rdf:_1 [ fx:raw "knows" ] ] ;
             rdf:_2 [ a md:Text ; fx:raw ?otherName ] ] .
}
```

### 3. YAML/JSON Code Blocks

Code blocks with `language="yaml"` or `language="json"` are automatically parsed into Facade-X RDF:

```turtle
md:Code_block
  fx:language "yaml" ;
  fx:data [           # Parsed YAML structure
    xyz:teams [
      rdf:_1 [ xyz:name "Team Alpha" ; xyz:members [ rdf:_1 "Bob" ] ]
    ]
  ]
```

## Key Insights

1. **Facade = Structure** - Pure AST representation in RDF
2. **CONSTRUCT = Semantics** - Defines meaning through explicit queries
3. **Multiple Syntaxes** - Same semantics from different markdown patterns
4. **Extensible** - Add new vocabularies by writing CONSTRUCT queries
5. **Queryable** - The mapping itself is transparent and inspectable

## Design Decisions

### Hierarchical Facade (Not Flat)

The facade builds **sections** from heading levels:

```turtle
md:Document
  → md:Section (H1)
    → md:Heading + md:Section (H2)
      → md:Heading + md:Paragraph
```

This makes CONSTRUCT queries simpler and more intuitive.

### YAML/JSON in Facade

We **parse** structured code blocks into the facade rather than treating them as opaque text. This enables:
- Direct querying of nested data
- Consistent patterns across formats
- Reuse of SPARQL Anything approach

### No Level Property

Heading levels are **implicit** in nesting, not explicit in `fx:level` properties. The hierarchy itself encodes the structure.

## Testing

```bash
# Run all tests (16 tests)
pnpm test

# Tests validate:
# - Facade generation
# - CONSTRUCT execution
# - Expected output for each example
```

## Future Work

1. **Better markdown parser** - Support tables and wikilinks (remark.js)
2. **Bidirectional** - Generate markdown from semantic RDF
3. **Provenance** - Track RDF triples → markdown source lines
4. **More examples** - Inline links, prose, task lists
5. **Validation** - Strict comparison with expected-output.ttl

## Dependencies

- `stream-markdown-parser` - Markdown AST parser
- `n3` - RDF store
- `@comunica/query-sparql-rdfjs-lite` - SPARQL engine
- `yaml` - YAML parser for code blocks
- `@rdfjs/serializer-turtle` - Turtle output

## Related Work

- **SPARQL Anything** - Query any format with SPARQL
- **Facade-X** - Generic metamodel for structured data
- **Obsidian/Roam** - Knowledge management with markdown
- **RDF/Markdown** - Various approaches to RDF in markdown

## License

MIT
