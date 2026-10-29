import { DomainError } from "./errors/DomainError.js";
import { Group } from "./shapes/Group.js";
import { Shape } from "./shapes/Shape.js";

export class SvgDocument {
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly rootShapes: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();

  public constructor(width = 800, height = 600) {
    this.validateCanvasDimension(width, "width");
    this.validateCanvasDimension(height, "height");
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public get width(): number {
    return this.canvasWidth;
  }

  public get height(): number {
    return this.canvasHeight;
  }

  public get roots(): readonly Shape[] {
    return [...this.rootShapes];
  }

  public get elementCount(): number {
    return this.shapesById.size;
  }

  public resize(width: number, height: number): void {
    this.validateCanvasDimension(width, "width");
    this.validateCanvasDimension(height, "height");
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public addShape(shape: Shape, parentId?: string): void {
    if (shape.parent !== null) {
      throw new DomainError(`shape already has a parent: ${shape.id}`);
    }

    const parent = this.resolveParent(parentId);

    if (parent === null) {
      this.validateSubtreeForInsertion(shape);
      this.rootShapes.push(shape);
      this.registerAttachedSubtree(shape);
    } else {
      parent.appendChild(shape);
    }
  }

  /** @internal Used by an attached Group to preserve document invariants. */
  public validateSubtreeForInsertion(shape: Shape): void {
    const incomingIds = new Set<string>();
    shape.walk((item) => {
      if (item.document !== null) {
        throw new DomainError(`shape already belongs to a document: ${item.id}`);
      }
      if (incomingIds.has(item.id) || this.shapesById.has(item.id)) {
        throw new DomainError(`id already exists: ${item.id}`);
      }
      incomingIds.add(item.id);
    });
  }

  /** @internal Called only after insertion has been fully validated. */
  public registerAttachedSubtree(shape: Shape): void {
    if (!this.containsShapeReference(shape)) {
      throw new DomainError(
        `cannot register shape before document insertion: ${shape.id}`,
      );
    }
    this.validateSubtreeForInsertion(shape);
    shape.walk((item) => {
      item.attachToDocument(this);
      this.shapesById.set(item.id, item);
    });
  }

  public findById(id: string): Shape | undefined {
    return this.shapesById.get(id);
  }

  public requireShape(id: string): Shape {
    const shape = this.findById(id);
    if (shape === undefined) {
      throw new DomainError(`no such shape: ${id}`);
    }
    return shape;
  }

  public walk(visitor: (shape: Shape) => void): void {
    for (const root of this.rootShapes) {
      root.walk(visitor);
    }
  }

  public containsShapeReference(candidate: Shape): boolean {
    let found = false;
    this.walk((shape) => {
      if (shape === candidate) {
        found = true;
      }
    });
    return found;
  }

  private resolveParent(parentId: string | undefined): Group | null {
    if (parentId === undefined) {
      return null;
    }
    const parent = this.shapesById.get(parentId);
    if (parent === undefined) {
      throw new DomainError(`no such container: ${parentId}`);
    }
    if (!(parent instanceof Group)) {
      throw new DomainError(`not a container: ${parentId}`);
    }
    return parent;
  }

  private validateCanvasDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new DomainError(`canvas ${name} must be positive`);
    }
  }
}
