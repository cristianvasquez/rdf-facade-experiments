import { markdownToRdf as facadeXToRdf } from '../src/streaming-facade-x.js'
import { markdownToRdf as remarkToRdf } from '../src/remark-facade.js'
import { Store } from 'n3'
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite'
import Serializer from '@rdfjs/serializer-turtle'
import { ns } from '../src/namespaces.js'

// Reusable QueryEngine instance
const queryEngine = new QueryEngine()

// Helper to convert namespace functions to plain array
function toPlain(prefixes) {
  const result = []
  for (const [key, value] of Object.entries({ ...prefixes })) {
    result.push([key, value()])
  }
  return result
}

// Helper to serialize quads to Turtle
async function quadsToTurtle(quads) {
  const store = new Store(quads)
  const serializer = new Serializer({
    prefixes: toPlain(ns)
  })
  return serializer.transform(store)
}

// Process markdown and execute CONSTRUCT in one pass
async function processMarkdown(markdown, sparqlQuery, options = {}) {
  try {
    const facade = options.facade || 'facade-x'
    let facadeQuads

    if (facade === 'facade-remark') {
      facadeQuads = remarkToRdf(markdown)
    } else {
      facadeQuads = await facadeXToRdf(markdown, options)
    }

    const facadeTurtle = await quadsToTurtle(facadeQuads)

    const store = new Store(facadeQuads)
    const result = await queryEngine.queryQuads(sparqlQuery, {
      sources: [store]
    })

    const semanticQuads = await result.toArray()
    const semanticTurtle = await quadsToTurtle(semanticQuads)

    return { facadeTurtle, semanticTurtle }
  } catch (error) {
    console.error('Error processing markdown:', error)
    const errorMsg = `Error: ${error.message}\n\n${error.stack || ''}`
    return { facadeTurtle: errorMsg, semanticTurtle: errorMsg }
  }
}

export class ExampleComponent {
  constructor(example, containerElement, allExamples = [], onExampleChange = null) {
    this.example = example
    this.container = containerElement
    this.allExamples = allExamples
    this.onExampleChange = onExampleChange
    this.facade = example.facade || 'facade-x'
    this.preserveOrder = example.preserveOrder
    this.layout = 'horizontal'
    this.isProcessing = false
    this.editTimeout = null

    this.render()
    this.attachEventListeners()
  }

  renderExampleOptions() {
    if (!this.allExamples || this.allExamples.length === 0) return ''
    return this.allExamples.map(ex =>
      `<option value="${ex.id}" ${ex.id === this.example.id ? 'selected' : ''}>
        ${ex.title}
      </option>`
    ).join('')
  }

  getOptions() {
    return {
      facade: this.facade,
      useNumbered: this.preserveOrder,
      useRdfsMember: !this.preserveOrder
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="example-header">
        <div class="example-info">
          <select class="example-selector" id="example-selector">
            ${this.renderExampleOptions()}
          </select>
          ${this.example.description ? `<p class="description">${this.example.description}</p>` : ''}
        </div>
        <button class="layout-toggle" data-layout-toggle title="Toggle layout">
          <span class="layout-icon">⚏</span> Layout
        </button>
      </div>

      <div class="pipeline">
        <div class="pipeline-step markdown" data-toggle="markdown">Markdown<br>Input</div>
        <div class="pipeline-arrow">→</div>
        <div class="pipeline-step facade" data-toggle="facade">Facade<br>RDF</div>
        <div class="pipeline-arrow">→</div>
        <div class="pipeline-step sparql" data-toggle="sparql">SPARQL<br>Transform</div>
        <div class="pipeline-arrow">→</div>
        <div class="pipeline-step semantic" data-toggle="semantic">Target<br>RDF</div>
      </div>

      <div class="workspace" data-layout="horizontal">
        <div class="panel" data-panel="markdown">
          <div class="panel-header markdown">
            <span class="panel-title" data-maximize="markdown">
              Markdown Input
              <span class="badge">editable</span>
            </span>
            <button class="panel-toggle" data-target="markdown">▼</button>
          </div>
          <div class="panel-content">
            <textarea class="markdown-input" spellcheck="false"></textarea>
          </div>
        </div>

        <div class="panel" data-panel="facade">
          <div class="panel-header facade">
            <span class="panel-title" data-maximize="facade">
              Facade RDF
              <span class="badge">intermediate</span>
            </span>
            <label class="panel-option">
              <input type="checkbox" class="preserve-order" ${this.preserveOrder ? 'checked' : ''}>
              <span>Preserve order</span>
            </label>
            <button class="panel-toggle" data-target="facade">▼</button>
          </div>
          <div class="panel-content">
            <pre><code class="facade-output language-turtle"></code></pre>
          </div>
        </div>

        <div class="panel" data-panel="sparql">
          <div class="panel-header sparql">
            <span class="panel-title" data-maximize="sparql">
              SPARQL CONSTRUCT
              <span class="badge">mapping</span>
            </span>
            <button class="panel-toggle" data-target="sparql">▼</button>
          </div>
          <div class="panel-content">
            <pre><code class="sparql-query"></code></pre>
          </div>
        </div>

        <div class="panel" data-panel="semantic">
          <div class="panel-header semantic">
            <span class="panel-title" data-maximize="semantic">
              Target RDF
              <span class="badge">output</span>
            </span>
            <button class="panel-toggle" data-target="semantic">▼</button>
          </div>
          <div class="panel-content">
            <pre><code class="semantic-output language-turtle"></code></pre>
          </div>
        </div>
      </div>
    `
  }

  attachEventListeners() {
    const workspace = this.container.querySelector('.workspace')
    const exampleSelector = this.container.querySelector('#example-selector')

    // Example selector
    if (exampleSelector && this.onExampleChange) {
      exampleSelector.addEventListener('change', (e) => {
        this.onExampleChange(e.target.value)
      })
    }

    // Layout toggle
    this.container.querySelector('[data-layout-toggle]').addEventListener('click', () => {
      this.layout = this.layout === 'horizontal' ? 'vertical' : 'horizontal'
      workspace.dataset.layout = this.layout
      const icon = this.container.querySelector('.layout-icon')
      icon.textContent = this.layout === 'horizontal' ? '⚏' : '☰'
    })

    // Markdown editing with debounce
    this.container.querySelector('.markdown-input').addEventListener('input', () => {
      clearTimeout(this.editTimeout)
      this.editTimeout = setTimeout(() => this.updateDisplay(), 500)
    })

    // Preserve order toggle
    this.container.querySelector('.preserve-order').addEventListener('change', (e) => {
      this.preserveOrder = e.target.checked
      this.updateDisplay()
    })

    // Panel toggles
    this.container.querySelectorAll('.panel-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const target = toggle.dataset.target
        const panel = this.container.querySelector(`[data-panel="${target}"]`)
        panel.classList.toggle('collapsed')
        this.syncPipelineSteps()
      })
    })

    // Pipeline step toggles
    this.container.querySelectorAll('.pipeline-step[data-toggle]').forEach(step => {
      step.addEventListener('click', () => {
        const target = step.dataset.toggle
        const panel = this.container.querySelector(`[data-panel="${target}"]`)
        panel.classList.toggle('collapsed')
        this.syncPipelineSteps()
      })
    })

    // Panel maximize
    this.container.querySelectorAll('.panel-title[data-maximize]').forEach(title => {
      title.addEventListener('click', () => {
        const target = title.dataset.maximize
        this.toggleMaximize(target)
      })
    })

    // ESC to restore
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const maximized = this.container.querySelector('.panel.maximized')
        if (maximized) {
          const target = maximized.dataset.panel
          this.toggleMaximize(target)
        }
      }
    })
  }

  syncPipelineSteps() {
    this.container.querySelectorAll('.pipeline-step[data-toggle]').forEach(step => {
      const target = step.dataset.toggle
      const panel = this.container.querySelector(`[data-panel="${target}"]`)
      if (panel.classList.contains('collapsed')) {
        step.classList.add('collapsed')
      } else {
        step.classList.remove('collapsed')
      }
    })
  }

  toggleMaximize(target) {
    const panel = this.container.querySelector(`[data-panel="${target}"]`)
    const workspace = this.container.querySelector('.workspace')

    if (panel.classList.contains('maximized')) {
      panel.classList.remove('maximized')
      workspace.classList.remove('has-maximized')
    } else {
      this.container.querySelectorAll('.panel').forEach(p => p.classList.remove('maximized'))
      panel.classList.remove('collapsed')
      panel.classList.add('maximized')
      workspace.classList.add('has-maximized')
      this.syncPipelineSteps()
    }
  }

  async updateDisplay() {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const markdown = this.container.querySelector('.markdown-input').value
      const sparqlEl = this.container.querySelector('.sparql-query')
      const facadeEl = this.container.querySelector('.facade-output')
      const semanticEl = this.container.querySelector('.semantic-output')

      sparqlEl.textContent = this.example.sparql

      const { facadeTurtle, semanticTurtle } = await processMarkdown(
        markdown,
        this.example.sparql,
        this.getOptions()
      )

      facadeEl.textContent = facadeTurtle
      semanticEl.textContent = semanticTurtle
    } catch (error) {
      console.error('Error updating display:', error)
      const errorMsg = `Error: ${error.message}\n\n${error.stack || ''}`
      this.container.querySelector('.facade-output').textContent = errorMsg
      this.container.querySelector('.semantic-output').textContent = errorMsg
    } finally {
      this.isProcessing = false
    }
  }

  async setMarkdown(markdown) {
    this.container.querySelector('.markdown-input').value = markdown
    // Wait for any pending processing to complete
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    await this.updateDisplay()
  }
}
