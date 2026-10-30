import { Shape } from "./Shape.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export class Rect extends Shape {
  public override accept<Result>(visitor: ShapeVisitor<Result>): Result {
    return visitor.visitRect(this);
  }

  private xValue: number;
  private yValue: number;
  private widthValue: number;
  private heightValue: number;

  public constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ) {
    super(id);
    this.assertFinite(x, "x");
    this.assertFinite(y, "y");
    this.assertNonNegative(width, "width");
    this.assertNonNegative(height, "height");
    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
    if (fill !== undefined) {
      this.setAttribute("fill", fill);
    }
  }

  public override get typeName(): string {
    return "rect";
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  protected override validateMoveCore(dx: number, dy: number): void {
    this.assertFiniteResult(this.xValue + dx, "x");
    this.assertFiniteResult(this.yValue + dy, "y");
  }

  protected override captureGeometryRestore(): () => void {
    const x = this.xValue;
    const y = this.yValue;
    const width = this.widthValue;
    const height = this.heightValue;
    return () => {
      this.xValue = x;
      this.yValue = y;
      this.widthValue = width;
      this.heightValue = height;
    };
  }

  protected override applyMove(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  protected override validateScaleCore(factor: number): void {
    this.assertFiniteResult(this.xValue * factor, "x");
    this.assertFiniteResult(this.yValue * factor, "y");
    this.assertFiniteResult(this.widthValue * factor, "width");
    this.assertFiniteResult(this.heightValue * factor, "height");
  }

  protected override applyScale(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
    this.widthValue *= factor;
    this.heightValue *= factor;
  }

  protected override setSpecificAttribute(
    attribute: string,
    value: string,
  ): void {
    if (attribute === "x") {
      this.xValue = this.parseFiniteNumber(value, attribute);
      return;
    }
    if (attribute === "y") {
      this.yValue = this.parseFiniteNumber(value, attribute);
      return;
    }
    if (attribute === "width") {
      const parsed = this.parseFiniteNumber(value, attribute);
      this.assertNonNegative(parsed, attribute);
      this.widthValue = parsed;
      return;
    }
    if (attribute === "height") {
      const parsed = this.parseFiniteNumber(value, attribute);
      this.assertNonNegative(parsed, attribute);
      this.heightValue = parsed;
      return;
    }
    this.unknownAttribute(attribute);
  }

  protected override getSpecificAttribute(
    attribute: string,
  ): string | undefined {
    if (attribute === "x") return String(this.xValue);
    if (attribute === "y") return String(this.yValue);
    if (attribute === "width") return String(this.widthValue);
    if (attribute === "height") return String(this.heightValue);
    return undefined;
  }
}

