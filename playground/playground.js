import { markdownToRdf } from '../src/stream-markdown-to-rdf.js'
import { Store } from 'n3'
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite'
import Serializer from '@rdfjs/serializer-turtle'
import { ns } from '../src/namespaces.js'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'

// Load language components
import 'prismjs/components/prism-turtle.min.js'

// Load example files dynamically
const exampleFiles = import.meta.glob('./examples/*/example.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

// Parse frontmatter from markdown
function parseFrontmatter(markdown) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = markdown.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, content: markdown }
  }

  // Simple YAML parsing for our use case
  const frontmatterText = match[1]
  const content = match[2]
  const frontmatter = {}

  let currentKey = null
  let multilineValue = []

  for (const line of frontmatterText.split('\n')) {
    if (line.match(/^(\w+):\s*\|?\s*$/)) {
      // Start of a key
      if (currentKey && multilineValue.length > 0) {
        frontmatter[currentKey] = multilineValue.join('\n')
      }
      currentKey = line.match(/^(\w+):/)[1]
      multilineValue = []
    } else if (line.match(/^(\w+):\s*(.+)$/)) {
      // Simple key: value
      if (currentKey && multilineValue.length > 0) {
        frontmatter[currentKey] = multilineValue.join('\n')
        multilineValue = []
      }
      const [, key, value] = line.match(/^(\w+):\s*(.+)$/)
      currentKey = key
      frontmatter[key] = value === 'true' ? true : value === 'false' ? false : value
    } else if (currentKey && line.trim()) {
      // Continuation of multiline value
      multilineValue.push(line.replace(/^  /, ''))
    }
  }

  if (currentKey && multilineValue.length > 0) {
    frontmatter[currentKey] = multilineValue.join('\n')
  }

  return { frontmatter, content }
}

// Build examples object from loaded files
const examplesList = Object.entries(exampleFiles).map(([path, content]) => {
  const match = path.match(/\.\/examples\/(\d+-[^/]+)\/example\.md/)
  const id = match[1]
  const { frontmatter, content: markdown } = parseFrontmatter(content)

  return {
    id,
    name: id.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    markdown,
    sparql: frontmatter.construct || '',
    preserveOrder: frontmatter['preserve-order'] !== undefined ? frontmatter['preserve-order'] : true
  }
})

// Convert to object with friendly keys
const examples = {
  emphasis: examplesList.find(e => e.id.includes('emphasis')),
  explicit: examplesList.find(e => e.id.includes('explicit')),
  lists: examplesList.find(e => e.id.includes('lists')),
  tables: examplesList.find(e => e.id.includes('tables')),
  wikilinks: examplesList.find(e => e.id.includes('wikilinks'))
}

// Old hardcoded examples (backup/fallback)
const examplesOld = {
  emphasis: {
    name: 'Team Alpha (Emphasis)',
    useRdfsMember: false,
    markdown: `# Team Alpha

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
    useRdfsMember: true,
    markdown: `# Entities

## Team Alpha

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
    useRdfsMember: true,
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
    useRdfsMember: false,
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
    useRdfsMember: false,
    markdown: `# Team Alpha

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
async function processMarkdown(markdown, sparqlQuery, options = {}) {
  try {
    // Parse markdown once
    const facadeQuads = await markdownToRdf(markdown, options);

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

// Get current options for the current example
function getOptions() {
  const example = examples[currentExample];
  const preserveOrder = example.preserveOrder;
  return {
    useNumbered: preserveOrder,      // preserve-order: true → use numbered predicates
    useRdfsMember: !preserveOrder    // preserve-order: false → use rdfs:member
  };
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

    // Update preserve-order checkbox to match example's setting
    document.getElementById('preserve-order').checked = example.preserveOrder;

    // Update SPARQL query
    const sparqlEl = document.getElementById('sparql-query');
    sparqlEl.textContent = example.sparql;

    console.log('Processing markdown (single pass)...');
    // Process markdown once, generate both facade and semantic RDF
    const { facadeTurtle, semanticTurtle } = await processMarkdown(
      markdown,
      example.sparql,
      getOptions()
    );
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
      const { facadeTurtle, semanticTurtle } = await processMarkdown(
        markdown,
        example.sparql,
        getOptions()
      );

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

// Preserve order toggle - updates the current example's setting
document.getElementById('preserve-order').addEventListener('change', (e) => {
  const example = examples[currentExample];
  example.preserveOrder = e.target.checked;
  updateDisplay();
});

// Sync pipeline step visual state with panel state
function syncPipelineSteps() {
  document.querySelectorAll('.pipeline-step[data-toggle]').forEach(step => {
    const target = step.dataset.toggle;
    const panel = document.querySelector(`[data-panel="${target}"]`);
    if (panel.classList.contains('collapsed')) {
      step.classList.add('collapsed');
    } else {
      step.classList.remove('collapsed');
    }
  });
}

// Toggle panel and sync pipeline
function togglePanel(target) {
  const panel = document.querySelector(`[data-panel="${target}"]`);
  panel.classList.toggle('collapsed');
  syncPipelineSteps();
}

// Maximize/restore panel
function toggleMaximize(target) {
  const panel = document.querySelector(`[data-panel="${target}"]`);
  const workspace = document.querySelector('.workspace');

  if (panel.classList.contains('maximized')) {
    // Restore: remove maximized state
    panel.classList.remove('maximized');
    workspace.classList.remove('has-maximized');
  } else {
    // Maximize: hide others, show this one
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('maximized'));
    panel.classList.remove('collapsed'); // Ensure it's not collapsed
    panel.classList.add('maximized');
    workspace.classList.add('has-maximized');
    syncPipelineSteps();
  }
}

// Layout toggle (horizontal/vertical)
const layoutToggle = document.getElementById('layout-toggle');
const workspace = document.querySelector('.workspace');

layoutToggle.addEventListener('click', () => {
  const currentLayout = workspace.dataset.layout;
  const newLayout = currentLayout === 'horizontal' ? 'vertical' : 'horizontal';
  workspace.dataset.layout = newLayout;
  layoutToggle.querySelector('.layout-icon').textContent = newLayout === 'horizontal' ? '⚏' : '☰';
});

// Panel toggles (collapse/expand) from header buttons
document.querySelectorAll('.panel-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    togglePanel(toggle.dataset.target);
  });
});

// Pipeline step toggles
document.querySelectorAll('.pipeline-step[data-toggle]').forEach(step => {
  step.addEventListener('click', () => {
    togglePanel(step.dataset.toggle);
  });
});

// Panel title maximize/restore
document.querySelectorAll('.panel-title[data-maximize]').forEach(title => {
  title.addEventListener('click', () => {
    toggleMaximize(title.dataset.maximize);
  });
});

// ESC key to restore from maximized state
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const maximizedPanel = document.querySelector('.panel.maximized');
    if (maximizedPanel) {
      const target = maximizedPanel.dataset.panel;
      toggleMaximize(target);
    }
  }
});

// Initialize pipeline state
syncPipelineSteps();

// Initial load - call directly since module loads after DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateDisplay);
} else {
  // DOM already loaded
  updateDisplay();
}
