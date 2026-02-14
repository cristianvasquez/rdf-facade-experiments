---
preserve-order: false
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX : <http://example.org/>

  CONSTRUCT {
    ?entity ?predicate ?object .
  }
  WHERE {
    # Each H2 section is an entity
    ?section a md:Section ;
      rdfs:member [ a md:Heading ;
                    fx:text ?entityName ] ;
      rdfs:member ?paragraph .

    # Get all paragraphs in the section (property statements)
    ?paragraph a md:Paragraph ;
      rdfs:member [ a md:Emphasis ;
                    rdfs:member [ fx:raw ?propertyName ] ] ;
      rdfs:member [ a md:Text ;
                    fx:raw ?valueRaw ] .

    BIND(REPLACE(?valueRaw, "^ ", "") AS ?valueName)
    BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?entityName))) AS ?entity)

    # Handle "is a" specially for rdf:type
    BIND(IF(?propertyName = "is a",
            rdf:type,
            IF(?propertyName = "has member", :hasMember,
            IF(?propertyName = "knows", foaf:knows,
            IF(?propertyName = "likes", :likes,
               IRI(CONCAT("http://example.org/", ENCODE_FOR_URI(?propertyName))))))) AS ?predicate)

    # Determine if value is a type or an entity
    BIND(IF(?propertyName = "is a",
            IF(?valueName = "Team", :Team,
            IF(?valueName = "Person", foaf:Person,
               IRI(CONCAT("http://example.org/", ENCODE_FOR_URI(?valueName))))),
            IRI(CONCAT("urn:", ENCODE_FOR_URI(?valueName)))) AS ?object)
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
