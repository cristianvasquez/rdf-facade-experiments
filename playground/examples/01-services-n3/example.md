---
title: Services Catalog (N3 Rules)
description: Two tables → Services and Maintainers, mapped with N3 rules
facade: facade-remark
n3rules: |
  @prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
  @prefix remark: <http://example.org/remark#> .
  @prefix facade: <http://example.org/facade-remark#> .
  @prefix foaf:   <http://xmlns.com/foaf/0.1/> .
  @prefix dct:    <http://purl.org/dc/terms/> .
  @prefix log:    <http://www.w3.org/2000/10/swap/log#> .
  @prefix :       <http://example.org/data#> .

  # ══════════════════════════════════════════════════════════════════════════════
  # Pattern declarations (end-user configuration)
  # ══════════════════════════════════════════════════════════════════════════════

  :servicesPattern a :TablePattern ;
      :hasTitle  "Services" ;
      :hasColumn ("Name"   :svcName   :svcUrl)    ,
                 ("Type"   :svcType   :svcTypeUrl) ,
                 ("Status" :svcStatus :svcStatusUrl) .

  :maintainersPattern a :TablePattern ;
      :hasTitle  "Maintainers" ;
      :hasColumn ("Service" :mService  :mServiceUrl) ,
                 ("Person"  :mPerson   :mPersonUrl)  ,
                 ("Email"   :mEmail    :mEmailUrl)   .

  # ══════════════════════════════════════════════════════════════════════════════
  # Domain mapping (end-user semantic output)
  # ══════════════════════════════════════════════════════════════════════════════

  {
      ?table :matchedBy :servicesPattern .
      ?row :dataRowOf ?table ;
           :svcName   ?name ;
           :svcType   ?type ;
           :svcStatus ?status ;
           :svcUrl    ?url .
      ?endpointIRI log:uri ?url .
  } log:query {
      ?row a :Service ;
           :name     ?name ;
           :type     ?type ;
           :status   ?status ;
           :endpoint ?endpointIRI .
  } .

  {
      ?table :matchedBy :maintainersPattern .
      ?row :dataRowOf ?table ;
           :mService  ?svc  ;
           :mPerson   ?name ;
           :mEmailUrl ?email .
  } log:query {
      ?row a foaf:Person ;
           foaf:name   ?name ;
           foaf:mbox   ?email ;
           dct:subject ?svc .
  } .

  # ── Link persons to their service resource ────────────────────────────────────

  {
      ?svcTable  :matchedBy :servicesPattern .
      ?svcRow    :dataRowOf ?svcTable ; :svcName ?name .
      ?mTable    :matchedBy :maintainersPattern .
      ?personRow :dataRowOf ?mTable   ; :mService ?name .
  } log:query {
      ?personRow :maintains ?svcRow .
  } .

  # ══════════════════════════════════════════════════════════════════════════════
  # Table plugin (reusable machinery — adapted from services.n3)
  # Note: remark: = node types, facade: = properties
  # ══════════════════════════════════════════════════════════════════════════════

  # ── Cell normalization ────────────────────────────────────────────────────────

  { ?cell a remark:tableCell ;
          facade:children [ a remark:text ; facade:value ?v ] .
  } => { ?cell :textValue ?v . } .

  { ?cell a remark:tableCell ;
          facade:children [ a remark:link ;
                             facade:children [ a remark:text ; facade:value ?v ] ] .
  } => { ?cell :textValue ?v . } .

  { ?cell a remark:tableCell ;
          facade:children [ a remark:link ; facade:url ?u ] .
  } => { ?cell :linkUrl ?u . } .

  # ── Match heading ↔ table via pattern title ───────────────────────────────────

  {
      ?pattern a :TablePattern ; :hasTitle ?text .
      ?heading a remark:heading ;
               facade:children [ a remark:text ; facade:value ?text ] ,
                                ?table .
      ?table a remark:table .
  } => {
      ?table :matchedBy ?pattern ;
             :heading   ?heading .
  } .

  # ── Learn column positions from the (:label :textPred :linkPred) triples ──────

  {
      ?pattern a :TablePattern ;
               :hasColumn (?label ?textPred ?linkPred) .
      ?table :matchedBy ?pattern ;
             facade:children [ a remark:tableRow ; facade:children ?cell ] .
      ?cell :textValue ?label ;
            facade:position [ facade:start [ facade:column ?col ] ] .
  } => {
      ?table :colText (?col ?textPred) ;
             :colLink (?col ?linkPred) .
  } .

  # ── Mark data rows (any row that carries at least one link) ───────────────────

  {
      ?table :matchedBy ?pattern ;
             facade:children ?row .
      ?row a remark:tableRow ;
           facade:children [ a remark:tableCell ;
                              facade:children [ a remark:link ] ] .
  } => {
      ?row :dataRowOf ?table .
  } .

  # ── Project text values onto each data row ────────────────────────────────────

  {
      ?table :colText (?col ?textPred) ;
             facade:children ?row .
      ?row :dataRowOf ?table ;
           facade:children ?cell .
      ?cell facade:position [ facade:start [ facade:column ?col ] ] ;
            :textValue ?val .
  } => {
      ?row ?textPred ?val .
  } .

  # ── Project link URLs onto each data row ──────────────────────────────────────

  {
      ?table :colLink (?col ?linkPred) ;
             facade:children ?row .
      ?row :dataRowOf ?table ;
           facade:children ?cell .
      ?cell facade:position [ facade:start [ facade:column ?col ] ] ;
            :linkUrl ?url .
  } => {
      ?row ?linkPred ?url .
  } .
---

# Services

| Name                                | Type    | Status     |
|-------------------------------------|---------|------------|
| [Auth](http://example.org/auth)     | REST    | active     |
| [Query](http://example.org/query)   | GraphQL | active     |
| [Notify](http://example.org/notify) | gRPC    | deprecated |

# Maintainers

| Service | Person | Email             |
|---------|--------|-------------------|
| Auth    | Alice  | alice@example.org |
| Query   | Bob    | bob@example.org   |
| Notify  | Carol  | carol@example.org |
