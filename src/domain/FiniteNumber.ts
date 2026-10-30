import { DomainError } from "./errors/DomainError.js";

export class FiniteNumber {
  private constructor() {}

  public static parse(value: string, attribute?: string): number {
    const normalized = value.trim();
    const label = attribute === undefined ? "invalid number" : `invalid number for ${attribute}`;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) {
      throw new DomainError(`${label}: ${value}`);
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) throw new DomainError(`${label}: ${value}`);
    return parsed;
  }
}
