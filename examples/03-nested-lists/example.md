---
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
      rdf:_1 [ a md:Heading ; fx:text ?teamName ] ;
      rdf:_2 ?mainList .

    # Main list contains people
    ?mainList a md:List ;
      ?personIdx ?personItem .

    # Each top-level list item is a person
    ?personItem a md:List_item ;
      rdf:_1 [ a md:Paragraph ; fx:raw ?personName ] ;
      rdf:_2 ?relationshipList .

    # Nested list contains relationships
    ?relationshipList a md:List ;
      ?relIdx ?relationshipItem .

    # Each relationship item
    ?relationshipItem a md:List_item ;
      rdf:_1 [ a md:Paragraph ; fx:raw ?relationshipName ] ;
      rdf:_2 [ a md:List ;
               rdf:_1 [ a md:List_item ;
                        rdf:_1 [ a md:Paragraph ;
                                 fx:raw ?objectName ] ] ] .

    # Create IRIs
    BIND(IRI(CONCAT("urn:", REPLACE(?teamName, " ", "_"))) AS ?team)
    BIND(IRI(CONCAT("urn:", ?personName)) AS ?person)
    BIND(IRI(CONCAT("urn:", ?objectName)) AS ?object)

    # Map relationship names to predicates
    BIND(IF(LCASE(?relationshipName) = "knows", foaf:knows,
         IF(LCASE(?relationshipName) = "likes", :likes,
            IRI(CONCAT(str(:), LCASE(?relationshipName))))) AS ?predicate)
  }
---

# Teams

## Dream team
- Bob
  - Knows
    - Alice
- Alice
  - Likes
    - Icecream
