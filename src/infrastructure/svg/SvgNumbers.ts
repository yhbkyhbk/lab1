import { DomainError } from "../../domain/errors/DomainError.js";
import { ViewBox } from "../../domain/ViewBox.js";

export class SvgNumbers {
  public static dimension(value: string | null, fallback: number, name: string): number {
    if (value === null) return fallback;
    const number = value.trim().replace(/px$/, "");
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(number) || !Number.isFinite(Number(number))) {
      throw new DomainError(`unsupported SVG ${name}: ${value}`);
    }
    return Number(number);
  }

  public static viewBox(value: string | null): ViewBox | undefined {
    if (value === null) return undefined;
    const numbers = value.trim().split(/[\s,]+/);
    if (numbers.length !== 4) throw new DomainError("invalid SVG viewBox");
    return new ViewBox(
      this.dimension(numbers[0]!, 0, "viewBox"),
      this.dimension(numbers[1]!, 0, "viewBox"),
      this.dimension(numbers[2]!, 0, "viewBox"),
      this.dimension(numbers[3]!, 0, "viewBox"),
    );
  }
}
