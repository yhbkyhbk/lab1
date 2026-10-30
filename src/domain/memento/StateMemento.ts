/** Opaque state captured by a domain object; callers cannot edit its contents. */
export class StateMemento {
  private readonly restoreAction: () => void;

  public constructor(restoreAction: () => void) {
    this.restoreAction = restoreAction;
  }

  public restore(): void {
    this.restoreAction();
  }
}
