import { DomainError } from "./errors/DomainError.js";

export class ViewBox {
  private readonly left: number;
  private readonly top: number;
  private readonly boxWidth: number;
  private readonly boxHeight: number;

  public constructor(x: number, y: number, width: number, height: number) {
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new DomainError("viewBox requires finite coordinates and positive dimensions");
    }
    this.left = x;
    this.top = y;
    this.boxWidth = width;
    this.boxHeight = height;
  }

  public get width(): number { return this.boxWidth; }
  public get height(): number { return this.boxHeight; }

  public toString(): string {
    return `${this.left} ${this.top} ${this.boxWidth} ${this.boxHeight}`;
  }
}
