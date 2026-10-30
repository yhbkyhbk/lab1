import { DomainError } from "../domain/errors/DomainError.js";

export class CommandArguments {
  private readonly values: readonly string[];

  public constructor(values: readonly string[]) {
    this.values = [...values];
  }

  public get length(): number {
    return this.values.length;
  }

  public expect(minimum: number, maximum: number, syntax: string): void {
    if (this.length < minimum || this.length > maximum) {
      throw new DomainError(`usage: ${syntax}`);
    }
  }

  public text(index: number): string {
    const value = this.values[index];
    if (value === undefined) throw new DomainError("missing command parameter");
    return value;
  }

  public number(index: number): number {
    const value = this.text(index);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
      throw new DomainError(`invalid number: ${value}`);
    }
    const number = Number(value);
    if (!Number.isFinite(number)) throw new DomainError(`invalid number: ${value}`);
    return number;
  }

  public tail(start: number, end = this.length): readonly string[] {
    return this.values.slice(start, end);
  }
}
