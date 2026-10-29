import { Shape } from "./Shape.js";

export class TextShape extends Shape {
  private xValue: number;
  private yValue: number;
  private textValue: string;

  public constructor(id: string, x: number, y: number, text: string) {
    super(id);
    this.assertFinite(x, "x");
    this.assertFinite(y, "y");
    this.xValue = x;
    this.yValue = y;
    this.textValue = text;
  }

  public override get typeName(): string {
    return "text";
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get text(): string {
    return this.textValue;
  }

  protected override validateMoveCore(dx: number, dy: number): void {
    this.assertFiniteResult(this.xValue + dx, "x");
    this.assertFiniteResult(this.yValue + dy, "y");
  }

  protected override applyMove(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  protected override validateScaleCore(factor: number): void {
    this.assertFiniteResult(this.xValue * factor, "x");
    this.assertFiniteResult(this.yValue * factor, "y");
  }

  protected override applyScale(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
  }

  protected override setSpecificAttribute(
    attribute: string,
    value: string,
  ): void {
    if (attribute === "text") {
      this.textValue = value;
      return;
    }
    if (attribute === "x") {
      this.xValue = this.parseFiniteNumber(value, attribute);
      return;
    }
    if (attribute === "y") {
      this.yValue = this.parseFiniteNumber(value, attribute);
      return;
    }
    this.unknownAttribute(attribute);
  }

  protected override getSpecificAttribute(
    attribute: string,
  ): string | undefined {
    if (attribute === "x") return String(this.xValue);
    if (attribute === "y") return String(this.yValue);
    if (attribute === "text") return this.textValue;
    return undefined;
  }
}

