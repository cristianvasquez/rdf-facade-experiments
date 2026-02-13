# Example 03: Nested Lists

## Concept

This is **Variant 3** using nested markdown lists to express the same semantics as Examples 01 and 02.

This syntax is **hierarchical** and uses **indentation** to show relationships, similar to outlining or mind-mapping.

## Markdown Syntax

```markdown
# Teams

## Dream team
- Bob
  - Knows
    - Alice
- Alice
  - Likes
    - Icecream
```

**Key patterns:**
- `# Teams` - H1 heading (container)
- `## Team Name` - H2 heading (team)
- `- Person` - Top-level list item (person/member)
- `  - Relationship` - Nested list item (relationship type)
- `    - Object` - Deeper nested item (relationship target)

**Nesting levels:**
1. **Level 0**: Person name
2. **Level 1**: Relationship type (Knows, Likes)
3. **Level 2**: Relationship object (Alice, Icecream)

## Differences from Examples 01 & 02

| Aspect | Example 01 | Example 02 | Example 03 (this) |
|--------|-----------|------------|-------------------|
| **Syntax style** | Headings + emphasis | Headings + emphasis | Nested lists |
| **Relationships** | `*knows* Alice` | `*knows* Alice` | `- Knows\n  - Alice` |
| **Structure** | Sections | Sections | Lists |
| **Hierarchy** | Heading levels | Flat sections | List indentation |
| **Readability** | Concise | Self-documenting | Outline-like |

## Facade RDF (Structural)

```turtle
[ a md:Document;
  rdf:_1 [ a md:Section;                      # H1: Teams
      rdf:_1 [ a md:Heading; fx:text "Teams" ];

      rdf:_2 [ a md:Section;                  # H2: Dream team
          rdf:_1 [ a md:Heading; fx:text "Dream team" ];

          rdf:_2 [ a md:List;                 # Main list
              rdf:_1 [ a md:List_item;        # Bob
                  rdf:_1 [ a md:Paragraph; fx:raw "Bob" ];

                  rdf:_2 [ a md:List;         # Nested list (relationships)
                      rdf:_1 [ a md:List_item;  # Knows
                          rdf:_1 [ a md:Paragraph; fx:raw "Knows" ];

                          rdf:_2 [ a md:List;   # Deeper nested (objects)
                              rdf:_1 [ a md:List_item;  # Alice
                                  rdf:_1 [ a md:Paragraph; fx:raw "Alice" ]
                                ]
                            ]
                        ]
                    ]
                ];

              rdf:_2 [ a md:List_item;        # Alice
                  rdf:_1 [ a md:Paragraph; fx:raw "Alice" ];

                  rdf:_2 [ a md:List;         # Nested list
                      rdf:_1 [ a md:List_item;  # Likes
                          rdf:_1 [ a md:Paragraph; fx:raw "Likes" ];

                          rdf:_2 [ a md:List;
                              rdf:_1 [ a md:List_item;  # Icecream
                                  rdf:_1 [ a md:Paragraph; fx:raw "Icecream" ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]
    ]
]
```

## CONSTRUCT Query (Semantics)

```sparql
WHERE {
  # H2 Section = Team
  ?teamSection a md:Section ;
    rdf:_1 [ a md:Heading ; fx:text ?teamName ] ;
    rdf:_2 ?mainList .

  # Main list → people
  ?mainList a md:List ;
    ?personIdx ?personItem .

  # Top-level list item = person
  ?personItem a md:List_item ;
    rdf:_1 [ a md:Paragraph ; fx:raw ?personName ] ;
    rdf:_2 ?relationshipList .

  # Nested list → relationships
  ?relationshipList a md:List ;
    ?relIdx ?relationshipItem .

  # Relationship item → type + object
  ?relationshipItem a md:List_item ;
    rdf:_1 [ a md:Paragraph ; fx:raw ?relationshipName ] ;
    rdf:_2 [ a md:List ;
             rdf:_1 [ a md:List_item ;
                      rdf:_1 [ a md:Paragraph ;
                               fx:raw ?objectName ] ] ] .
}
```

**Semantic mappings:**
- `## Heading` → `:Team`
- `- Person` (top-level) → `foaf:Person` + `:hasMember`
- `  - Knows` → `foaf:knows`
- `  - Likes` → `:likes`
- `    - Object` → entity IRI

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

1. **List nesting = relationship structure** - The facade naturally captures the 3-level hierarchy
2. **Pattern matching depth** - CONSTRUCT navigates through nested lists using property paths
3. **Same semantics, different feel** - Feels like an outline or tree structure
4. **Trade-offs**:
   - **Pros**: Visual hierarchy, familiar (markdown lists are common), works well for tree-like data
   - **Cons**: More verbose (multiple lines per relationship), indentation-sensitive

## When to Use This Style

**Good for:**
- Tree/hierarchical data (org charts, taxonomies)
- Outlining and brainstorming
- Authors familiar with bullet journaling
- Data where relationships naturally nest

**Not ideal for:**
- Flat property lists (Example 02 is better)
- When brevity is critical (Example 01 is better)
- Tables or matrix-like data

## Scalability

Like the other examples, this scales automatically:

```markdown
## Dream team
- Bob
  - Knows
    - Alice
    - Carol
  - Likes
    - Pizza
- Alice
  - Knows
    - Bob
```

The CONSTRUCT handles multiple nested items at each level.
