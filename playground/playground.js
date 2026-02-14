import { markdownToRdf } from './src/stream-markdown-to-rdf.js'
import { Store } from 'n3'
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite'
import Serializer from '@rdfjs/serializer-turtle'
import { ns } from './src/namespaces.js'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'

// Load language components
import 'prismjs/components/prism-turtle.min.js'

const examples = {
  emphasis: {
    name: 'Dream Team (Emphasis)',
    markdown: `# Dream team

## Bob
*knows* Alice

## Alice
*likes* Icecream`,
    sparql: `PREFIX md: <http://example.org/markdown#>
PREFIX fx: <http://sparql.xyz/facade-x/ns/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX : <http://example.org/>

CONSTRUCT {
  # Team
  ?team a :Team ;
    :name ?teamName ;
    :hasMember ?person .

  # Person with relationships
  ?person a foaf:Person ;
    foaf:name ?personName ;
    ?predicate ?object .
}
WHERE {
  # H1 Section = Team
  ?doc a md:Document ;
    rdf:_1 ?teamSection .

  ?teamSection a md:Section ;
    rdf:_1 [ a md:Heading ; fx:text ?teamName ] ;
    ?idx ?personSection .

  FILTER(?idx != rdf:_1)

  # H2 Section = Person
  ?personSection a md:Section ;
    rdf:_1 [ a md:Heading ; fx:text ?personName ] ;
    rdf:_2 [ a md:Paragraph ;
             rdf:_1 [ a md:Emphasis ;
                      rdf:_1 [ fx:raw ?relationshipName ] ] ;
             rdf:_2 [ a md:Text ;
                      fx:raw ?objectRaw ] ] .

  BIND(REPLACE(?objectRaw, "^ ", "") AS ?objectName)
  BIND(IRI(CONCAT("urn:", REPLACE(?teamName, " ", "_"))) AS ?team)
  BIND(IRI(CONCAT("urn:", ?personName)) AS ?person)
  BIND(IRI(CONCAT("urn:", ?objectName)) AS ?object)

  BIND(IF(?relationshipName = "knows", foaf:knows,
       IF(?relationshipName = "likes", :likes,
          IRI(CONCAT(str(:), ?relationshipName)))) AS ?predicate)
}`
  },
  explicit: {
    name: 'Entities (Explicit)',
    markdown: `# Entities

## Dream Team

*is a* Team

*has member* Bob

*has member* Alice

## Bob

*is a* Person

*knows* Alice

## Alice

*is a* Person

*likes* Icecream`,
    sparql: `PREFIX md: <http://example.org/markdown#>
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
    rdf:_1 [ a md:Heading ; fx:text ?entityName ] .

  # Get all paragraphs (property statements)
  ?section ?idx ?paragraph .
  FILTER(?idx != rdf:_1)

  ?paragraph a md:Paragraph ;
    rdf:_1 [ a md:Emphasis ; rdf:_1 [ fx:raw ?propertyName ] ] ;
    rdf:_2 [ a md:Text ; fx:raw ?valueRaw ] .

  BIND(REPLACE(?valueRaw, "^ ", "") AS ?valueName)
  BIND(IRI(CONCAT("urn:", REPLACE(?entityName, " ", "_"))) AS ?entity)

  # Handle "is a" for rdf:type
  BIND(IF(?propertyName = "is a", rdf:type,
        IF(?propertyName = "has member", :hasMember,
        IF(?propertyName = "knows", foaf:knows,
        IF(?propertyName = "likes", :likes,
           IRI(CONCAT(str(:), REPLACE(?propertyName, " ", "_"))))))) AS ?predicate)

  # Determine if value is a type or entity
  BIND(IF(?propertyName = "is a",
          IF(?valueName = "Team", :Team,
          IF(?valueName = "Person", foaf:Person,
             IRI(CONCAT(str(:), ?valueName)))),
          IRI(CONCAT("urn:", REPLACE(?valueName, " ", "_")))) AS ?object)
}`
  },
  lists: {
    name: 'Nested Lists',
    markdown: `# Teams

## Dream team
- Bob
  - Knows
    - Alice
- Alice
  - Likes
    - Icecream`,
    sparql: `PREFIX md: <http://example.org/markdown#>
PREFIX fx: <http://sparql.xyz/facade-x/ns/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX : <http://example.org/>

CONSTRUCT {
  ?team a :Team ;
    :name ?teamName ;
    :hasMember ?person .

  ?person a foaf:Person ;
    foaf:name ?personName ;
    ?predicate ?object .
}
WHERE {
  # H2 Section = Team
  ?teamSection a md:Section ;
    rdf:_1 [ a md:Heading ; fx:text ?teamName ] ;
    rdf:_2 ?mainList .

  # Main list contains people
  ?mainList a md:List ;
    ?personIdx ?personItem .

  # Each list item is a person
  ?personItem a md:List_item ;
    rdf:_1 [ a md:Paragraph ; fx:raw ?personName ] ;
    rdf:_2 ?relationshipList .

  # Nested list contains relationships
  ?relationshipList a md:List ;
    ?relIdx ?relationshipItem .

  ?relationshipItem a md:List_item ;
    rdf:_1 [ a md:Paragraph ; fx:raw ?relationshipName ] ;
    rdf:_2 [ a md:List ;
             rdf:_1 [ a md:List_item ;
                      rdf:_1 [ a md:Paragraph ; fx:raw ?objectName ] ] ] .

  BIND(IRI(CONCAT("urn:", REPLACE(?teamName, " ", "_"))) AS ?team)
  BIND(IRI(CONCAT("urn:", ?personName)) AS ?person)
  BIND(IRI(CONCAT("urn:", ?objectName)) AS ?object)

  BIND(IF(LCASE(?relationshipName) = "knows", foaf:knows,
       IF(LCASE(?relationshipName) = "likes", :likes,
          IRI(CONCAT(str(:), LCASE(?relationshipName))))) AS ?predicate)
}`
  },
  tables: {
    name: 'Tables',
    markdown: `# Entities

## Teams

| Person | Team       |
|--------|------------|
| Bob    | Dream team |
| Alice  | Dream team |

## Relations

| Person | Knows |
|--------|-------|
| Bob    | Alice |

## Preferences

| Person | Likes    |
|--------|----------|
| Alice  | Icecream |`,
    sparql: `PREFIX md: <http://example.org/markdown#>
PREFIX fx: <http://sparql.xyz/facade-x/ns/>
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
  # Teams section
  {
    ?teamsSection a md:Section ;
      rdf:_1 [ a md:Heading ; fx:text "Teams" ] ;
      rdf:_2 ?teamsTable .

    ?teamsTable a md:Table ;
      ?rowIdx ?row .

    FILTER(?rowIdx != rdf:_1)  # Skip header

    ?row a md:Table_row ;
      rdf:_1 [ a md:Table_cell ;
               rdf:_1 [ fx:content ?personName ] ] ;
      rdf:_2 [ a md:Table_cell ;
               rdf:_1 [ fx:content ?teamName ] ] .

    BIND(IRI(CONCAT("urn:", REPLACE(?teamName, " ", "_"))) AS ?team)
    BIND(IRI(CONCAT("urn:", ?personName)) AS ?person)
  }
  UNION
  # Relations section
  {
    ?relationsSection a md:Section ;
      rdf:_1 [ a md:Heading ; fx:text "Relations" ] ;
      rdf:_2 ?relationsTable .

    ?relationsTable a md:Table ;
      ?rowIdx2 ?row2 .

    FILTER(?rowIdx2 != rdf:_1)

    ?row2 a md:Table_row ;
      rdf:_1 [ a md:Table_cell ;
               rdf:_1 [ fx:content ?person1Name ] ] ;
      rdf:_2 [ a md:Table_cell ;
               rdf:_1 [ fx:content ?person2Name ] ] .

    BIND(IRI(CONCAT("urn:", ?person1Name)) AS ?person1)
    BIND(IRI(CONCAT("urn:", ?person2Name)) AS ?person2)
  }
  UNION
  # Preferences
  {
    ?prefsSection a md:Section ;
      rdf:_1 [ a md:Heading ; fx:text "Preferences" ] ;
      rdf:_2 ?prefsTable .

    ?prefsTable a md:Table ;
      ?rowIdx3 ?row3 .

    FILTER(?rowIdx3 != rdf:_1)

    ?row3 a md:Table_row ;
      rdf:_1 [ a md:Table_cell ;
               rdf:_1 [ fx:content ?person3Name ] ] ;
      rdf:_2 [ a md:Table_cell ;
               rdf:_1 [ fx:content ?objectName ] ] .

    BIND(IRI(CONCAT("urn:", ?person3Name)) AS ?person3)
    BIND(IRI(CONCAT("urn:", ?objectName)) AS ?object)
  }
}`
  },
  wikilinks: {
    name: 'Wikilinks',
    markdown: `# Dream Team

[[Bob]] knows [[Alice]]
[[Alice]] likes [[Icecream]]

Members: [[Bob]], [[Alice]]`,
    sparql: `PREFIX md: <http://example.org/markdown#>
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

  # Relationship statements
  {
    ?teamSection ?idx ?para .
    FILTER(?idx != rdf:_1)

    ?para a md:Paragraph ;
      rdf:_1 [ a md:Wikilink ; fx:text ?subjectName ] ;
      rdf:_2 [ a md:Text ; fx:raw ?relationshipRaw ] ;
      rdf:_3 [ a md:Wikilink ; fx:text ?objectName ] .

    BIND(REPLACE(REPLACE(?relationshipRaw, "^ ", ""), " $", "") AS ?relationshipName)
    BIND(IRI(CONCAT("urn:", REPLACE(?teamName, " ", "_"))) AS ?team)
    BIND(IRI(CONCAT("urn:", ?subjectName)) AS ?subject)
    BIND(IRI(CONCAT("urn:", ?objectName)) AS ?object)

    BIND(IF(?relationshipName = "knows", foaf:knows,
         IF(?relationshipName = "likes", :likes,
            IRI(CONCAT(str(:), ?relationshipName)))) AS ?predicate)
  }
  UNION
  # Members list
  {
    ?teamSection ?idx2 ?membersPara .
    FILTER(?idx2 != rdf:_1)

    ?membersPara a md:Paragraph ;
      rdf:_1 [ a md:Text ; fx:raw ?membersPrefix ] .

    FILTER(CONTAINS(?membersPrefix, "Members:"))

    ?membersPara ?linkIdx [ a md:Wikilink ; fx:text ?memberName ] .

    BIND(IRI(CONCAT("urn:", REPLACE(?teamName, " ", "_"))) AS ?team)
    BIND(IRI(CONCAT("urn:", ?memberName)) AS ?member)
  }
}`
  }
};

let currentExample = 'emphasis';
let isProcessing = false;

// Reusable QueryEngine instance (avoid recreation overhead)
const queryEngine = new QueryEngine();

// Helper to convert namespace functions to plain array
function toPlain(prefixes) {
  const result = [];
  for (const [key, value] of Object.entries({ ...prefixes })) {
    result.push([key, value()]);
  }
  return result;
}

// Helper to serialize quads to Turtle
async function quadsToTurtle(quads) {
  const store = new Store(quads);
  const serializer = new Serializer({
    prefixes: toPlain(ns)
  });
  return serializer.transform(store);
}

// Process markdown and execute CONSTRUCT in one pass (avoid duplicate parsing)
async function processMarkdown(markdown, sparqlQuery) {
  try {
    // Parse markdown once
    const facadeQuads = await markdownToRdf(markdown);

    // Serialize facade
    const facadeTurtle = await quadsToTurtle(facadeQuads);

    // Execute CONSTRUCT using the same facade quads
    const store = new Store(facadeQuads);
    const result = await queryEngine.queryQuads(sparqlQuery, {
      sources: [store]
    });

    const semanticQuads = await result.toArray();
    const semanticTurtle = await quadsToTurtle(semanticQuads);

    return { facadeTurtle, semanticTurtle };
  } catch (error) {
    console.error('Error processing markdown:', error);
    const errorMsg = `Error: ${error.message}\n\n${error.stack || ''}`;
    return { facadeTurtle: errorMsg, semanticTurtle: errorMsg };
  }
}

async function updateDisplay() {
  console.log('updateDisplay called, currentExample:', currentExample);
  if (isProcessing) {
    console.log('Already processing, skipping');
    return;
  }
  isProcessing = true;

  try {
    const example = examples[currentExample];
    const markdown = example.markdown;

    console.log('Example:', example.name);

    document.getElementById('markdown-input').value = markdown;

    // Update SPARQL query
    const sparqlEl = document.getElementById('sparql-query');
    sparqlEl.textContent = example.sparql;

    console.log('Processing markdown (single pass)...');
    // Process markdown once, generate both facade and semantic RDF
    const { facadeTurtle, semanticTurtle } = await processMarkdown(markdown, example.sparql);
    console.log('Processing complete - Facade:', facadeTurtle.length, 'chars, Semantic:', semanticTurtle.length, 'chars');

    // Update both at once to avoid flickering
    const facadeEl = document.getElementById('facade-output');
    const semanticEl = document.getElementById('semantic-output');
    facadeEl.textContent = facadeTurtle;
    semanticEl.textContent = semanticTurtle;
  } catch (error) {
    console.error('Error updating display:', error);
    const facadeEl = document.getElementById('facade-output');
    const semanticEl = document.getElementById('semantic-output');
    facadeEl.textContent = `Error: ${error.message}\n\n${error.stack || ''}`;
    semanticEl.textContent = `Error: ${error.message}\n\n${error.stack || ''}`;
  } finally {
    isProcessing = false;
    console.log('updateDisplay complete');
  }
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentExample = tab.dataset.example;
    updateDisplay();
  });
});

// Markdown editing with debounce
let editTimeout;
document.getElementById('markdown-input').addEventListener('input', async () => {
  clearTimeout(editTimeout);
  editTimeout = setTimeout(async () => {
    if (isProcessing) return; // Prevent multiple concurrent updates

    const markdown = document.getElementById('markdown-input').value;
    const example = examples[currentExample];

    isProcessing = true;

    try {
      // Process markdown once, get both results
      const { facadeTurtle, semanticTurtle } = await processMarkdown(markdown, example.sparql);

      // Update both at once to avoid flickering
      const facadeEl = document.getElementById('facade-output');
      const semanticEl = document.getElementById('semantic-output');
      facadeEl.textContent = facadeTurtle;
      semanticEl.textContent = semanticTurtle;
    } catch (error) {
      console.error('Error processing markdown:', error);
      const facadeEl = document.getElementById('facade-output');
      const semanticEl = document.getElementById('semantic-output');
      facadeEl.textContent = `Error: ${error.message}`;
      semanticEl.textContent = `Error: ${error.message}`;
    } finally {
      isProcessing = false;
    }
  }, 500); // Reduced debounce since processing is faster now
});

// Initial load - call directly since module loads after DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateDisplay);
} else {
  // DOM already loaded
  updateDisplay();
}
