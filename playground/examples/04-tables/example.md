---
title: Tables
description: Using markdown tables to represent structured data
ignore: true
preserve-order: true
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX : <http://example.org/>

  CONSTRUCT {
    # Teams
    ?team a :Team ;
      :name ?teamName ;
      :hasMember ?person .

    # People
    ?person a foaf:Person ;
      foaf:name ?personName .

    # Relations
    ?person1 foaf:knows ?person2 .

    # Preferences
    ?person3 :likes ?object .
  }
  WHERE {
    # Teams section
    {
      ?teamsSection a md:Section ;
        rdf:_1 [ a md:Heading ; fx:text "Teams" ] ;
        rdf:_2 ?teamsTable .

      ?teamsTable a md:Table ;
        ?rowIdx ?row .

      FILTER(?rowIdx != rdf:_1)  # Skip header row

      ?row a md:Table_row ;
        rdf:_1 [ a md:Table_cell ;
                 rdf:_1 [ fx:content ?personName ] ] ;
        rdf:_2 [ a md:Table_cell ;
                 rdf:_1 [ fx:content ?teamName ] ] .

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?teamName))) AS ?team)
      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?personName))) AS ?person)
    }
    UNION
    # Relations section
    {
      ?relationsSection a md:Section ;
        rdf:_1 [ a md:Heading ; fx:text "Relations" ] ;
        rdf:_2 ?relationsTable .

      ?relationsTable a md:Table ;
        ?rowIdx2 ?row2 .

      FILTER(?rowIdx2 != rdf:_1)  # Skip header row

      ?row2 a md:Table_row ;
        rdf:_1 [ a md:Table_cell ;
                 rdf:_1 [ fx:content ?person1Name ] ] ;
        rdf:_2 [ a md:Table_cell ;
                 rdf:_1 [ fx:content ?person2Name ] ] .

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?person1Name))) AS ?person1)
      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?person2Name))) AS ?person2)
    }
    UNION
    # Preferences section
    {
      ?prefsSection a md:Section ;
        rdf:_1 [ a md:Heading ; fx:text "Preferences" ] ;
        rdf:_2 ?prefsTable .

      ?prefsTable a md:Table ;
        ?rowIdx3 ?row3 .

      FILTER(?rowIdx3 != rdf:_1)  # Skip header row

      ?row3 a md:Table_row ;
        rdf:_1 [ a md:Table_cell ;
                 rdf:_1 [ fx:content ?person3Name ] ] ;
        rdf:_2 [ a md:Table_cell ;
                 rdf:_1 [ fx:content ?objectName ] ] .

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?person3Name))) AS ?person3)
      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?objectName))) AS ?object)
    }
  }
---

# Entities

## Teams

| Person | Team       |
|--------|------------|
| Bob    | Team Alpha |
| Alice  | Team Alpha |

## Relations

| Person | Knows |
|--------|-------|
| Bob    | Alice |

## Preferences

| Person | Likes    |
|--------|----------|
| Alice  | Icecream |
