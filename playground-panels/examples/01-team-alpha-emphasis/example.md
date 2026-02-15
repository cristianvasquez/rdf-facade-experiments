---
title: Team Alpha (Emphasis)
description: Using emphasis (*text*) to denote relationships
facade: facade-x
preserve-order: false
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX : <http://example.org/>

  CONSTRUCT {
    # Team
    ?team a :Team ;
      :name ?teamName ;
      :hasMember ?person .

    # Person with relationships
    ?person a foaf:Person ;
      foaf:name ?personName ;
      ?predicate ?object .
  }
  WHERE {
    # H1 Section = Team
    ?doc a md:Document ;
      rdfs:member ?teamSection .

    ?teamSection a md:Section ;
      rdfs:member [ a md:Heading ;
                    fx:text ?teamName ] ;
      rdfs:member ?personSection .

    # H2 Section = Person (directly specify type instead of filtering)
    ?personSection a md:Section ;
      rdfs:member [ a md:Heading ;
                    fx:text ?personName ] ;
      rdfs:member ?paragraph .

    # Get paragraphs with relationship info (directly specify type)
    ?paragraph a md:Paragraph ;
      rdfs:member [ a md:Emphasis ;
                    rdfs:member [ fx:raw ?relationshipName ] ] ;
      rdfs:member [ a md:Text ;
                    fx:raw ?objectRaw ] .

    BIND(REPLACE(?objectRaw, "^ ", "") AS ?objectName)
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?teamName))) AS ?team)
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?personName))) AS ?person)
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?objectName))) AS ?object)

    # Map relationship names to predicates
    BIND(IF(?relationshipName = "knows", foaf:knows,
         IF(?relationshipName = "likes", :likes,
            IRI(CONCAT(str(:), ?relationshipName)))) AS ?predicate)
  }
---

# Team Alpha

## Bob
*knows* Alice

## Alice
*likes* Icecream
