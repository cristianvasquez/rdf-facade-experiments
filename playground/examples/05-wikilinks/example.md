---
title: Claude Skill Definition
description: Parse Claude skill metadata from markdown with links
facade: facade-remark
construct: |
  PREFIX rmk: <http://example.org/remark#>
  PREFIX fxr: <http://example.org/facade-remark#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX skill: <http://example.org/skill#>
  PREFIX dc: <http://purl.org/dc/terms/>

  CONSTRUCT {
    ?skillIri a skill:Skill ;
      dc:title ?skillName ;
      dc:description ?description ;
      skill:triggerPattern ?pattern ;
      skill:requiresTool ?tool ;
      skill:hasStep ?step .

    ?step a skill:Step ;
      skill:stepNumber ?stepNum ;
      skill:action ?action .
  }
  WHERE {
    ?root a rmk:root .

    # Extract skill name from H1
    OPTIONAL {
      ?h1 a rmk:heading ;
        fxr:depth "1" ;
        fxr:children [ a rmk:text ; fxr:value ?skillName ] .
    }

    # Extract description - only the actual description link, not the label
    OPTIONAL {
      ?descLink a rmk:link ;
        fxr:url "meta:description" ;
        fxr:children [ a rmk:text ; fxr:value ?description ] .

      # Filter out the "Description:" label link
      FILTER(?description != "Description:")
    }

    # Extract trigger patterns - list items with trigger: URLs
    OPTIONAL {
      ?listItem a rmk:listItem ;
        fxr:children [ a rmk:paragraph ;
          fxr:children ?patternLink ] .

      ?patternLink a rmk:link ;
        fxr:url ?patternUrl ;
        fxr:children [ a rmk:text ; fxr:value ?pattern ] .

      FILTER(STRSTARTS(str(?patternUrl), "trigger:"))
    }

    # Extract required tools - links with tool: prefix
    OPTIONAL {
      ?toolLink a rmk:link ;
        fxr:url ?toolUrl ;
        fxr:children [ a rmk:text ; fxr:value ?tool ] .

      FILTER(STRSTARTS(str(?toolUrl), "tool:"))
    }

    # Extract steps - list items with step: URLs
    OPTIONAL {
      ?stepListItem a rmk:listItem ;
        fxr:children [ a rmk:paragraph ;
          fxr:children ?stepLink ] .

      ?stepLink a rmk:link ;
        fxr:url ?stepUrl ;
        fxr:children [ a rmk:text ; fxr:value ?action ] .

      FILTER(STRSTARTS(str(?stepUrl), "step:"))

      # Extract step number from URL
      BIND(REPLACE(str(?stepUrl), "^step:", "") AS ?stepNum)
      BIND(IRI(CONCAT("urn:step:", ?stepNum)) AS ?step)
    }

    # Generate skill IRI from name
    BIND(IF(BOUND(?skillName),
           IRI(CONCAT("urn:skill:", ENCODE_FOR_URI(?skillName))),
           <urn:skill:unnamed>) AS ?skillIri)
  }
---

# Git Commit Assistant

[Description:](meta:description) [Automates git commits with semantic messages](meta:description)

## When to use

- [User asks to commit changes](trigger:commit-request)
- [Significant code changes are staged](trigger:staged-changes)
- [Work on a feature is complete](trigger:feature-complete)

## Required tools

Uses [Bash](tool:Bash) and [Read](tool:Read) to analyze changes.

## Steps

1. [Run git status and git diff](step:1)
2. [Analyze changes and draft commit message](step:2)
3. [Stage files and create commit](step:3)
4. [Verify commit success](step:4)