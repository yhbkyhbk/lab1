export class CommandFeedback {
  private readonly applied: () => string;
  private readonly reverted: () => string;

  public constructor(applied: () => string, reverted: () => string) {
    this.applied = applied;
    this.reverted = reverted;
  }

  public describeApplied(): string {
    return this.applied();
  }

  public describeReverted(): string {
    return this.reverted();
  }
}
