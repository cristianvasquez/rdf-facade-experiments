/**
 * CanvasConnections - Manages SVG arrow rendering between canvas nodes
 */
export class CanvasConnections {
  constructor(svgElement, connections = []) {
    this.svg = svgElement;
    this.connections = connections; // Array of {from: 'node-id', to: 'node-id'}
    this.paths = new Map();

    this.initializeSVG();
    this.createPaths();
  }

  initializeSVG() {
    // Create arrowhead marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');

    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3, 0 6');
    polygon.setAttribute('fill', '#999');

    marker.appendChild(polygon);
    defs.appendChild(marker);
    this.svg.appendChild(defs);
  }

  createPaths() {
    this.connections.forEach((conn, index) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'connection-line');
      path.setAttribute('data-from', conn.from);
      path.setAttribute('data-to', conn.to);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#999');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-dasharray', '5,5');
      path.setAttribute('marker-end', 'url(#arrowhead)');

      this.svg.appendChild(path);
      this.paths.set(`${conn.from}-${conn.to}`, path);
    });
  }

  updateArrows() {
    this.connections.forEach(conn => {
      const fromNode = document.querySelector(`[data-node-id="${conn.from}"]`);
      const toNode = document.querySelector(`[data-node-id="${conn.to}"]`);

      if (!fromNode || !toNode) {
        console.warn(`Node not found: ${conn.from} or ${conn.to}`);
        return;
      }

      const path = this.paths.get(`${conn.from}-${conn.to}`);
      if (!path) return;

      // Get connection points
      const points = this.calculateConnectionPoints(fromNode, toNode);

      // Create Bezier curve path
      const pathD = this.createBezierPath(points.from, points.to);
      path.setAttribute('d', pathD);
    });
  }

  calculateConnectionPoints(fromNode, toNode) {
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const svgRect = this.svg.getBoundingClientRect();

    // From point: center-right of source node
    const fromX = fromRect.right - svgRect.left;
    const fromY = fromRect.top + fromRect.height / 2 - svgRect.top;

    // To point: center-left of target node
    const toX = toRect.left - svgRect.left;
    const toY = toRect.top + toRect.height / 2 - svgRect.top;

    return {
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY }
    };
  }

  createBezierPath(from, to) {
    // Calculate control points for smooth Bezier curve
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Control points are offset horizontally for smooth horizontal flow
    const controlOffset = Math.abs(dx) * 0.5;

    const cp1x = from.x + controlOffset;
    const cp1y = from.y;

    const cp2x = to.x - controlOffset;
    const cp2y = to.y;

    return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
  }

  destroy() {
    // Clean up SVG content
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }
    this.paths.clear();
  }
}
