import { Shape } from "./Shape.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export class Line extends Shape {
  public override accept<Result>(visitor: ShapeVisitor<Result>): Result {
    return visitor.visitLine(this);
  }

  private x1Value: number;
  private y1Value: number;
  private x2Value: number;
  private y2Value: number;

  public constructor(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke?: string,
  ) {
    super(id);
    this.assertFinite(x1, "x1");
    this.assertFinite(y1, "y1");
    this.assertFinite(x2, "x2");
    this.assertFinite(y2, "y2");
    this.x1Value = x1;
    this.y1Value = y1;
    this.x2Value = x2;
    this.y2Value = y2;
    if (stroke !== undefined) {
      this.setAttribute("stroke", stroke);
    }
  }

  public override get typeName(): string {
    return "line";
  }

  public get x1(): number {
    return this.x1Value;
  }

  public get y1(): number {
    return this.y1Value;
  }

  public get x2(): number {
    return this.x2Value;
  }

  public get y2(): number {
    return this.y2Value;
  }

  protected override validateMoveCore(dx: number, dy: number): void {
    this.assertFiniteResult(this.x1Value + dx, "x1");
    this.assertFiniteResult(this.y1Value + dy, "y1");
    this.assertFiniteResult(this.x2Value + dx, "x2");
    this.assertFiniteResult(this.y2Value + dy, "y2");
  }

  protected override captureGeometryRestore(): () => void {
    const x1 = this.x1Value;
    const y1 = this.y1Value;
    const x2 = this.x2Value;
    const y2 = this.y2Value;
    return () => {
      this.x1Value = x1;
      this.y1Value = y1;
      this.x2Value = x2;
      this.y2Value = y2;
    };
  }

  protected override applyMove(dx: number, dy: number): void {
    this.x1Value += dx;
    this.y1Value += dy;
    this.x2Value += dx;
    this.y2Value += dy;
  }

  protected override validateScaleCore(factor: number): void {
    this.assertFiniteResult(this.x1Value * factor, "x1");
    this.assertFiniteResult(this.y1Value * factor, "y1");
    this.assertFiniteResult(this.x2Value * factor, "x2");
    this.assertFiniteResult(this.y2Value * factor, "y2");
  }

  protected override applyScale(factor: number): void {
    this.x1Value *= factor;
    this.y1Value *= factor;
    this.x2Value *= factor;
    this.y2Value *= factor;
  }

  protected override setSpecificAttribute(
    attribute: string,
    value: string,
  ): void {
    if (attribute === "x1") {
      this.x1Value = this.parseFiniteNumber(value, attribute);
      return;
    }
    if (attribute === "y1") {
      this.y1Value = this.parseFiniteNumber(value, attribute);
      return;
    }
    if (attribute === "x2") {
      this.x2Value = this.parseFiniteNumber(value, attribute);
      return;
    }
    if (attribute === "y2") {
      this.y2Value = this.parseFiniteNumber(value, attribute);
      return;
    }
    this.unknownAttribute(attribute);
  }

  protected override getSpecificAttribute(
    attribute: string,
  ): string | undefined {
    if (attribute === "x1") return String(this.x1Value);
    if (attribute === "y1") return String(this.y1Value);
    if (attribute === "x2") return String(this.x2Value);
    if (attribute === "y2") return String(this.y2Value);
    return undefined;
  }
}

