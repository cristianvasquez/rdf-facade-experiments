import YAML from 'yaml'
import { CanvasExampleComponent } from './CanvasExampleComponent.js'

// Parse frontmatter from markdown using proper YAML parser
function parseFrontmatter(markdown) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = markdown.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, content: markdown }
  }

  const frontmatterText = match[1]
  const content = match[2]

  try {
    const frontmatter = YAML.parse(frontmatterText)
    return { frontmatter, content }
  } catch (error) {
    console.error('Error parsing YAML frontmatter:', error)
    return { frontmatter: {}, content: markdown }
  }
}

// Load example files dynamically
const exampleFiles = import.meta.glob('./examples/*/example.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

// Build examples list from loaded files
const examples = Object.entries(exampleFiles)
  .map(([path, content]) => {
    const match = path.match(/\.\/examples\/(\d+-[^/]+)\/example\.md/)
    const id = match[1]
    const { frontmatter, content: markdown } = parseFrontmatter(content)

    return {
      id,
      title: frontmatter.title || id.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: frontmatter.description || '',
      markdown,
      sparql: frontmatter.construct || '',
      n3rules: frontmatter.n3rules || '',
      facade: frontmatter.facade || 'facade-x',
      preserveOrder: frontmatter['preserve-order'] !== undefined ? frontmatter['preserve-order'] : true,
      ignore: frontmatter.ignore || false
    }
  })
  .filter(ex => !ex.ignore)
  .sort((a, b) => a.id.localeCompare(b.id))

// State
let currentExample = null
let currentComponent = null

// Load an example
async function loadExample(exampleId) {
  const example = examples.find(ex => ex.id === exampleId)
  if (!example) return

  currentExample = example

  // Create component with example selector
  const container = document.getElementById('example-container')

  // Clean up previous component if exists
  if (currentComponent && currentComponent.destroy) {
    currentComponent.destroy()
  }

  currentComponent = new CanvasExampleComponent(example, container, examples, loadExample)
  await currentComponent.setMarkdown(example.markdown)
}

// Initialize - load first example by default
if (examples.length > 0) {
  loadExample(examples[0].id)
}
