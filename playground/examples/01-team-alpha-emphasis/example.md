---
title: Team Alpha (Emphasis)
description: Using emphasis (*text*) to denote relationships
facade: facade-x
preserve-order: false
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX : <http://example.org/>

  CONSTRUCT {
    ?team a :Team ;
      :name ?teamName ;
      :hasMember ?person .

    ?person a foaf:Person ;
      foaf:name ?personName ;
      ?predicate ?object .
  }
  WHERE {
    # Document → H1 Section (Team)
    ?teamSection a md:Section ;
      rdfs:member [ a md:Heading ; fx:text ?teamName ] ;
      rdfs:member ?personSection .

    # Team → H2 Section (Person)
    ?personSection a md:Section ;
      rdfs:member [ a md:Heading ; fx:text ?personName ] ;
      rdfs:member ?para .

    # Person → Paragraph with *relationship* target
    ?para a md:Paragraph ;
      rdfs:member [ a md:Emphasis ; rdfs:member [ fx:raw ?rel ] ] ;
      rdfs:member [ a md:Text ; fx:raw ?targetRaw ] .

    # Generate URIs from names
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?teamName))) AS ?team)
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?personName))) AS ?person)
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(REPLACE(?targetRaw, "^ ", "")))) AS ?object)

    # Map relationship vocabulary
    BIND(COALESCE(
      IF(?rel = "knows", foaf:knows, ?UNDEF),
      IF(?rel = "likes", :likes, ?UNDEF),
      IRI(CONCAT(str(:), ?rel))
    ) AS ?predicate)
  }
---

# Team Alpha

## Bob
*knows* Alice

## Alice
*likes* Icecream
