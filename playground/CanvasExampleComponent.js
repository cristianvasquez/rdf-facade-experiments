import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite'
import { Store } from 'n3'
import rdf from 'rdf-ext'
import { ns } from '../src/namespaces.js'
import 'rdf-elements/rdf-elements.js'
import { markdownToRdf as remarkToRdf } from '../src/remark-facade.js'
import { markdownToRdf as facadeXToRdf } from '../src/streaming-facade-x.js'
import { CanvasConnections } from './CanvasConnections.js'
import { nodePositions, useLocalStorage } from './config.js'
import Panzoom from '@panzoom/panzoom'
import interact from 'interactjs'

// Reusable QueryEngine instance
const queryEngine = new QueryEngine()

export class CanvasExampleComponent {
  constructor (
    example, containerElement, allExamples = [], onExampleChange = null) {
    this.example = example
    this.container = containerElement
    this.allExamples = allExamples
    this.onExampleChange = onExampleChange
    this.facade = example.facade || 'facade-x'
    this.preserveOrder = example.preserveOrder
    this.currentSparql = example.sparql
    this.isProcessing = false
    this.editTimeout = null
    this.canvasConnections = null
    this.maxZIndex = 1
    this.panzoomInstance = null

    this.render()
    this.initializeNodes()
    this.attachEventListeners()
    this.initializePanZoom()
  }

  renderExampleOptions () {
    if (!this.allExamples || this.allExamples.length === 0) return ''
    return this.allExamples.map(ex =>
      `<option value="${ex.id}" ${ex.id === this.example.id ? 'selected' : ''}>
        ${ex.title}
      </option>`,
    ).join('')
  }

  getOptions () {
    return {
      facade: this.facade,
      useNumbered: this.preserveOrder,
      useRdfsMember: !this.preserveOrder,
    }
  }

  renderMarkdownNode () {
    const { left, top } = nodePositions.markdown
    return `
      <div class="canvas-node markdown-node" data-node-id="node-1" style="left: ${left}px; top: ${top}px;">
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

  renderFacadeNode () {
    const facadeType = this.facade === 'facade-remark'
      ? 'facade-remark'
      : 'facade-x'
    const showPreserveOrder = this.facade !== 'facade-remark'
    const { left, top } = nodePositions.facade

    return `
      <div class="canvas-node facade-node" data-node-id="node-2" style="left: ${left}px; top: ${top}px;">
        <div class="node-header">
          <span class="node-title">Facade RDF (${facadeType})</span>
          <span class="node-badge">intermediate</span>
          ${showPreserveOrder ? `
          <label class="node-option">
            <input type="checkbox" class="preserve-order" ${this.preserveOrder
      ? 'checked'
      : ''}>
            <span>Preserve order</span>
          </label>
          ` : ''}
          <button class="collapse-btn" data-node="node-2">▼</button>
        </div>
        <div class="node-content">
          <rdf-editor class="facade-output"></rdf-editor>
        </div>
      </div>
    `
  }

  renderSparqlNode () {
    const { left, top } = nodePositions.sparql
    return `
      <div class="canvas-node sparql-node" data-node-id="node-3" style="left: ${left}px; top: ${top}px;">
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

  renderSemanticNode () {
    const { left, top } = nodePositions.semantic
    return `
      <div class="canvas-node semantic-node" data-node-id="node-4" style="left: ${left}px; top: ${top}px;">
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

  renderInfoNode () {
    const { left, top, width, height } = nodePositions.info
    return `
      <div class="canvas-node info-node" data-node-id="node-info" style="left: ${left}px; top: ${top}px; width: ${width}px; height: ${height};">
        <div class="node-header">
          <span class="node-title">Markdown to RDF techniques</span>
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
            ${this.example.description
      ? `<p class="description" style="margin-top: 8px; color: #666; font-size: 12px; font-style: italic;">${this.example.description}</p>`
      : ''}
          </div>
        </div>
      </div>
    `
  }

  render () {
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

  initializeNodes () {
    const svg = this.container.querySelector('.canvas-connections')

    // Define connections
    const connections = [
      { from: 'node-1', to: 'node-2' },
      { from: 'node-2', to: 'node-3' },
      { from: 'node-3', to: 'node-4' },
    ]

    // Initialize arrow connections
    this.canvasConnections = new CanvasConnections(svg, connections)

    // Load saved positions from localStorage
    this.loadNodePositions()

    // Make nodes draggable and resizable with Interact.js
    const nodes = this.container.querySelectorAll('.canvas-node')
    nodes.forEach(node => {
      interact(node)
        .draggable({
          allowFrom: '.node-header',
          ignoreFrom: '.collapse-btn, .preserve-order, .example-selector',
          listeners: {
            move: (event) => {
              const target = event.target
              const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
              const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

              target.style.transform = `translate(${x}px, ${y}px)`
              target.setAttribute('data-x', x)
              target.setAttribute('data-y', y)

              this.canvasConnections.updateArrows()
            },
            end: () => {
              this.saveNodePositions()
            }
          }
        })
        .resizable({
          edges: { left: false, right: true, bottom: true, top: false },
          listeners: {
            move: (event) => {
              const target = event.target
              let x = parseFloat(target.getAttribute('data-x')) || 0
              let y = parseFloat(target.getAttribute('data-y')) || 0

              target.style.width = `${event.rect.width}px`
              target.style.height = `${event.rect.height}px`

              // Handle translation during resize
              x += event.deltaRect.left
              y += event.deltaRect.top

              target.style.transform = `translate(${x}px, ${y}px)`
              target.setAttribute('data-x', x)
              target.setAttribute('data-y', y)

              this.canvasConnections.updateArrows()
            }
          }
        })

      // Bring node to front on mousedown
      const header = node.querySelector('.node-header')
      if (header) {
        header.addEventListener('mousedown', () => {
          this.bringNodeToFront(node)
        })
      }
    })

    // Initial arrow draw
    requestAnimationFrame(() => {
      this.canvasConnections.updateArrows()
    })

    // Collapse buttons
    this.container.querySelectorAll('.collapse-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation() // Prevent dragging
        const nodeId = btn.dataset.node
        const node = this.container.querySelector(`[data-node-id="${nodeId}"]`)

        if (node.classList.contains('collapsed')) {
          // Expanding - restore saved height
          if (node.dataset.savedHeight) {
            node.style.height = node.dataset.savedHeight
            delete node.dataset.savedHeight
          }
          node.classList.remove('collapsed')
        } else {
          // Collapsing - save current height and remove it
          const currentHeight = window.getComputedStyle(node).height
          node.dataset.savedHeight = currentHeight
          node.style.height = 'auto'
          node.classList.add('collapsed')
        }

        // Update arrows after collapse animation
        setTimeout(() => {
          this.canvasConnections.updateArrows()
        }, 100)
      })
    })

    // Add ResizeObserver to update arrows when nodes are resized
    this.resizeObserver = new ResizeObserver(() => {
      if (this.canvasConnections) {
        this.canvasConnections.updateArrows()
      }
    })

    // Observe all nodes for resize
    nodes.forEach(node => {
      this.resizeObserver.observe(node)
    })
  }

  attachEventListeners () {
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
    this.container.querySelector('.markdown-input').
      addEventListener('input', () => {
        clearTimeout(this.editTimeout)
        this.editTimeout = setTimeout(() => this.updateDisplay(), 500)
      })

    // Preserve order toggle (only for facade-x)
    const preserveOrderCheckbox = this.container.querySelector(
      '.preserve-order')
    if (preserveOrderCheckbox) {
      preserveOrderCheckbox.addEventListener('change', (e) => {
        this.preserveOrder = e.target.checked
        this.updateDisplay()
      })
    }

    // SPARQL editor changes
    this.container.querySelector('.sparql-query').
      addEventListener('change', (e) => {
        if (!e.detail.error) {
          this.currentSparql = e.detail.value
          clearTimeout(this.editTimeout)
          this.editTimeout = setTimeout(() => this.updateDisplay(), 500)
        }
      })
  }

  async updateDisplay () {
    if (this.isProcessing) {
      console.warn('Already processing, skipping updateDisplay')
      return
    }
    this.isProcessing = true

    try {
      const markdown = this.container.querySelector('.markdown-input').value
      const sparqlEl = this.container.querySelector('.sparql-query')
      const facadeEl = this.container.querySelector('.facade-output')
      const semanticEl = this.container.querySelector('.semantic-output')

      if (!sparqlEl || !facadeEl || !semanticEl) {
        console.error('Missing required elements for updateDisplay')
        return
      }

      // Wait for custom elements to be defined (web components might not be ready)
      await Promise.all([
        customElements.whenDefined('sparql-editor'),
        customElements.whenDefined('rdf-editor'),
      ])

      // Set SPARQL query value
      sparqlEl.value = this.currentSparql

      const facade = this.facade || 'facade-x'
      let facadeQuads

      console.log(`Processing with facade: ${facade}`)

      if (facade === 'facade-remark') {
        facadeQuads = remarkToRdf(markdown)
        console.log(`facade-remark produced ${facadeQuads.length} quads`)
      } else {
        facadeQuads = await facadeXToRdf(markdown, this.getOptions())
        console.log(`facade-x produced ${facadeQuads.length} quads`)
      }

      // Convert quads to dataset for RdfEditor
      facadeEl.dataset = rdf.dataset(facadeQuads)
      facadeEl.prefixes = new Map(Object.entries(ns).map(([k, v]) => [k, v()]))
      console.log('Facade RDF editor updated')

      // Execute CONSTRUCT query
      const store = new Store(facadeQuads)
      const result = await queryEngine.queryQuads(this.currentSparql, {
        sources: [store],
      })

      const semanticQuads = await result.toArray()
      semanticEl.dataset = rdf.dataset(semanticQuads)
      semanticEl.prefixes = new Map(
        Object.entries(ns).map(([k, v]) => [k, v()]))
      console.log(
        `Semantic RDF editor updated with ${semanticQuads.length} quads`)
    } catch (error) {
      console.error('Error updating display:', error)
      const errorMsg = `Error: ${error.message}\n\n${error.stack || ''}`
      const facadeEl = this.container.querySelector('.facade-output')
      const semanticEl = this.container.querySelector('.semantic-output')
      if (facadeEl) facadeEl.value = errorMsg
      if (semanticEl) semanticEl.value = errorMsg
    } finally {
      console.log('updateDisplay finally block, setting isProcessing = false')
      this.isProcessing = false
    }
  }

  async setMarkdown (markdown) {
    console.log(
      `setMarkdown called with ${markdown.length} chars, facade: ${this.facade}`)
    const input = this.container.querySelector('.markdown-input')
    if (!input) {
      console.error('Markdown input not found')
      return
    }
    input.value = markdown

    // Wait for any pending processing to complete
    let attempts = 0
    while (this.isProcessing && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 50))
      attempts++
    }

    // Force reset processing flag if stuck
    if (this.isProcessing) {
      console.warn('Force resetting isProcessing flag')
      this.isProcessing = false
    }

    console.log('Calling updateDisplay from setMarkdown')
    await this.updateDisplay()
    console.log('updateDisplay completed')
  }

  loadNodePositions () {
    if (!useLocalStorage) return

    try {
      const saved = localStorage.getItem('playground-node-positions')
      if (!saved) return

      const positions = JSON.parse(saved)
      const nodes = this.container.querySelectorAll('.canvas-node')

      nodes.forEach(node => {
        const nodeId = node.dataset.nodeId
        if (positions[nodeId]) {
          const x = parseFloat(positions[nodeId].x) || 0
          const y = parseFloat(positions[nodeId].y) || 0

          node.setAttribute('data-x', x)
          node.setAttribute('data-y', y)
          node.style.transform = `translate(${x}px, ${y}px)`

          if (positions[nodeId].width) node.style.width = positions[nodeId].width
          if (positions[nodeId].height) node.style.height = positions[nodeId].height
          if (positions[nodeId].zIndex) {
            node.style.zIndex = positions[nodeId].zIndex
            this.maxZIndex = Math.max(this.maxZIndex, parseInt(positions[nodeId].zIndex))
          }
        }
      })
    } catch (error) {
      console.warn('Failed to load node positions:', error)
    }
  }

  saveNodePositions () {
    if (!useLocalStorage) return

    try {
      const positions = {}
      const nodes = this.container.querySelectorAll('.canvas-node')

      nodes.forEach(node => {
        const nodeId = node.dataset.nodeId
        positions[nodeId] = {
          x: node.getAttribute('data-x') || '0',
          y: node.getAttribute('data-y') || '0',
          width: node.style.width,
          height: node.style.height,
          zIndex: node.style.zIndex || '1'
        }
      })

      localStorage.setItem('playground-node-positions', JSON.stringify(positions))
    } catch (error) {
      console.warn('Failed to save node positions:', error)
    }
  }

  bringNodeToFront (node) {
    this.maxZIndex++
    node.style.zIndex = this.maxZIndex
    this.saveNodePositions()
  }

  initializePanZoom () {
    const workspace = this.container.querySelector('.canvas-workspace')
    const canvasContainer = this.container.querySelector('.canvas-container')
    if (!workspace || !canvasContainer) return

    // Initialize panzoom on the workspace
    this.panzoomInstance = Panzoom(workspace, {
      maxScale: 5,
      minScale: 0.05,
      canvas: true,
      excludeClass: 'canvas-node', // Don't pan when interacting with nodes
      cursor: 'grab'
      // Removed 'contain' to allow free zoom/pan
    })

    // Listen to pan/zoom events to update connections
    workspace.addEventListener('panzoomchange', () => {
      if (this.canvasConnections) {
        this.canvasConnections.updateArrows()
      }
    })

    // Enable mouse wheel zoom
    canvasContainer.addEventListener('wheel', (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        this.panzoomInstance.zoomWithWheel(event)
      }
    })
  }

  destroy () {
    // Clean up Interact.js
    const nodes = this.container.querySelectorAll('.canvas-node')
    nodes.forEach(node => {
      interact(node).unset()
    })

    // Clean up canvas connections
    if (this.canvasConnections) {
      this.canvasConnections.destroy()
      this.canvasConnections = null
    }

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    // Clean up panzoom
    if (this.panzoomInstance) {
      this.panzoomInstance.destroy()
      this.panzoomInstance = null
    }
  }
}
