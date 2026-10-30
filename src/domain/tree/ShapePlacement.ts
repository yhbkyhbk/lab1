import { DomainError } from "../errors/DomainError.js";
import type { Group } from "../shapes/Group.js";
import type { Shape } from "../shapes/Shape.js";

export class ShapePlacement {
  private readonly placedShape: Shape;
  private readonly parentGroup: Group | null;
  private readonly siblingIndex: number;

  public constructor(shape: Shape, parent: Group | null, index: number) {
    if (!Number.isInteger(index) || index < 0) {
      throw new DomainError(`invalid shape index: ${String(index)}`);
    }
    this.placedShape = shape;
    this.parentGroup = parent;
    this.siblingIndex = index;
  }

  public get shape(): Shape {
    return this.placedShape;
  }

  public get parent(): Group | null {
    return this.parentGroup;
  }

  public get index(): number {
    return this.siblingIndex;
  }

  public isRoot(): boolean {
    return this.parentGroup === null;
  }
}
