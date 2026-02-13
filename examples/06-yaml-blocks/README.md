# Example 06: YAML Code Blocks (Structured Data)

## Concept

This is **Variant 6** using **YAML in code blocks** to express structured data within markdown.

This approach treats markdown as a **container** for structured data, similar to how Jupyter notebooks embed code, or how API documentation embeds examples.

## Markdown Syntax

````markdown
# Entities

```yaml
teams:
  - name: Dream Team
    members:
      - Bob
      - Alice

people:
  - name: Bob
    knows:
      - Alice
  - name: Alice
    likes:
      - Icecream
```
````

**Key patterns:**
- ` ```yaml` - Code block with language identifier
- YAML structure - Standard YAML syntax
- Nested data - Arrays and objects
- Self-describing - Field names are explicit

## Why YAML/JSON Blocks?

**Advantages:**
1. **Precise structure** - No ambiguity in parsing
2. **Validation** - Can use JSON Schema, YAML validators
3. **Tool support** - Every language has YAML/JSON parsers
4. **Familiar** - Developers already know this format
5. **Round-trippable** - Easy to serialize/deserialize
6. **Editor support** - Syntax highlighting, auto-completion
7. **Type safety** - Can enforce schemas

**Use cases:**
- Configuration in documentation
- Data dumps in markdown reports
- API examples
- Test data
- Database exports
- Form submissions

## Facade RDF (Structural)

### Markdown Structure
```turtle
[ a md:Document;
  rdf:_1 [ a md:Section;
      rdf:_1 [ a md:Heading; fx:text "Entities" ];

      rdf:_2 [ a md:Code_block;           # Code block node
          fx:lang "yaml";                 # Language: yaml
          fx:code """teams:
  - name: Dream Team
    members:
      - Bob
      - Alice
..."""
        ]
    ]
]
```

### YAML Content as Facade-X

The YAML content would be parsed separately into Facade-X RDF:

```turtle
[ a xyz:root;
  xyz:teams [
    rdf:_1 [
      xyz:name "Dream Team";
      xyz:members [
        rdf:_1 "Bob";
        rdf:_2 "Alice"
      ]
    ]
  ];
  xyz:people [
    rdf:_1 [
      xyz:name "Bob";
      xyz:knows [ rdf:_1 "Alice" ]
    ];
    rdf:_2 [
      xyz:name "Alice";
      xyz:likes [ rdf:_1 "Icecream" ]
    ]
  ]
]
```

## CONSTRUCT Query (Semantics)

```sparql
WHERE {
  # Find YAML code block
  ?codeBlock a md:Code_block ;
    fx:lang "yaml" ;
    fx:code ?yamlContent .

  # Parse YAML as Facade-X RDF
  # (Actual implementation would use SPARQL Anything or similar)

  # Extract teams
  {
    ?yamlRoot xyz:teams ?teamsList .
    ?teamsList ?teamIdx ?teamNode .

    ?teamNode xyz:name ?teamName ;
              xyz:members ?membersList .

    ?membersList ?memberIdx ?memberName .
  }
  UNION
  # Extract people
  {
    ?yamlRoot xyz:people ?peopleList .
    ?peopleList ?personIdx ?personNode .

    ?personNode xyz:name ?personName .

    OPTIONAL {
      ?personNode xyz:knows ?knowsList .
      ?knowsList ?knowsIdx ?knownName .
    }

    OPTIONAL {
      ?personNode xyz:likes ?likesList .
      ?likesList ?likesIdx ?likedName .
    }
  }
}
```

**Semantic mappings:**
- YAML field names → RDF properties (xyz: namespace)
- `teams` → `:Team` instances
- `people` → `foaf:Person` instances
- `knows` → `foaf:knows`
- `likes` → `:likes`

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

## Implementation Notes

This example requires **two-stage processing**:

1. **Markdown → Facade** - Extract code block
2. **YAML → Facade-X** - Parse YAML content into RDF (using SPARQL Anything approach)
3. **Facade-X → Semantic** - Execute CONSTRUCT

This is similar to how the `sparql-anything-js` project works - it converts structured data formats (JSON, CSV, etc.) into Facade-X RDF, then queries them.

## Alternative: JSON

````markdown
```json
{
  "teams": [
    {
      "name": "Dream Team",
      "members": ["Bob", "Alice"]
    }
  ],
  "people": [
    {
      "name": "Bob",
      "knows": ["Alice"]
    },
    {
      "name": "Alice",
      "likes": ["Icecream"]
    }
  ]
}
```
````

Same approach, different syntax. JSON is more machine-friendly, YAML is more human-friendly.

## Key Insights

1. **Embedded data** - Markdown as a container for structured formats
2. **Two-phase parsing** - Markdown structure + data structure
3. **Reuse existing tools** - YAML/JSON parsers are mature
4. **Schema validation** - Can enforce structure before processing
5. **Developer-friendly** - Familiar to programmers

## Comparison with Other Examples

| Aspect | YAML Blocks | Tables (Ex 04) | Wikilinks (Ex 05) |
|--------|-------------|----------------|-------------------|
| **Syntax** | Structured data | Markdown native | Markdown native |
| **Parsing** | Two-stage | Single-stage | Single-stage |
| **Precision** | Very high | High | Medium |
| **Human edit** | Moderate | Easy | Very easy |
| **Validation** | Schema support | Limited | None |
| **Tool gen** | Very easy | Easy | Easy |

## When to Use This Style

**Good for:**
- Data import/export
- Configuration documentation
- API request/response examples
- Test fixtures
- Complex nested structures
- When schema validation is important
- Programmatic generation

**Not ideal for:**
- Quick notes (too verbose)
- Natural reading flow (breaks narrative)
- Non-technical users (unfamiliar with YAML)
- Simple flat data (tables are better)

## Extensions

**Multiple blocks:**
````markdown
```yaml
# Team definitions
teams:
  - name: Dream Team
```

```yaml
# People data
people:
  - name: Bob
```
````

**Mixed formats:**
````markdown
```json
{"teams": [...]}
```

```yaml
people:
  - name: Bob
```
````

**Validation:**
````markdown
```yaml
# schema: team-schema.json
teams:
  - name: Dream Team
```
````

## Relationship to SPARQL Anything

This example directly leverages the **SPARQL Anything** concept:
- Parse structured format → Facade-X RDF
- Query with SPARQL
- Extract semantic meaning

The only difference is the data is **embedded in markdown** rather than a separate file.
