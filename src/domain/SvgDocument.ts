import { DomainError } from "./errors/DomainError.js";
import { TREE_MUTATION_TOKEN } from "./internal/TreeMutationToken.js";
import { Group } from "./shapes/Group.js";
import { Shape } from "./shapes/Shape.js";
import { ShapePlacement } from "./tree/ShapePlacement.js";

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

  public locateShape(id: string): ShapePlacement {
    const shape = this.requireShape(id);
    const parent = shape.parent;
    const index =
      parent === null
        ? this.rootShapes.indexOf(shape)
        : parent.indexOfChild(shape);
    if (index < 0) {
      throw new DomainError(`shape is not present in document tree: ${id}`);
    }
    return new ShapePlacement(shape, parent, index);
  }

  public deleteShape(id: string): ShapePlacement {
    const placement = this.locateShape(id);
    this.detachExistingShape(placement.shape);
    this.unregisterDetachedSubtree(placement.shape);
    return placement;
  }

  public restoreShape(placement: ShapePlacement): void {
    if (
      placement.shape.parent !== null ||
      placement.shape.document !== null
    ) {
      throw new DomainError(`shape is already attached: ${placement.shape.id}`);
    }
    if (
      placement.parent !== null &&
      placement.parent.document !== this
    ) {
      throw new DomainError(
        `original container is not in this document: ${placement.parent.id}`,
      );
    }
    this.insertNewShapeAt(
      placement.shape,
      placement.parent,
      placement.index,
    );
  }

  public moveShapeTo(placement: ShapePlacement): void {
    const shape = placement.shape;
    if (shape.document !== this) {
      throw new DomainError(`shape does not belong to this document: ${shape.id}`);
    }
    if (
      placement.parent !== null &&
      placement.parent.document !== this
    ) {
      throw new DomainError(
        `target container is not in this document: ${placement.parent.id}`,
      );
    }
    if (placement.parent !== null && shape.contains(placement.parent)) {
      throw new DomainError(
        `cannot add a container into its own descendant: ${shape.id}`,
      );
    }

    const sameParent = shape.parent === placement.parent;
    const targetLength =
      placement.parent === null
        ? this.rootShapes.length
        : placement.parent.children.length;
    const maximumIndex = targetLength - (sameParent ? 1 : 0);
    if (placement.index > maximumIndex) {
      throw new DomainError(`invalid target index: ${String(placement.index)}`);
    }

    const currentPlacement = this.locateShape(shape.id);
    if (
      currentPlacement.parent === placement.parent &&
      currentPlacement.index === placement.index
    ) {
      return;
    }

    this.detachExistingShape(shape);
    this.insertExistingShapeAt(shape, placement.parent, placement.index);
  }

  public groupShapes(newGroupId: string, ids: readonly string[]): Group {
    if (ids.length === 0) {
      throw new DomainError("group requires at least one shape");
    }
    if (this.shapesById.has(newGroupId)) {
      throw new DomainError(`id already exists: ${newGroupId}`);
    }

    const seenIds = new Set<string>();
    const selected: Shape[] = [];
    for (const id of ids) {
      if (seenIds.has(id)) {
        throw new DomainError(`shape specified more than once: ${id}`);
      }
      seenIds.add(id);
      selected.push(this.requireShape(id));
    }

    for (const candidate of selected) {
      for (const other of selected) {
        if (candidate !== other && candidate.contains(other)) {
          throw new DomainError(
            `cannot group a container into its own descendant: ${candidate.id}`,
          );
        }
      }
    }

    const selectedSet = new Set(selected);
    const ordered: Shape[] = [];
    this.walk((shape) => {
      if (selectedSet.has(shape)) {
        ordered.push(shape);
      }
    });
    const anchor = ordered[0];
    if (anchor === undefined || ordered.length !== selected.length) {
      throw new DomainError("group targets are not all present in the document");
    }

    const anchorPlacement = this.locateShape(anchor.id);
    const group = new Group(newGroupId);
    this.insertNewShapeAt(
      group,
      anchorPlacement.parent,
      anchorPlacement.index,
    );

    for (const shape of ordered) {
      this.detachExistingShape(shape);
      group.insertExistingChild(
        group.children.length,
        shape,
        TREE_MUTATION_TOKEN,
      );
    }
    return group;
  }

  public ungroupShape(id: string): Group {
    const shape = this.requireShape(id);
    if (!(shape instanceof Group)) {
      throw new DomainError(`not a container: ${id}`);
    }
    const parent = shape.parent;
    if (parent === null) {
      throw new DomainError(`cannot ungroup top-level container: ${id}`);
    }

    const groupIndex = parent.indexOfChild(shape);
    const children = [...shape.children];
    parent.removeExistingChild(shape, TREE_MUTATION_TOKEN);

    for (const [offset, child] of children.entries()) {
      shape.removeExistingChild(child, TREE_MUTATION_TOKEN);
      parent.insertExistingChild(
        groupIndex + offset,
        child,
        TREE_MUTATION_TOKEN,
      );
    }

    this.unregisterDetachedSubtree(shape);
    return shape;
  }

  public addTo(containerId: string, shapeId: string): ShapePlacement {
    const container = this.requireContainer(containerId);
    const shape = this.requireShape(shapeId);
    if (shape.contains(container)) {
      throw new DomainError(
        `cannot add a container into its own descendant: ${shape.id}`,
      );
    }

    const originalPlacement = this.locateShape(shapeId);
    if (
      shape.parent === container &&
      originalPlacement.index === container.children.length - 1
    ) {
      return originalPlacement;
    }

    this.detachExistingShape(shape);
    container.insertExistingChild(
      container.children.length,
      shape,
      TREE_MUTATION_TOKEN,
    );
    return originalPlacement;
  }

  public bringToFront(id: string): ShapePlacement {
    const placement = this.locateShape(id);
    if (placement.parent === null) {
      this.reorderRoot(placement.shape, this.rootShapes.length - 1);
    } else {
      placement.parent.reorderChild(
        placement.shape,
        placement.parent.children.length - 1,
      );
    }
    return placement;
  }

  public sendToBack(id: string): ShapePlacement {
    const placement = this.locateShape(id);
    if (placement.parent === null) {
      this.reorderRoot(placement.shape, 0);
    } else {
      placement.parent.reorderChild(placement.shape, 0);
    }
    return placement;
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

  private insertNewShapeAt(
    shape: Shape,
    parent: Group | null,
    index: number,
  ): void {
    if (shape.parent !== null || shape.document !== null) {
      throw new DomainError(`shape is already attached: ${shape.id}`);
    }
    if (parent === null) {
      this.validateRootInsertionIndex(index);
      this.validateSubtreeForInsertion(shape);
      this.rootShapes.splice(index, 0, shape);
      this.registerAttachedSubtree(shape);
      return;
    }
    if (parent.document !== this) {
      throw new DomainError(`container belongs to a different document: ${parent.id}`);
    }
    parent.insertChild(index, shape);
  }

  private detachExistingShape(shape: Shape): number {
    if (shape.document !== this) {
      throw new DomainError(`shape does not belong to this document: ${shape.id}`);
    }
    const parent = shape.parent;
    if (parent !== null) {
      return parent.removeExistingChild(shape, TREE_MUTATION_TOKEN);
    }

    const index = this.rootShapes.indexOf(shape);
    if (index < 0) {
      throw new DomainError(`shape is not present in document tree: ${shape.id}`);
    }
    this.rootShapes.splice(index, 1);
    return index;
  }

  private insertExistingShapeAt(
    shape: Shape,
    parent: Group | null,
    index: number,
  ): void {
    if (shape.parent !== null || shape.document !== this) {
      throw new DomainError(`shape is not available for relocation: ${shape.id}`);
    }
    if (parent === null) {
      this.validateRootInsertionIndex(index);
      this.rootShapes.splice(index, 0, shape);
      return;
    }
    parent.insertExistingChild(index, shape, TREE_MUTATION_TOKEN);
  }

  private unregisterDetachedSubtree(shape: Shape): void {
    if (this.containsShapeReference(shape)) {
      throw new DomainError(`cannot unregister attached shape: ${shape.id}`);
    }

    const subtree: Shape[] = [];
    shape.walk((item) => {
      if (item.document !== this || this.shapesById.get(item.id) !== item) {
        throw new DomainError(`shape registration is inconsistent: ${item.id}`);
      }
      subtree.push(item);
    });

    for (const item of subtree) {
      this.shapesById.delete(item.id);
      item.detachFromDocument(this);
    }
  }

  private reorderRoot(shape: Shape, targetIndex: number): void {
    const sourceIndex = this.rootShapes.indexOf(shape);
    if (sourceIndex < 0) {
      throw new DomainError(`shape is not a root element: ${shape.id}`);
    }
    if (sourceIndex === targetIndex) {
      return;
    }
    this.rootShapes.splice(sourceIndex, 1);
    this.rootShapes.splice(targetIndex, 0, shape);
  }

  private validateRootInsertionIndex(index: number): void {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > this.rootShapes.length
    ) {
      throw new DomainError(`invalid root index: ${String(index)}`);
    }
  }

  private requireContainer(id: string): Group {
    const shape = this.shapesById.get(id);
    if (shape === undefined) {
      throw new DomainError(`no such container: ${id}`);
    }
    if (!(shape instanceof Group)) {
      throw new DomainError(`not a container: ${id}`);
    }
    return shape;
  }

  private resolveParent(parentId: string | undefined): Group | null {
    if (parentId === undefined) {
      return null;
    }
    return this.requireContainer(parentId);
  }

  private validateCanvasDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new DomainError(`canvas ${name} must be positive`);
    }
  }
}
