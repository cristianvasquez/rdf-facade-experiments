---
title: Wikilinks
description: Using [[wikilinks]] to reference entities
ignore: true
preserve-order: true
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX : <http://example.org/>

  CONSTRUCT {
    ?team a :Team ;
      :name ?teamName ;
      :hasMember ?member .

    ?subject a foaf:Person ;
      foaf:name ?subjectName ;
      ?predicate ?object .
  }
  WHERE {
    # Team section (H1)
    ?teamSection a md:Section ;
      rdf:_1 [ a md:Heading ; fx:text ?teamName ] .

    # Find relationship statements (paragraphs with wikilinks and text)
    {
      ?teamSection ?idx ?para .
      FILTER(?idx != rdf:_1)  # Skip heading

      ?para a md:Paragraph .

      # Pattern: [[Subject]] relationship [[Object]]
      ?para rdf:_1 [ a md:Wikilink ; fx:text ?subjectName ] .
      ?para rdf:_2 [ a md:Text ; fx:raw ?relationshipRaw ] .
      ?para rdf:_3 [ a md:Wikilink ; fx:text ?objectName ] .

      # Extract relationship name (trim spaces)
      BIND(REPLACE(REPLACE(?relationshipRaw, "^ ", ""), " $", "") AS ?relationshipName)

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?teamName))) AS ?team)
      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?subjectName))) AS ?subject)
      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?objectName))) AS ?object)

      # Map relationship to predicate
      BIND(IF(?relationshipName = "knows", foaf:knows,
           IF(?relationshipName = "likes", :likes,
              IRI(CONCAT(str(:), ?relationshipName)))) AS ?predicate)
    }
    UNION
    # Members list (paragraphs starting with "Members:")
    {
      ?teamSection ?idx2 ?membersPara .
      FILTER(?idx2 != rdf:_1)

      ?membersPara a md:Paragraph ;
        rdf:_1 [ a md:Text ; fx:raw ?membersPrefix ] .

      FILTER(CONTAINS(?membersPrefix, "Members:"))

      # Get wikilinks after "Members:"
      ?membersPara ?linkIdx [ a md:Wikilink ; fx:text ?memberName ] .

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?teamName))) AS ?team)
      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?memberName))) AS ?member)
    }
  }
---

# Team Alpha

[[Bob]] knows [[Alice]]
[[Alice]] likes [[Icecream]]

Members: [[Bob]], [[Alice]]
