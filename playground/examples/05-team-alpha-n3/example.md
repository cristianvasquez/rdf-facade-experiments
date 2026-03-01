---
title: Team Alpha (N3 Rules)
description: Same document as example-01, using remark tree facade and N3 rules instead of SPARQL CONSTRUCT
facade: facade-remark
n3rules: |
  @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
  @prefix rmk: <http://example.org/remark#> .
  @prefix fxr: <http://example.org/facade-remark#> .
  @prefix foaf: <http://xmlns.com/foaf/0.1/> .
  @prefix : <http://example.org/> .

  # H1 headings are teams
  { ?h1 a rmk:heading ; fxr:depth "1" . } => { ?h1 a :Team . } .

  # Extract team name from inline text of h1
  {
    ?h1 a rmk:heading ; fxr:depth "1" ; fxr:children ?t .
    ?t a rmk:text ; fxr:value ?name .
  } => { ?h1 :name ?name . } .

  # H2 headings under H1 are persons and team members
  {
    ?h1 a rmk:heading ; fxr:depth "1" ; fxr:children ?h2 .
    ?h2 a rmk:heading ; fxr:depth "2" .
  } => { ?h2 a foaf:Person . ?h1 :hasMember ?h2 . } .

  # Extract person name from inline text of h2
  {
    ?h2 a rmk:heading ; fxr:depth "2" ; fxr:children ?t .
    ?t a rmk:text ; fxr:value ?name .
  } => { ?h2 foaf:name ?name . } .

  # Extract relationship predicate from emphasis in paragraph under h2
  {
    ?h2 a rmk:heading ; fxr:depth "2" ; fxr:children ?para .
    ?para a rmk:paragraph ; fxr:children ?emph .
    ?emph a rmk:emphasis ; fxr:children ?t .
    ?t a rmk:text ; fxr:value ?rel .
  } => { ?h2 :relationship ?rel . } .

  # Extract relationship target from text node in paragraph under h2
  {
    ?h2 a rmk:heading ; fxr:depth "2" ; fxr:children ?para .
    ?para a rmk:paragraph ; fxr:children ?t .
    ?t a rmk:text ; fxr:value ?target .
  } => { ?h2 :target ?target . } .
---

# Team Alpha

## Bob
*knows* Alice

## Alice
*likes* Icecream
