import { DomainError } from "../errors/DomainError.js";
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
    this.validateChild(child);
    const document = this.document;
    if (document !== null) {
      document.validateSubtreeForInsertion(child);
    }
    this.childShapes.push(child);
    child.attachTo(this);
    if (document !== null) {
      document.registerAttachedSubtree(child);
    }
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
}
