# Example 04: Tables

## Concept

This is **Variant 4** using markdown tables to express the same semantics as Examples 01-03.

This syntax is **tabular** and uses **sections** to group different types of relationships, similar to a relational database or spreadsheet.

## Markdown Syntax

```markdown
# Entities

## Teams

| Person | Team       |
|--------|------------|
| Bob    | Dream team |
| Alice  | Dream team |

## Relations

| Person | Knows |
|--------|-------|
| Bob    | Alice |

## Preferences

| Person | Likes    |
|--------|----------|
| Alice  | Icecream |
```

**Key patterns:**
- `## Section Name` - H2 heading (groups related data)
- `| Header | Header |` - Table headers (column names)
- `| Value | Value |` - Table rows (data)

**Sections define semantics:**
- **Teams** → `:hasMember` relationships
- **Relations** → `foaf:knows` relationships
- **Preferences** → `:likes` relationships

## Differences from Examples 01-03

| Aspect | Examples 01-03 | Example 04 (this) |
|--------|---------------|-------------------|
| **Syntax** | Headings/Lists/Emphasis | Tables |
| **Structure** | Hierarchical | Flat (tabular) |
| **Grouping** | By entity | By relationship type |
| **Feel** | Document/Outline | Spreadsheet/Database |
| **Scalability** | Per-entity | Per-relationship |

## Facade RDF (Structural)

```turtle
[ a md:Document;
  rdf:_1 [ a md:Section;                      # H1: Entities
      rdf:_1 [ a md:Heading; fx:text "Entities" ];

      rdf:_2 [ a md:Section;                  # H2: Teams
          rdf:_1 [ a md:Heading; fx:text "Teams" ];

          rdf:_2 [ a md:Table;                # Teams table
              rdf:_1 [ a md:Table_row;        # Header row
                  rdf:_1 [ a md:Table_cell;
                      rdf:_1 [ fx:content "Person" ] ];
                  rdf:_2 [ a md:Table_cell;
                      rdf:_1 [ fx:content "Team" ] ]
                ];

              rdf:_2 [ a md:Table_row;        # Data row: Bob | Dream team
                  rdf:_1 [ a md:Table_cell;
                      rdf:_1 [ fx:content "Bob" ] ];
                  rdf:_2 [ a md:Table_cell;
                      rdf:_1 [ fx:content "Dream team" ] ]
                ];

              rdf:_3 [ a md:Table_row;        # Data row: Alice | Dream team
                  rdf:_1 [ a md:Table_cell;
                      rdf:_1 [ fx:content "Alice" ] ];
                  rdf:_2 [ a md:Table_cell;
                      rdf:_1 [ fx:content "Dream team" ] ]
                ]
            ]
        ];

      rdf:_3 [ a md:Section;                  # H2: Relations
          rdf:_1 [ a md:Heading; fx:text "Relations" ];
          rdf:_2 [ a md:Table;                # Relations table
              # ... similar structure
            ]
        ];

      rdf:_4 [ a md:Section;                  # H2: Preferences
          rdf:_1 [ a md:Heading; fx:text "Preferences" ];
          rdf:_2 [ a md:Table;                # Preferences table
              # ... similar structure
            ]
        ]
    ]
]
```

## CONSTRUCT Query (Semantics)

The CONSTRUCT uses **UNION** to handle different sections separately:

```sparql
WHERE {
  # Teams section
  {
    ?teamsSection a md:Section ;
      rdf:_1 [ a md:Heading ; fx:text "Teams" ] ;
      rdf:_2 ?teamsTable .

    ?teamsTable a md:Table ;
      ?rowIdx ?row .

    FILTER(?rowIdx != rdf:_1)  # Skip header

    ?row a md:Table_row ;
      rdf:_1 [ a md:Table_cell ;           # Column 1: Person
               rdf:_1 [ fx:content ?personName ] ] ;
      rdf:_2 [ a md:Table_cell ;           # Column 2: Team
               rdf:_1 [ fx:content ?teamName ] ] .
  }
  UNION
  # Relations section
  {
    ?relationsSection a md:Section ;
      rdf:_1 [ a md:Heading ; fx:text "Relations" ] ;
      rdf:_2 ?relationsTable .

    ?relationsTable a md:Table ;
      ?rowIdx2 ?row2 .

    FILTER(?rowIdx2 != rdf:_1)  # Skip header

    ?row2 a md:Table_row ;
      rdf:_1 [ a md:Table_cell ;           # Column 1: Person
               rdf:_1 [ fx:content ?person1Name ] ] ;
      rdf:_2 [ a md:Table_cell ;           # Column 2: Knows
               rdf:_1 [ fx:content ?person2Name ] ] .
  }
  UNION
  # Preferences section (similar pattern)
  { ... }
}
```

**Semantic mappings:**
- **Teams section** → `:Team` + `:hasMember`
- **Relations section** → `foaf:knows`
- **Preferences section** → `:likes`
- Section heading determines the predicate/relationship type

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

1. **Section headers define semantics** - "Teams", "Relations", "Preferences" determine predicates
2. **Tables = relationship sets** - Each table contains one type of relationship
3. **Rows = triples** - Each row is essentially (subject, object) for the section's predicate
4. **UNION pattern** - Different sections processed separately in the CONSTRUCT
5. **Database-like** - Feels like CSV import or relational data modeling

## When to Use This Style

**Good for:**
- Tabular data (CSV conversions, spreadsheets)
- When you have many relationships of the same type
- Data entry by non-technical users (tables are familiar)
- When relationships are more important than entities
- Importing from structured sources

**Not ideal for:**
- Hierarchical data (Example 03 is better)
- Mixed property types per entity (Example 02 is better)
- Narrative/prose contexts (Example 01 is better)

## Scalability

Tables scale very well for adding more data of the same type:

```markdown
## Relations

| Person | Knows |
|--------|-------|
| Bob    | Alice |
| Bob    | Carol |
| Alice  | Carol |
| Carol  | Dave  |
| Dave   | Eve   |
```

Each row adds one triple. The CONSTRUCT processes all rows automatically.

## Advantages

1. **Familiar format** - Most people understand tables
2. **Bulk data entry** - Easy to add many relationships at once
3. **Tool compatibility** - Can generate from Excel, CSV, databases
4. **Clear structure** - Columns make the pattern explicit
5. **Validation-friendly** - Easy to check completeness (every row has same columns)

## Trade-offs

- **Verbose** - Requires section + table header for each relationship type
- **Repetition** - Entity names repeated across multiple tables
- **Less natural** - Doesn't read like prose
- **Fixed schema** - Adding new column types requires new sections
