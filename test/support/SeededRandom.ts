export class SeededRandom {
  private state: number;

  public constructor(seed: number) { this.state = seed >>> 0; }

  public integer(maximum: number): number {
    if (maximum <= 0) throw new Error("random range must be positive");
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state % maximum;
  }

  public pick<Value>(values: readonly Value[]): Value {
    return values[this.integer(values.length)]!;
  }
}
