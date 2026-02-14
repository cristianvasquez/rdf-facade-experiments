---
title: Nested Lists
description: Using nested markdown lists to express hierarchies
preserve-order: false
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
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
    # H2 Section = Team
    ?teamSection a md:Section ;
      rdfs:member [ a md:Heading ; fx:text ?teamName ] ;
      rdfs:member ?mainList .

    # Main list contains people
    ?mainList a md:List ;
      rdfs:member ?personItem .

    # Each top-level list item is a person
    ?personItem a md:List_item ;
      rdfs:member [ a md:Paragraph ; fx:raw ?personName ] ;
      rdfs:member ?relationshipList .

    # Nested list contains relationships
    ?relationshipList a md:List ;
      rdfs:member ?relationshipItem .

    # Each relationship item
    ?relationshipItem a md:List_item ;
      rdfs:member [ a md:Paragraph ; fx:raw ?relationshipName ] ;
      rdfs:member [ a md:List ;
                    rdfs:member [ a md:List_item ;
                                  rdfs:member [ a md:Paragraph ;
                                                fx:raw ?objectName ] ] ] .

    # Create IRIs
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?teamName))) AS ?team)
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?personName))) AS ?person)
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?objectName))) AS ?object)

    # Map relationship names to predicates
    BIND(IF(LCASE(?relationshipName) = "knows", foaf:knows,
         IF(LCASE(?relationshipName) = "likes", :likes,
            IRI(CONCAT(str(:), LCASE(?relationshipName))))) AS ?predicate)
  }
---

# Teams

## Team Alpha
- Bob
  - Knows
    - Alice
- Alice
  - Likes
    - Icecream
