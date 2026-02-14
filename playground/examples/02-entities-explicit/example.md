---
useRdfsMember: false
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX : <http://example.org/>

  CONSTRUCT {
    ?entity a ?type ;
      ?predicate ?object .
  }
  WHERE {
    # Each H2 section is an entity
    ?section a md:Section ;
      rdf:_1 [ a md:Heading ;
               fx:text ?entityName ] .

    # Get all paragraphs in the section (property statements)
    ?section ?idx ?paragraph .
    FILTER(?idx != rdf:_1)  # Skip the heading

    ?paragraph a md:Paragraph ;
      rdf:_1 [ a md:Emphasis ;
               rdf:_1 [ fx:raw ?propertyName ] ] ;
      rdf:_2 [ a md:Text ;
               fx:raw ?valueRaw ] .

    BIND(REPLACE(?valueRaw, "^ ", "") AS ?valueName)
    BIND(IRI(CONCAT("urn:", REPLACE(?entityName, " ", "_"))) AS ?entity)

    # Handle "is a" specially for rdf:type
    BIND(IF(?propertyName = "is a",
            rdf:type,
            IF(?propertyName = "has member", :hasMember,
            IF(?propertyName = "knows", foaf:knows,
            IF(?propertyName = "likes", :likes,
               IRI(CONCAT("http://example.org/", REPLACE(?propertyName, " ", "_"))))))) AS ?predicate)

    # Determine if value is a type or an entity
    BIND(IF(?propertyName = "is a",
            IF(?valueName = "Team", :Team,
            IF(?valueName = "Person", foaf:Person,
               IRI(CONCAT("http://example.org/", ?valueName)))),
            IRI(CONCAT("urn:", REPLACE(?valueName, " ", "_")))) AS ?object)

    # Extract type for CONSTRUCT
    OPTIONAL {
      ?section rdf:_2 ?typePara .
      ?typePara a md:Paragraph ;
        rdf:_1 [ a md:Emphasis ;
                 rdf:_1 [ fx:raw "is a" ] ] ;
        rdf:_2 [ a md:Text ;
                 fx:raw ?typeRaw ] .
      BIND(REPLACE(?typeRaw, "^ ", "") AS ?typeName)
      BIND(IF(?typeName = "Team", :Team,
            IF(?typeName = "Person", foaf:Person,
               IRI(CONCAT("http://example.org/", ?typeName)))) AS ?type)
    }
  }
---

# Entities

## Team Alpha

*is a* Team

*has member* Bob

*has member* Alice

## Bob

*is a* Person

*knows* Alice

## Alice

*is a* Person

*likes* Icecream
