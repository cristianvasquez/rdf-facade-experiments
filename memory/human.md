
# fleeting notes
this file is for fleeting notes.
the ai will not mess with these files.
you don't have to worry about clean specs or anything.
just dump stuff here as needed.

# use scratchpad
the scratchpad section below is meant as an area to compose messages to be pasted into the claude session.
this way you get the normal editing behaviour of markdown.
and you also don't have to worry about your message being lost after accidentally hitting arrow+up one time too often.

# write some specs
to get started with spec driven development,
see seed.md or run /eidos:help

# remove default notes
wait i didnt write these notes, i should remove them


________________________________________
TEMP


________________________________________
SCRATCHPAD LEAVE AT BOTTOM


# FUTURE don't plan for this yet

## Bidirectionality in Facade

What I would like is to

1. Transform to Facade-x
2.  Modify things in the garph
3. Update the sources (or highlight them)

This is a problem already studied with Abstract Syntax Trees

## Syntax trees come in two flavours

- Concrete Syntax tree (CST)
	- Structures taht represent all details of the representation. One can go from the CST to the source representation
- Abstract Syntax tree (AST)
	- Structure that only represent the content in a compact and useful way

## Markown facade

There are several markdown to RDF parsers around to go from text to RDF and viceversa. This enables direct interaction with LLM agents and allows for literaty authoring of graphs in general, given that markdown can be linked with other markown by design. Now, the expected syntax expected by all those parsers happens to be opinionated. Aligneds to the needs of each author.

One can go a bit further into making this a bit more general. Incorporating a data-facade and being explicit on the semantics of the markdown through a mapping of the form of CONSTRUCT [^1] or inference rules. THe mapping is part of, or attached to the document itself and can be used to support the production of RDF, but also, in some cases the update of the markdown itself.

For example one author might want to represent:

TODO example

THe semantics are declared through the CONSTRUCT that acts as a transform of the document graph to the RDF graph.

The construct itself can also be represented as a graph, so one can trace the connection of some part of the resulting RDF to the source segments of the document

## Spatial semantics

There are several wys to make the semantics explicit in a mapping. For example the document has a contanment strucutre, the elements can have color, font size and so on. In Excel you have merged cells. The semantics of containment can be expresse as simple N3 rules and the relations are then derived
## Some questions

- Where do the mappings live?
	- A URI in the frontmatter?
	- Probably to start with the mappings in the frontmatter will be simpler at the start
- What is the role of SHACL?
- How does a claude SKILL will look like? how the user is interrogated to get the spatial semantics of the document?

[^1]: Method already in use by SPARQL Anything

