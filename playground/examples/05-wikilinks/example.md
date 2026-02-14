---
title: Links
description: Using markdown links [text](urn:entity) to reference entities
facade: facade-remark
construct: |
  PREFIX rmk: <http://example.org/remark#>
  PREFIX fxr: <http://example.org/facade-remark#>
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
    ?root a rmk:root .

    # Team heading
    ?teamHeading a rmk:heading ;
      fxr:depth "1" ;
      fxr:children [ a rmk:text ; fxr:value ?teamName ] .

    # Find relationship statements (paragraphs with links and text)
    {
      ?para a rmk:paragraph .

      # Pattern: [Subject](urn:...) relationship [Object](urn:...)
      ?para fxr:children ?link1, ?textNode, ?link2 .

      ?link1 a rmk:link ;
        fxr:url ?subjectUrl ;
        fxr:children [ a rmk:text ; fxr:value ?subjectName ] .

      ?textNode a rmk:text ;
        fxr:value ?relationshipRaw .

      ?link2 a rmk:link ;
        fxr:url ?objectUrl ;
        fxr:children [ a rmk:text ; fxr:value ?objectName ] .

      # Extract relationship name (trim spaces)
      BIND(REPLACE(REPLACE(?relationshipRaw, "^ ", ""), " $", "") AS ?relationshipName)

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?teamName))) AS ?team)
      BIND(IRI(?subjectUrl) AS ?subject)
      BIND(IRI(?objectUrl) AS ?object)

      # Map relationship to predicate
      BIND(IF(?relationshipName = "knows", foaf:knows,
           IF(?relationshipName = "likes", :likes,
              IRI(CONCAT(str(:), ?relationshipName)))) AS ?predicate)
    }
    UNION
    # Members list (paragraphs starting with "Members:")
    {
      ?membersPara a rmk:paragraph ;
        fxr:children ?membersText .

      ?membersText a rmk:text ;
        fxr:value ?membersPrefix .

      FILTER(CONTAINS(?membersPrefix, "Members:"))

      # Get links in the same paragraph
      ?membersPara fxr:children ?memberLink .

      ?memberLink a rmk:link ;
        fxr:url ?memberUrl ;
        fxr:children [ a rmk:text ; fxr:value ?memberName ] .

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?teamName))) AS ?team)
      BIND(IRI(?memberUrl) AS ?member)
    }
  }
---

# Team Alpha

[Bob](urn:Bob) knows [Alice](urn:Alice)

[Alice](urn:Alice) likes [Icecream](urn:Icecream)

Members: [Bob](urn:Bob), [Alice](urn:Alice)
