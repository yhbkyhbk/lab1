import { DomainError } from "./errors/DomainError.js";

export class ShapeParameters {
  private readonly values: readonly string[];

  public constructor(values: readonly string[]) {
    this.values = [...values];
  }

  public expectCount(minimum: number, maximum = minimum): void {
    if (this.values.length < minimum || this.values.length > maximum) {
      throw new DomainError(`expected ${minimum === maximum ? minimum : `${minimum}-${maximum}`} shape parameters, got ${this.values.length}`);
    }
  }

  public text(index: number): string {
    const value = this.values[index];
    if (value === undefined) throw new DomainError("missing shape parameter");
    return value;
  }

  public optionalText(index: number): string | undefined {
    return this.values[index];
  }

  public number(index: number): number {
    const value = this.text(index);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
      throw new DomainError(`invalid number: ${value}`);
    }
    const result = Number(value);
    if (!Number.isFinite(result)) throw new DomainError(`invalid number: ${value}`);
    return result;
  }
}
