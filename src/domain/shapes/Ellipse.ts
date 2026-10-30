import { Shape } from "./Shape.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export class Ellipse extends Shape {
  public override accept<Result>(visitor: ShapeVisitor<Result>): Result {
    return visitor.visitEllipse(this);
  }

  private cxValue: number;
  private cyValue: number;
  private radiusXValue: number;
  private radiusYValue: number;

  public constructor(
    id: string,
    cx: number,
    cy: number,
    radiusX: number,
    radiusY: number,
    fill?: string,
  ) {
    super(id);
    this.assertFinite(cx, "cx");
    this.assertFinite(cy, "cy");
    this.assertNonNegative(radiusX, "rx");
    this.assertNonNegative(radiusY, "ry");
    this.cxValue = cx;
    this.cyValue = cy;
    this.radiusXValue = radiusX;
    this.radiusYValue = radiusY;
    if (fill !== undefined) {
      this.setAttribute("fill", fill);
    }
  }

  public override get typeName(): string {
    return "ellipse";
  }

  public get cx(): number {
    return this.cxValue;
  }

  public get cy(): number {
    return this.cyValue;
  }

  public get radiusX(): number {
    return this.radiusXValue;
  }

  public get radiusY(): number {
    return this.radiusYValue;
  }

  protected override validateMoveCore(dx: number, dy: number): void {
    this.assertFiniteResult(this.cxValue + dx, "cx");
    this.assertFiniteResult(this.cyValue + dy, "cy");
  }

  protected override captureGeometryRestore(): () => void {
    const cx = this.cxValue;
    const cy = this.cyValue;
    const radiusX = this.radiusXValue;
    const radiusY = this.radiusYValue;
    return () => {
      this.cxValue = cx;
      this.cyValue = cy;
      this.radiusXValue = radiusX;
      this.radiusYValue = radiusY;
    };
  }

  protected override applyMove(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  protected override validateScaleCore(factor: number): void {
    this.assertFiniteResult(this.cxValue * factor, "cx");
    this.assertFiniteResult(this.cyValue * factor, "cy");
    this.assertFiniteResult(this.radiusXValue * factor, "rx");
    this.assertFiniteResult(this.radiusYValue * factor, "ry");
  }

  protected override applyScale(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.radiusXValue *= factor;
    this.radiusYValue *= factor;
  }

  protected override setSpecificAttribute(
    attribute: string,
    value: string,
  ): void {
    if (attribute === "cx") {
      this.cxValue = this.parseFiniteNumber(value, attribute);
      return;
    }
    if (attribute === "cy") {
      this.cyValue = this.parseFiniteNumber(value, attribute);
      return;
    }
    if (attribute === "rx") {
      const parsed = this.parseFiniteNumber(value, attribute);
      this.assertNonNegative(parsed, attribute);
      this.radiusXValue = parsed;
      return;
    }
    if (attribute === "ry") {
      const parsed = this.parseFiniteNumber(value, attribute);
      this.assertNonNegative(parsed, attribute);
      this.radiusYValue = parsed;
      return;
    }
    this.unknownAttribute(attribute);
  }

  protected override getSpecificAttribute(
    attribute: string,
  ): string | undefined {
    if (attribute === "cx") return String(this.cxValue);
    if (attribute === "cy") return String(this.cyValue);
    if (attribute === "rx") return String(this.radiusXValue);
    if (attribute === "ry") return String(this.radiusYValue);
    return undefined;
  }
}
