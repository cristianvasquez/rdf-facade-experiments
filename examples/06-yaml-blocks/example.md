---
construct: |
  PREFIX md: <http://example.org/markdown#>
  PREFIX fx: <http://sparql.xyz/facade-x/ns/>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX : <http://example.org/>
  PREFIX xyz: <http://sparql.xyz/facade-x/data/>

  CONSTRUCT {
    ?team a :Team ;
      :name ?teamName ;
      :hasMember ?member .

    ?person a foaf:Person ;
      foaf:name ?personName ;
      foaf:knows ?knownPerson ;
      :likes ?likedThing .
  }
  WHERE {
    # Find the YAML code block and its parsed data
    ?codeBlock a md:Code_block ;
      fx:language "yaml" ;
      fx:data ?yamlRoot .

    # Parse YAML as Facade-X data structure
    # (This assumes YAML is parsed into RDF using sparql-anything or similar)
    # For now, we show the intended pattern - actual implementation
    # would need YAML parser integration

    # Teams
    {
      ?yamlRoot xyz:teams ?teamsList .
      ?teamsList ?teamIdx ?teamNode .

      ?teamNode xyz:name ?teamName ;
                xyz:members ?membersList .

      ?membersList ?memberIdx ?memberName .

      BIND(IRI(CONCAT("urn:", REPLACE(?teamName, " ", "_"))) AS ?team)
      BIND(IRI(CONCAT("urn:", ?memberName)) AS ?member)
    }
    UNION
    # People
    {
      ?yamlRoot xyz:people ?peopleList .
      ?peopleList ?personIdx ?personNode .

      ?personNode xyz:name ?personName .

      BIND(IRI(CONCAT("urn:", ?personName)) AS ?person)

      OPTIONAL {
        ?personNode xyz:knows ?knowsList .
        ?knowsList ?knowsIdx ?knownName .
        BIND(IRI(CONCAT("urn:", ?knownName)) AS ?knownPerson)
      }

      OPTIONAL {
        ?personNode xyz:likes ?likesList .
        ?likesList ?likesIdx ?likedName .
        BIND(IRI(CONCAT("urn:", ?likedName)) AS ?likedThing)
      }
    }
  }
---

# Entities

```yaml
teams:
  - name: Dream Team
    members:
      - Bob
      - Alice

people:
  - name: Bob
    knows:
      - Alice
  - name: Alice
    likes:
      - Icecream
```
