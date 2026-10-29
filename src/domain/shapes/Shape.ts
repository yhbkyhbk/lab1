import { DomainError } from "../errors/DomainError.js";
import type { SvgDocument } from "../SvgDocument.js";
import type { Group } from "./Group.js";

export abstract class Shape {
  private readonly shapeId: string;
  private parentGroup: Group | null = null;
  private documentOwner: SvgDocument | null = null;
  private fillValue: string | undefined;
  private strokeValue: string | undefined;
  private strokeWidthValue: number | undefined;

  protected constructor(id: string) {
    if (id.length === 0) {
      throw new DomainError("shape id must not be empty");
    }
    this.shapeId = id;
  }

  public get id(): string {
    return this.shapeId;
  }

  public get parent(): Group | null {
    return this.parentGroup;
  }

  public get document(): SvgDocument | null {
    return this.documentOwner;
  }

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public get stroke(): string | undefined {
    return this.strokeValue;
  }

  public get strokeWidth(): number | undefined {
    return this.strokeWidthValue;
  }

  public abstract get typeName(): string;

  public move(dx: number, dy: number): void {
    this.validateMove(dx, dy);
    this.applyMove(dx, dy);
  }

  public validateMove(dx: number, dy: number): void {
    this.assertFinite(dx, "dx");
    this.assertFinite(dy, "dy");
    this.validateMoveCore(dx, dy);
  }

  public scale(factor: number): void {
    this.validateScale(factor);
    this.applyScale(factor);
  }

  public validateScale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new DomainError("scale factor must be positive");
    }
    this.validateScaleCore(factor);
  }

  public setAttribute(attribute: string, value: string): void {
    if (this.setCommonAttribute(attribute, value)) {
      return;
    }
    this.setSpecificAttribute(attribute, value);
  }

  public getAttribute(attribute: string): string | undefined {
    if (attribute === "fill") {
      return this.fillValue;
    }
    if (attribute === "stroke") {
      return this.strokeValue;
    }
    if (attribute === "stroke-width") {
      return this.strokeWidthValue === undefined
        ? undefined
        : String(this.strokeWidthValue);
    }
    return this.getSpecificAttribute(attribute);
  }

  public attachTo(parent: Group): void {
    if (this.parentGroup !== null) {
      throw new DomainError(`shape already has a parent: ${this.id}`);
    }
    if (!parent.hasDirectChild(this)) {
      throw new DomainError(
        `cannot attach shape before container insertion: ${this.id}`,
      );
    }
    this.parentGroup = parent;
  }

  public detachFrom(parent: Group): void {
    if (this.parentGroup !== parent) {
      throw new DomainError(`shape is not a child of container: ${this.id}`);
    }
    if (parent.hasDirectChild(this)) {
      throw new DomainError(
        `cannot detach shape before container removal: ${this.id}`,
      );
    }
    this.parentGroup = null;
  }

  public attachToDocument(document: SvgDocument): void {
    if (this.documentOwner !== null) {
      throw new DomainError(`shape already belongs to a document: ${this.id}`);
    }
    if (!document.containsShapeReference(this)) {
      throw new DomainError(
        `cannot attach shape before document insertion: ${this.id}`,
      );
    }
    this.documentOwner = document;
  }

  public detachFromDocument(document: SvgDocument): void {
    if (this.documentOwner !== document) {
      throw new DomainError(`shape does not belong to this document: ${this.id}`);
    }
    if (document.containsShapeReference(this)) {
      throw new DomainError(
        `cannot detach shape before document removal: ${this.id}`,
      );
    }
    this.documentOwner = null;
  }

  public contains(candidate: Shape): boolean {
    return this === candidate;
  }

  public walk(visitor: (shape: Shape) => void): void {
    visitor(this);
  }

  protected abstract validateMoveCore(dx: number, dy: number): void;

  protected abstract applyMove(dx: number, dy: number): void;

  protected abstract validateScaleCore(factor: number): void;

  protected abstract applyScale(factor: number): void;

  protected abstract setSpecificAttribute(
    attribute: string,
    value: string,
  ): void;

  protected abstract getSpecificAttribute(
    attribute: string,
  ): string | undefined;

  protected parseFiniteNumber(value: string, attribute: string): number {
    if (value.trim().length === 0) {
      throw new DomainError(`invalid number for ${attribute}: ${value}`);
    }
    const parsed = Number(value);
    this.assertFinite(parsed, attribute);
    return parsed;
  }

  protected assertFinite(value: number, attribute: string): void {
    if (!Number.isFinite(value)) {
      throw new DomainError(`invalid number for ${attribute}: ${String(value)}`);
    }
  }

  protected assertNonNegative(value: number, attribute: string): void {
    this.assertFinite(value, attribute);
    if (value < 0) {
      throw new DomainError(`${attribute} must not be negative`);
    }
  }

  protected assertFiniteResult(value: number, attribute: string): void {
    if (!Number.isFinite(value)) {
      throw new DomainError(`${attribute} is outside the supported numeric range`);
    }
  }

  protected unknownAttribute(attribute: string): never {
    throw new DomainError(`unknown attribute: ${attribute}`);
  }

  private setCommonAttribute(attribute: string, value: string): boolean {
    if (attribute === "fill") {
      this.fillValue = value;
      return true;
    }
    if (attribute === "stroke") {
      this.strokeValue = value;
      return true;
    }
    if (attribute === "stroke-width") {
      const strokeWidth = this.parseFiniteNumber(value, attribute);
      this.assertNonNegative(strokeWidth, attribute);
      this.strokeWidthValue = strokeWidth;
      return true;
    }
    return false;
  }
}
