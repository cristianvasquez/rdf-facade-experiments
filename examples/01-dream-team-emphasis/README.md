# Example 01: Dream Team with Emphasis

## Concept

This example demonstrates the **Markdown Facade** approach:

1. **Markdown** is parsed to an AST
2. **AST** is converted to **facade RDF** (structural representation)
3. **CONSTRUCT query** (embedded in frontmatter) extracts **semantic RDF**

## Markdown Syntax

```markdown
# Dream team

## Bob
*knows* Alice

## Alice
*likes* Icecream
```

**Key patterns:**
- `# Title` - H1 heading (team/group)
- `## Name` - H2 heading (person)
- `*relationship*` - Emphasis (relationship predicate)
- Following text - Object of the relationship

## Facade RDF (Structural)

The facade represents the markdown AST as RDF:

```turtle
[ a md:Document;
  rdf:_1 [ a md:Section;                    # H1: Dream team
      rdf:_1 [ a md:Heading; fx:text "Dream team" ];

      rdf:_2 [ a md:Section;                # H2: Bob
          rdf:_1 [ a md:Heading; fx:text "Bob" ];
          rdf:_2 [ a md:Paragraph;          # *knows* Alice
              rdf:_1 [ a md:Emphasis;       # *knows*
                  rdf:_1 [ a md:Text; fx:raw "knows" ]
                ];
              rdf:_2 [ a md:Text; fx:raw " Alice" ]
            ]
        ];

      rdf:_3 [ a md:Section;                # H2: Alice
          rdf:_1 [ a md:Heading; fx:text "Alice" ];
          rdf:_2 [ a md:Paragraph;          # *likes* Icecream
              rdf:_1 [ a md:Emphasis;
                  rdf:_1 [ a md:Text; fx:raw "likes" ]
                ];
              rdf:_2 [ a md:Text; fx:raw " Icecream" ]
            ]
        ]
    ]
]
```

## CONSTRUCT Query (Semantics)

The CONSTRUCT query defines the **interpretation**:

```sparql
WHERE {
  ?section a md:Section ;
    rdf:_1 [ a md:Heading ;              # H2 = Person
             fx:text ?personName ] ;
    rdf:_2 [ a md:Paragraph ;
             rdf:_1 [ a md:Emphasis ;    # Emphasis = Relationship
                      rdf:_1 [ fx:raw ?relationshipName ] ] ;
             rdf:_2 [ a md:Text ;        # Text = Object
                      fx:raw ?objectRaw ] ] .
}
```

**Semantic mappings:**
- `# H1 Heading` → `:Team`
- `## H2 Heading` → `foaf:Person` (member of team)
- `*knows*` → `foaf:knows`
- `*likes*` → `:likes`

## Expected Output (Semantic RDF)

```turtle
<urn:Dream_team> a :Team ;
  :name "Dream team" ;
  :hasMember <urn:Bob> ;
  :hasMember <urn:Alice> .

<urn:Bob> a foaf:Person ;
  foaf:name "Bob" ;
  foaf:knows <urn:Alice> .

<urn:Alice> a foaf:Person ;
  foaf:name "Alice" ;
  :likes <urn:Icecream> .
```

## Key Insights

1. **Facade is structural** - just the AST in RDF form (md:Section, md:Heading, md:Emphasis)
2. **CONSTRUCT is semantic** - defines what things *mean* (Person, knows, likes)
3. **Nested patterns** - WHERE clause mirrors the tree structure
4. **Explicit mapping** - The relationship between syntax and semantics is queryable

## Running

```bash
# Generate facade RDF
node examples/process.js 01-dream-team-emphasis/example.md --facade

# Execute CONSTRUCT to get semantic RDF
node examples/process.js 01-dream-team-emphasis/example.md --construct

# Compare with expected output
node examples/process.js 01-dream-team-emphasis/example.md --validate
```
