---
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
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
      rdf:_1 ?teamSection .

    ?teamSection a md:Section ;
      rdf:_1 [ a md:Heading ;
               fx:text ?teamName ] ;
      ?idx ?personSection .

    # Skip the team heading (rdf:_1), get person sections (rdf:_2, rdf:_3, ...)
    FILTER(?idx != rdf:_1)

    # H2 Section = Person
    ?personSection a md:Section ;
      rdf:_1 [ a md:Heading ;
               fx:text ?personName ] ;
      rdf:_2 [ a md:Paragraph ;
               rdf:_1 [ a md:Emphasis ;
                        rdf:_1 [ fx:raw ?relationshipName ] ] ;
               rdf:_2 [ a md:Text ;
                        fx:raw ?objectRaw ] ] .

    BIND(REPLACE(?objectRaw, "^ ", "") AS ?objectName)
    BIND(IRI(CONCAT("urn:", REPLACE(?teamName, " ", "_"))) AS ?team)
    BIND(IRI(CONCAT("urn:", ?personName)) AS ?person)
    BIND(IRI(CONCAT("urn:", ?objectName)) AS ?object)

    # Map relationship names to predicates
    BIND(IF(?relationshipName = "knows", foaf:knows,
         IF(?relationshipName = "likes", IRI("http://example.org/likes"),
            IRI(CONCAT("http://example.org/", ?relationshipName)))) AS ?predicate)
  }
---

# Dream team

## Bob
*knows* Alice

## Alice
*likes* Icecream
