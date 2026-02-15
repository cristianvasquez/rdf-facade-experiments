import { markdownToRdf as facadeXToRdf } from '../src/streaming-facade-x.js'
import { markdownToRdf as remarkToRdf } from '../src/remark-facade.js'
import { Store } from 'n3'
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite'
import Serializer from '@rdfjs/serializer-turtle'
import { ns } from '../src/namespaces.js'
import 'rdf-elements/rdf-elements.js'
import rdf from 'rdf-ext'
import { DraggableNode } from './DraggableNode.js'
import { CanvasConnections } from './CanvasConnections.js'

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

export class CanvasExampleComponent {
  constructor(example, containerElement, allExamples = [], onExampleChange = null) {
    this.example = example
    this.container = containerElement
    this.allExamples = allExamples
    this.onExampleChange = onExampleChange
    this.facade = example.facade || 'facade-x'
    this.preserveOrder = example.preserveOrder
    this.currentSparql = example.sparql
    this.isProcessing = false
    this.editTimeout = null
    this.draggableNodes = []
    this.canvasConnections = null

    this.render()
    this.initializeNodes()
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

  renderMarkdownNode() {
    return `
      <div class="canvas-node markdown-node" data-node-id="node-1" style="left: 50px; top: 150px;">
        <div class="node-header">
          <span class="node-title">Markdown Input</span>
          <span class="node-badge">editable</span>
          <button class="collapse-btn" data-node="node-1">▼</button>
        </div>
        <div class="node-content">
          <textarea class="markdown-input" spellcheck="false"></textarea>
        </div>
      </div>
    `
  }

  renderFacadeNode() {
    return `
      <div class="canvas-node facade-node" data-node-id="node-2" style="left: 550px; top: 150px;">
        <div class="node-header">
          <span class="node-title">Facade RDF</span>
          <span class="node-badge">intermediate</span>
          <label class="node-option">
            <input type="checkbox" class="preserve-order" ${this.preserveOrder ? 'checked' : ''}>
            <span>Preserve order</span>
          </label>
          <button class="collapse-btn" data-node="node-2">▼</button>
        </div>
        <div class="node-content">
          <rdf-editor class="facade-output"></rdf-editor>
        </div>
      </div>
    `
  }

  renderSparqlNode() {
    return `
      <div class="canvas-node sparql-node" data-node-id="node-3" style="left: 1050px; top: 150px;">
        <div class="node-header">
          <span class="node-title">SPARQL CONSTRUCT</span>
          <span class="node-badge">editable</span>
          <button class="collapse-btn" data-node="node-3">▼</button>
        </div>
        <div class="node-content">
          <sparql-editor class="sparql-query"></sparql-editor>
        </div>
      </div>
    `
  }

  renderSemanticNode() {
    return `
      <div class="canvas-node semantic-node" data-node-id="node-4" style="left: 1550px; top: 150px;">
        <div class="node-header">
          <span class="node-title">Target RDF</span>
          <span class="node-badge">output</span>
          <button class="collapse-btn" data-node="node-4">▼</button>
        </div>
        <div class="node-content">
          <rdf-editor class="semantic-output"></rdf-editor>
        </div>
      </div>
    `
  }

  renderInfoNode() {
    return `
      <div class="canvas-node info-node" data-node-id="node-info" style="left: 50px; top: 20px; width: 600px; height: auto;">
        <div class="node-header">
          <span class="node-title">🔄 Markdown to RDF Playground</span>
          <button class="collapse-btn" data-node="node-info">▼</button>
        </div>
        <div class="node-content" style="padding: 12px;">
          <p class="intro-text">
            <strong>Literate RDF authoring</strong> through markdown: author semantic graphs using familiar markdown syntax.
            The <strong>facade</strong> is a general intermediate representation of the markdown structure.
            The <strong>SPARQL CONSTRUCT</strong> mapping makes the semantics explicit, transforming the facade into domain RDF.
          </p>
          <div style="margin-top: 12px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 12px;">Select Example:</label>
            <select class="example-selector" id="example-selector" style="width: 100%; padding: 6px; border: 1px solid #d0d0d0; border-radius: 4px;">
              ${this.renderExampleOptions()}
            </select>
            ${this.example.description ? `<p class="description" style="margin-top: 8px; color: #666; font-size: 12px; font-style: italic;">${this.example.description}</p>` : ''}
          </div>
        </div>
      </div>
    `
  }

  render() {
    this.container.innerHTML = `
      <div class="canvas-container">
        <svg class="canvas-connections"></svg>
        <div class="canvas-workspace">
          ${this.renderInfoNode()}
          ${this.renderMarkdownNode()}
          ${this.renderFacadeNode()}
          ${this.renderSparqlNode()}
          ${this.renderSemanticNode()}
        </div>
      </div>
    `
  }

  initializeNodes() {
    const svg = this.container.querySelector('.canvas-connections');

    // Define connections
    const connections = [
      { from: 'node-1', to: 'node-2' },
      { from: 'node-2', to: 'node-3' },
      { from: 'node-3', to: 'node-4' }
    ];

    // Initialize arrow connections
    this.canvasConnections = new CanvasConnections(svg, connections);

    // Make nodes draggable
    const nodes = this.container.querySelectorAll('.canvas-node');
    nodes.forEach(node => {
      const draggable = new DraggableNode(node, () => {
        this.canvasConnections.updateArrows();
      });
      this.draggableNodes.push(draggable);
    });

    // Initial arrow draw
    // Need to wait for layout to settle
    requestAnimationFrame(() => {
      this.canvasConnections.updateArrows();
    });

    // Collapse buttons
    this.container.querySelectorAll('.collapse-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent dragging
        const nodeId = btn.dataset.node;
        const node = this.container.querySelector(`[data-node-id="${nodeId}"]`);

        if (node.classList.contains('collapsed')) {
          // Expanding - restore saved height
          if (node.dataset.savedHeight) {
            node.style.height = node.dataset.savedHeight;
            delete node.dataset.savedHeight;
          }
          node.classList.remove('collapsed');
        } else {
          // Collapsing - save current height and remove it
          const currentHeight = window.getComputedStyle(node).height;
          node.dataset.savedHeight = currentHeight;
          node.style.height = 'auto';
          node.classList.add('collapsed');
        }

        // Update arrows after collapse animation
        setTimeout(() => {
          this.canvasConnections.updateArrows();
        }, 100);
      });
    });

    // Add ResizeObserver to update arrows when nodes are resized
    this.resizeObserver = new ResizeObserver(() => {
      if (this.canvasConnections) {
        this.canvasConnections.updateArrows();
      }
    });

    // Observe all nodes for resize
    nodes.forEach(node => {
      this.resizeObserver.observe(node);
    });
  }

  attachEventListeners() {
    const exampleSelector = this.container.querySelector('#example-selector')

    // Set mediaType on RDF editors
    const facadeEl = this.container.querySelector('.facade-output')
    const semanticEl = this.container.querySelector('.semantic-output')
    const sparqlEl = this.container.querySelector('.sparql-query')

    facadeEl.mediaType = 'text/turtle'
    semanticEl.mediaType = 'text/turtle'

    // Example selector
    if (exampleSelector && this.onExampleChange) {
      exampleSelector.addEventListener('change', (e) => {
        this.onExampleChange(e.target.value)
      })
    }

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

    // SPARQL editor changes
    this.container.querySelector('.sparql-query').addEventListener('change', (e) => {
      if (!e.detail.error) {
        this.currentSparql = e.detail.value
        clearTimeout(this.editTimeout)
        this.editTimeout = setTimeout(() => this.updateDisplay(), 500)
      }
    })
  }

  async updateDisplay() {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const markdown = this.container.querySelector('.markdown-input').value
      const sparqlEl = this.container.querySelector('.sparql-query')
      const facadeEl = this.container.querySelector('.facade-output')
      const semanticEl = this.container.querySelector('.semantic-output')

      // Set SPARQL query value
      sparqlEl.value = this.currentSparql

      const facade = this.facade || 'facade-x'
      let facadeQuads

      if (facade === 'facade-remark') {
        facadeQuads = remarkToRdf(markdown)
      } else {
        facadeQuads = await facadeXToRdf(markdown, this.getOptions())
      }

      // Convert quads to dataset for RdfEditor
      const facadeDataset = rdf.dataset(facadeQuads)
      facadeEl.dataset = facadeDataset
      facadeEl.prefixes = new Map(Object.entries(ns).map(([k, v]) => [k, v()]))

      // Execute CONSTRUCT query
      const store = new Store(facadeQuads)
      const result = await queryEngine.queryQuads(this.currentSparql, {
        sources: [store]
      })

      const semanticQuads = await result.toArray()
      const semanticDataset = rdf.dataset(semanticQuads)
      semanticEl.dataset = semanticDataset
      semanticEl.prefixes = new Map(Object.entries(ns).map(([k, v]) => [k, v()]))
    } catch (error) {
      console.error('Error updating display:', error)
      const errorMsg = `Error: ${error.message}\n\n${error.stack || ''}`
      const facadeEl = this.container.querySelector('.facade-output')
      const semanticEl = this.container.querySelector('.semantic-output')
      facadeEl.value = errorMsg
      semanticEl.value = errorMsg
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

  destroy() {
    // Clean up draggable nodes
    this.draggableNodes.forEach(node => node.destroy());
    this.draggableNodes = [];

    // Clean up canvas connections
    if (this.canvasConnections) {
      this.canvasConnections.destroy();
      this.canvasConnections = null;
    }

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}
