# Example 02: Entities with Explicit Types

## Concept

This is **Variant 2** of Example 01, using a different markdown syntax to express the **same semantics**.

Unlike Example 01 where the structure implied semantics (H1=Team, H2=Person), this variant makes everything **explicit** using emphasis patterns.

## Markdown Syntax

```markdown
# Entities

## Dream Team
*is a* Team
*has member* Bob
*has member* Alice

## Bob
*is a* Person
*knows* Alice

## Alice
*is a* Person
*likes* Icecream
```

**Key patterns:**
- `# Entities` - H1 heading (just a container, no semantic meaning)
- `## Name` - H2 heading (entity identifier)
- `*is a* Type` - Type declaration (rdf:type)
- `*property*` value - Property assertion

## Differences from Example 01

| Aspect | Example 01 | Example 02 (this) |
|--------|-----------|-------------------|
| **H1 meaning** | Team name | Container (no semantics) |
| **H2 meaning** | Person (implicit) | Entity (type declared explicitly) |
| **Type declaration** | Implicit from structure | Explicit `*is a* Type` |
| **Properties** | Only relationships | Type + relationships |
| **Explicitness** | Structure carries semantics | Text carries semantics |

## Facade RDF (Structural)

```turtle
[ a md:Document;
  rdf:_1 [ a md:Section;                    # H1: Entities
      rdf:_1 [ a md:Heading; fx:text "Entities" ];

      rdf:_2 [ a md:Section;                # H2: Dream Team
          rdf:_1 [ a md:Heading; fx:text "Dream Team" ];
          rdf:_2 [ a md:Paragraph;          # *is a* Team
              rdf:_1 [ a md:Emphasis;
                  rdf:_1 [ a md:Text; fx:raw "is a" ] ];
              rdf:_2 [ a md:Text; fx:raw " Team" ]
            ];
          rdf:_3 [ a md:Paragraph;          # *has member* Bob
              rdf:_1 [ a md:Emphasis;
                  rdf:_1 [ a md:Text; fx:raw "has member" ] ];
              rdf:_2 [ a md:Text; fx:raw " Bob" ]
            ];
          # ... more paragraphs
        ];

      rdf:_3 [ a md:Section;                # H2: Bob
          rdf:_1 [ a md:Heading; fx:text "Bob" ];
          rdf:_2 [ a md:Paragraph;          # *is a* Person
              rdf:_1 [ a md:Emphasis;
                  rdf:_1 [ a md:Text; fx:raw "is a" ] ];
              rdf:_2 [ a md:Text; fx:raw " Person" ]
            ];
          rdf:_3 [ a md:Paragraph;          # *knows* Alice
              rdf:_1 [ a md:Emphasis;
                  rdf:_1 [ a md:Text; fx:raw "knows" ] ];
              rdf:_2 [ a md:Text; fx:raw " Alice" ]
            ]
        ];
      # ... Alice section
    ]
]
```

## CONSTRUCT Query (Semantics)

```sparql
WHERE {
  # Each H2 section is an entity
  ?section a md:Section ;
    rdf:_1 [ a md:Heading ;
             fx:text ?entityName ] .

  # Get all paragraphs (property statements)
  ?section ?idx ?paragraph .
  FILTER(?idx != rdf:_1)  # Skip heading

  ?paragraph a md:Paragraph ;
    rdf:_1 [ a md:Emphasis ;              # Property name
             rdf:_1 [ fx:raw ?propertyName ] ] ;
    rdf:_2 [ a md:Text ;                  # Value
             fx:raw ?valueRaw ] .

  # Map property names to predicates
  # Special handling for "is a" → rdf:type
}
```

**Semantic mappings:**
- `*is a* Team` → `rdf:type :Team`
- `*is a* Person` → `rdf:type foaf:Person`
- `*has member*` → `:hasMember`
- `*knows*` → `foaf:knows`
- `*likes*` → `:likes`

## Expected Output (Semantic RDF)

```turtle
<urn:Dream_Team> a :Team ;
  :hasMember <urn:Bob> ;
  :hasMember <urn:Alice> .

<urn:Bob> a foaf:Person ;
  foaf:knows <urn:Alice> .

<urn:Alice> a foaf:Person ;
  :likes <urn:Icecream> .
```

## Key Insights

1. **Same semantics, different syntax** - Both examples produce equivalent RDF
2. **Implicit vs. Explicit** - Example 01 uses structure (H1=Team), this uses text (*is a* Team)
3. **Flexibility** - The CONSTRUCT can interpret any markdown pattern
4. **Trade-offs**:
   - **Example 01**: More concise, relies on document structure
   - **Example 02**: More verbose, but self-documenting and uniform

## Comparison: Which to Choose?

**Use Example 01 style when:**
- Document structure naturally maps to domain (hierarchies, outlines)
- Brevity is important
- Authors understand implicit conventions

**Use Example 02 style when:**
- Everything should be explicit and uniform
- Different entity types at the same level
- Easier for LLMs to generate/parse (consistent pattern)
