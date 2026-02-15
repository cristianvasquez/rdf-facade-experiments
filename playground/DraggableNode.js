/**
 * DraggableNode - Handles drag-and-drop functionality for canvas nodes
 */
export class DraggableNode {
  constructor(element, onDragCallback = null) {
    this.element = element;
    this.onDragCallback = onDragCallback;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.initializeDragging();
  }

  initializeDragging() {
    const header = this.element.querySelector('.node-header');
    if (!header) {
      console.warn('No .node-header found in node', this.element);
      return;
    }

    // Prevent dragging from collapse button
    const collapseBtn = header.querySelector('.collapse-btn');

    header.addEventListener('mousedown', (e) => {
      // Don't start drag if clicking on collapse button
      if (collapseBtn && collapseBtn.contains(e.target)) {
        return;
      }

      this.startDrag(e);
    });

    // Use document-level listeners for move and up to handle fast mouse movements
    this.boundMouseMove = (e) => this.onMouseMove(e);
    this.boundMouseUp = (e) => this.endDrag(e);
  }

  startDrag(e) {
    e.preventDefault(); // Prevent text selection

    this.isDragging = true;
    this.element.classList.add('dragging');

    // Get current position
    const rect = this.element.getBoundingClientRect();
    const parent = this.element.offsetParent;
    const parentRect = parent.getBoundingClientRect();

    // Calculate offset from mouse position to element position
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;

    // Add document-level listeners
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  onMouseMove(e) {
    if (!this.isDragging) return;

    e.preventDefault();

    const parent = this.element.offsetParent;
    const parentRect = parent.getBoundingClientRect();

    // Calculate new position relative to parent
    let newLeft = e.clientX - parentRect.left - this.offsetX;
    let newTop = e.clientY - parentRect.top - this.offsetY;

    // Optional: Add boundary constraints
    newLeft = Math.max(0, newLeft);
    newTop = Math.max(0, newTop);

    // Update position
    this.element.style.left = `${newLeft}px`;
    this.element.style.top = `${newTop}px`;

    // Trigger callback for arrow redraw
    if (this.onDragCallback) {
      this.onDragCallback();
    }
  }

  endDrag(e) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.element.classList.remove('dragging');

    // Remove document-level listeners
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);

    // Final callback for arrow redraw
    if (this.onDragCallback) {
      this.onDragCallback();
    }
  }

  destroy() {
    // Clean up listeners
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }
}
