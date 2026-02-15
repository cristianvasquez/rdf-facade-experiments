---
title: Tables
description: Using markdown tables to represent structured data
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
      :hasMember ?person .

    ?person a foaf:Person ;
      foaf:name ?personName .

    ?person1 foaf:knows ?person2 .

    ?person3 :likes ?object .
  }
  WHERE {
    # Teams table
    {
      ?table a rmk:table ;
        fxr:children ?row .

      ?row fxr:children ?cell1, ?cell2 .
      FILTER(?cell1 != ?cell2)

      ?cell1 fxr:children [ a rmk:text ; fxr:value ?name ] .
      ?cell2 fxr:children [ a rmk:text ; fxr:value "Team Alpha" ] .

      FILTER(?name != "Person" && ?name != "Team")

      BIND(IRI("urn:Team%20Alpha") AS ?team)
      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?name))) AS ?person)
      BIND("Team Alpha" AS ?teamName)
      BIND(?name AS ?personName)
    }
    UNION
    # Relations table
    {
      ?table2 a rmk:table ;
        fxr:children ?row2 .

      ?row2 fxr:children ?cell3, ?cell4 .
      FILTER(?cell3 != ?cell4)

      ?cell3 fxr:children [ a rmk:text ; fxr:value ?p1name ] .
      ?cell4 fxr:children [ a rmk:text ; fxr:value ?p2name ] .

      FILTER(?p2name != "Team Alpha" && ?p2name != "Icecream")
      FILTER(?p1name != "Person" && ?p2name != "Knows")

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?p1name))) AS ?person1)
      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?p2name))) AS ?person2)
    }
    UNION
    # Preferences table
    {
      ?table3 a rmk:table ;
        fxr:children ?row3 .

      ?row3 fxr:children ?cell5, ?cell6 .
      FILTER(?cell5 != ?cell6)

      ?cell5 fxr:children [ a rmk:text ; fxr:value ?p3name ] .
      ?cell6 fxr:children [ a rmk:text ; fxr:value "Icecream" ] .

      FILTER(?p3name != "Person" && ?p3name != "Likes")

      BIND(IRI(CONCAT("urn:", ENCODE_FOR_URI(?p3name))) AS ?person3)
      BIND(IRI("urn:Icecream") AS ?object)
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
