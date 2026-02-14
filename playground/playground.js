import YAML from 'yaml'
import { ExampleComponent } from './ExampleComponent.js'

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
      preserveOrder: frontmatter['preserve-order'] !== undefined ? frontmatter['preserve-order'] : true,
      ignore: frontmatter.ignore || false
    }
  })
  .filter(ex => !ex.ignore)
  .sort((a, b) => a.id.localeCompare(b.id))

// State
let currentExample = null
let currentComponent = null

// Render menu
function renderMenu() {
  const menu = document.getElementById('example-menu')
  menu.innerHTML = examples.map(ex => `
    <button class="menu-item" data-example-id="${ex.id}">
      <span class="menu-item-title">${ex.title}</span>
      ${ex.description ? `<span class="menu-item-description">${ex.description}</span>` : ''}
    </button>
  `).join('')

  // Attach click handlers
  menu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const exampleId = item.dataset.exampleId
      loadExample(exampleId)
    })
  })
}

// Load an example
async function loadExample(exampleId) {
  const example = examples.find(ex => ex.id === exampleId)
  if (!example) return

  currentExample = example

  // Update menu active state
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.exampleId === exampleId)
  })

  // Show example container, hide menu
  document.getElementById('menu-view').style.display = 'none'
  document.getElementById('example-view').style.display = 'block'

  // Create component
  const container = document.getElementById('example-container')
  currentComponent = new ExampleComponent(example, container)
  await currentComponent.setMarkdown(example.markdown)
}

// Back to menu
function showMenu() {
  document.getElementById('menu-view').style.display = 'block'
  document.getElementById('example-view').style.display = 'none'
  currentExample = null
  currentComponent = null
}

// Initialize
renderMenu()

// Back button handler
document.getElementById('back-to-menu').addEventListener('click', showMenu)

// Load first example by default
if (examples.length > 0) {
  loadExample(examples[0].id)
}