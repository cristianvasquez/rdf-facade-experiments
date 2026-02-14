# Example 05: Wikilinks (Knowledge Graph Style)

## Concept

This is **Variant 5** using **wikilink syntax** (`[[Name]]`) popular in knowledge management tools like Obsidian, Roam Research, and Logseq.

Wikilinks create bidirectional connections between entities, making this syntax natural for **knowledge graphs** and **networked thought**.

## Markdown Syntax

```markdown
# Dream Team

[[Bob]] knows [[Alice]]
[[Alice]] likes [[Icecream]]

Members: [[Bob]], [[Alice]]
```

**Key patterns:**
- `[[Entity]]` - Wikilink (entity reference)
- `[[Subject]] relationship [[Object]]` - Relationship statement
- `Members: [[A]], [[B]]` - List of members

## Why Wikilinks?

**Popular in:**
- Obsidian
- Roam Research
- Logseq
- Notion (linked pages)
- Dendron
- Foam

**Advantages:**
1. **Natural linking** - Already a standard in PKM (Personal Knowledge Management)
2. **Bidirectional** - Tools can show backlinks automatically
3. **LLM-friendly** - Clear entity boundaries with `[[...]]`
4. **Discoverable** - Entities stand out visually
5. **Tool support** - Many editors recognize wikilinks

## Facade RDF (Structural)

```turtle
[ a md:Document;
  rdf:_1 [ a md:Section;
      rdf:_1 [ a md:Heading; fx:text "Dream Team" ];

      rdf:_2 [ a md:Paragraph;                 # [[Bob]] knows [[Alice]]
          fx:raw "[[Bob]] knows [[Alice]]";
          rdf:_1 [ a md:Wikilink;              # [[Bob]]
              fx:text "Bob"
            ];
          rdf:_2 [ a md:Text;                  # " knows "
              fx:raw " knows "
            ];
          rdf:_3 [ a md:Wikilink;              # [[Alice]]
              fx:text "Alice"
            ]
        ];

      rdf:_3 [ a md:Paragraph;                 # [[Alice]] likes [[Icecream]]
          fx:raw "[[Alice]] likes [[Icecream]]";
          rdf:_1 [ a md:Wikilink;
              fx:text "Alice"
            ];
          rdf:_2 [ a md:Text;
              fx:raw " likes "
            ];
          rdf:_3 [ a md:Wikilink;
              fx:text "Icecream"
            ]
        ];

      rdf:_4 [ a md:Paragraph;                 # Members: [[Bob]], [[Alice]]
          fx:raw "Members: [[Bob]], [[Alice]]";
          rdf:_1 [ a md:Text;
              fx:raw "Members: "
            ];
          rdf:_2 [ a md:Wikilink;
              fx:text "Bob"
            ];
          rdf:_3 [ a md:Text;
              fx:raw ", "
            ];
          rdf:_4 [ a md:Wikilink;
              fx:text "Alice"
            ]
        ]
    ]
]
```

## CONSTRUCT Query (Semantics)

```sparql
WHERE {
  # Relationship statements: [[Subject]] relationship [[Object]]
  {
    ?para a md:Paragraph ;
      rdf:_1 [ a md:Wikilink ; fx:text ?subjectName ] ;
      rdf:_2 [ a md:Text ; fx:raw ?relationshipRaw ] ;
      rdf:_3 [ a md:Wikilink ; fx:text ?objectName ] .

    # Extract and map relationship
    BIND(REPLACE(REPLACE(?relationshipRaw, "^ ", ""), " $", "") AS ?relationshipName)
    BIND(IF(?relationshipName = "knows", foaf:knows,
         IF(?relationshipName = "likes", :likes, ...)) AS ?predicate)
  }
  UNION
  # Members list: Members: [[A]], [[B]]
  {
    ?membersPara a md:Paragraph ;
      rdf:_1 [ a md:Text ; fx:raw ?membersPrefix ] .

    FILTER(CONTAINS(?membersPrefix, "Members:"))

    ?membersPara ?linkIdx [ a md:Wikilink ; fx:text ?memberName ] .
  }
}
```

**Semantic mappings:**
- `[[Entity]]` → Entity IRI (`<urn:Entity>`)
- `[[A]] relationship [[B]]` → Triple with mapped predicate
- `Members: [[A]], [[B]]` → `:hasMember` relationships

## Expected Output (Semantic RDF)

```turtle
<urn:Dream_Team> a :Team ;
  :name "Dream Team" ;
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

1. **Entity-first syntax** - Wikilinks make entities the primary concept
2. **Natural for graphs** - Already designed for networked knowledge
3. **Tool ecosystem** - Leverage existing PKM tools and workflows
4. **LLM generation** - LLMs can easily generate this format
5. **Backlinks** - Tools can show "who links to this entity"

## Comparison with Other Examples

| Aspect | Wikilinks | Emphasis (Ex 01) | Tables (Ex 04) |
|--------|-----------|------------------|----------------|
| **Entity syntax** | `[[Entity]]` | Plain text | Plain text in cells |
| **Relationships** | Inline prose | Emphasis + text | Table rows |
| **Tool support** | High (PKM tools) | Universal | Universal |
| **Human-readable** | Very | Very | Moderate |
| **LLM-friendly** | Very high | High | High |

## When to Use This Style

**Good for:**
- Personal knowledge management
- Research notes and literature reviews
- Concept mapping and idea networks
- LLM-generated knowledge graphs
- Obsidian/Roam/Logseq users
- When entities are more important than relationships

**Not ideal for:**
- Tabular data (use tables)
- Deeply nested hierarchies (use lists)
- When wikilink syntax is not supported by parser

## Extensions

**Multiple relationships:**
```markdown
[[Bob]] knows [[Alice]] and [[Carol]]
```

**Qualified relationships:**
```markdown
[[Bob]] knows [[Alice]] (since 2020)
```

**Typed links:**
```markdown
[[Bob]] --knows--> [[Alice]]
```

## Parser Requirements

The markdown parser must recognize `[[...]]` as wikilinks and create `md:Wikilink` nodes with the link text extracted.

Most modern markdown parsers support this through plugins:
- remark-wiki-link
- markdown-it-wikilinks
- Custom regex parsing
