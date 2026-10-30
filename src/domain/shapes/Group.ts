import { DomainError } from "../errors/DomainError.js";
import {
  TREE_MUTATION_TOKEN,
  type TreeMutationToken,
} from "../internal/TreeMutationToken.js";
import { Shape } from "./Shape.js";

export class Group extends Shape {
  private readonly childShapes: Shape[] = [];

  public constructor(id: string, children: readonly Shape[] = []) {
    super(id);
    this.validateChildren(children);
    for (const child of children) {
      this.childShapes.push(child);
      child.attachTo(this);
    }
  }

  public override get typeName(): string {
    return "g";
  }

  public get children(): readonly Shape[] {
    return [...this.childShapes];
  }

  public hasDirectChild(candidate: Shape): boolean {
    return this.childShapes.includes(candidate);
  }

  public appendChild(child: Shape): void {
    this.insertChild(this.childShapes.length, child);
  }

  public insertChild(index: number, child: Shape): void {
    this.validateInsertionIndex(index);
    this.validateChild(child);
    const document = this.document;
    if (document !== null) {
      document.validateSubtreeForInsertion(child);
    }
    this.childShapes.splice(index, 0, child);
    child.attachTo(this);
    if (document !== null) {
      document.registerAttachedSubtree(child);
    }
  }

  public indexOfChild(child: Shape): number {
    const index = this.childShapes.indexOf(child);
    if (index < 0) {
      throw new DomainError(`shape is not a child of container: ${child.id}`);
    }
    return index;
  }

  public reorderChild(child: Shape, targetIndex: number): void {
    const sourceIndex = this.indexOfChild(child);
    if (
      !Number.isInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= this.childShapes.length
    ) {
      throw new DomainError(`invalid child index: ${String(targetIndex)}`);
    }
    if (sourceIndex === targetIndex) {
      return;
    }
    this.childShapes.splice(sourceIndex, 1);
    this.childShapes.splice(targetIndex, 0, child);
  }

  /** @internal Structural moves are coordinated by SvgDocument. */
  public removeExistingChild(
    child: Shape,
    token: TreeMutationToken,
  ): number {
    this.assertMutationToken(token);
    const index = this.indexOfChild(child);
    this.childShapes.splice(index, 1);
    child.detachFrom(this);
    return index;
  }

  /** @internal Structural moves are coordinated by SvgDocument. */
  public insertExistingChild(
    index: number,
    child: Shape,
    token: TreeMutationToken,
  ): void {
    this.assertMutationToken(token);
    this.validateInsertionIndex(index);
    if (child.parent !== null) {
      throw new DomainError(`shape already has a parent: ${child.id}`);
    }
    if (child.document !== this.document) {
      throw new DomainError(`shape belongs to a different document: ${child.id}`);
    }
    if (child.contains(this)) {
      throw new DomainError(
        `cannot add a container into its own descendant: ${child.id}`,
      );
    }
    this.childShapes.splice(index, 0, child);
    child.attachTo(this);
  }

  public override contains(candidate: Shape): boolean {
    if (this === candidate) {
      return true;
    }
    return this.childShapes.some((child) => child.contains(candidate));
  }

  public override walk(visitor: (shape: Shape) => void): void {
    visitor(this);
    for (const child of this.childShapes) {
      child.walk(visitor);
    }
  }

  protected override validateMoveCore(dx: number, dy: number): void {
    for (const child of this.childShapes) {
      child.validateMove(dx, dy);
    }
  }

  protected override captureGeometryRestore(): () => void {
    const children = this.childShapes.map((child) => child.captureState());
    return () => {
      for (const child of children) child.restore();
    };
  }

  protected override applyMove(dx: number, dy: number): void {
    for (const child of this.childShapes) {
      child.move(dx, dy);
    }
  }

  protected override validateScaleCore(factor: number): void {
    for (const child of this.childShapes) {
      child.validateScale(factor);
    }
  }

  protected override applyScale(factor: number): void {
    for (const child of this.childShapes) {
      child.scale(factor);
    }
  }

  protected override setSpecificAttribute(
    attribute: string,
    _value: string,
  ): void {
    this.unknownAttribute(attribute);
  }

  protected override getSpecificAttribute(
    _attribute: string,
  ): string | undefined {
    return undefined;
  }

  private validateChildren(children: readonly Shape[]): void {
    const ids = new Set<string>([this.id]);
    for (const child of children) {
      if (child.parent !== null) {
        throw new DomainError(`shape already has a parent: ${child.id}`);
      }
      if (child.document !== null) {
        throw new DomainError(`shape already belongs to a document: ${child.id}`);
      }
      child.walk((shape) => {
        if (ids.has(shape.id)) {
          throw new DomainError(`id already exists: ${shape.id}`);
        }
        ids.add(shape.id);
      });
    }
  }

  private validateChild(child: Shape): void {
    if (child.parent !== null) {
      throw new DomainError(`shape already has a parent: ${child.id}`);
    }
    if (child.document !== null) {
      throw new DomainError(`shape already belongs to a document: ${child.id}`);
    }
    if (child.contains(this)) {
      throw new DomainError(
        `cannot add a container into its own descendant: ${child.id}`,
      );
    }

    const ids = new Set<string>();
    this.walk((shape) => ids.add(shape.id));
    child.walk((shape) => {
      if (ids.has(shape.id)) {
        throw new DomainError(`id already exists: ${shape.id}`);
      }
      ids.add(shape.id);
    });
  }

  private validateInsertionIndex(index: number): void {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > this.childShapes.length
    ) {
      throw new DomainError(`invalid child index: ${String(index)}`);
    }
  }

  private assertMutationToken(token: TreeMutationToken): void {
    if (token !== TREE_MUTATION_TOKEN) {
      throw new DomainError("invalid tree mutation token");
    }
  }
}
