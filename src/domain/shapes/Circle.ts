import { Shape } from "./Shape.js";

export class Circle extends Shape {
  private cxValue: number;
  private cyValue: number;
  private radiusValue: number;

  public constructor(
    id: string,
    cx: number,
    cy: number,
    radius: number,
    fill?: string,
  ) {
    super(id);
    this.assertFinite(cx, "cx");
    this.assertFinite(cy, "cy");
    this.assertNonNegative(radius, "r");
    this.cxValue = cx;
    this.cyValue = cy;
    this.radiusValue = radius;
    if (fill !== undefined) {
      this.setAttribute("fill", fill);
    }
  }

  public override get typeName(): string {
    return "circle";
  }

  public get cx(): number {
    return this.cxValue;
  }

  public get cy(): number {
    return this.cyValue;
  }

  public get radius(): number {
    return this.radiusValue;
  }

  protected override validateMoveCore(dx: number, dy: number): void {
    this.assertFiniteResult(this.cxValue + dx, "cx");
    this.assertFiniteResult(this.cyValue + dy, "cy");
  }

  protected override captureGeometryRestore(): () => void {
    const cx = this.cxValue;
    const cy = this.cyValue;
    const radius = this.radiusValue;
    return () => {
      this.cxValue = cx;
      this.cyValue = cy;
      this.radiusValue = radius;
    };
  }

  protected override applyMove(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  protected override validateScaleCore(factor: number): void {
    this.assertFiniteResult(this.cxValue * factor, "cx");
    this.assertFiniteResult(this.cyValue * factor, "cy");
    this.assertFiniteResult(this.radiusValue * factor, "r");
  }

  protected override applyScale(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.radiusValue *= factor;
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
    if (attribute === "r") {
      const parsed = this.parseFiniteNumber(value, attribute);
      this.assertNonNegative(parsed, attribute);
      this.radiusValue = parsed;
      return;
    }
    this.unknownAttribute(attribute);
  }

  protected override getSpecificAttribute(
    attribute: string,
  ): string | undefined {
    if (attribute === "cx") return String(this.cxValue);
    if (attribute === "cy") return String(this.cyValue);
    if (attribute === "r") return String(this.radiusValue);
    return undefined;
  }
}

