import { DomainError } from "../../domain/errors/DomainError.js";
import type { StateMemento } from "../../domain/memento/StateMemento.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";

export abstract class Command {
  private readonly targetDocument: SvgDocument;
  private before: StateMemento | undefined;
  private after: StateMemento | undefined;
  private lifecycle: "new" | "executed" | "undone" = "new";

  protected constructor(document: SvgDocument) {
    this.targetDocument = document;
  }

  public get document(): SvgDocument {
    return this.targetDocument;
  }

  public execute(): void {
    if (this.lifecycle !== "new") {
      throw new DomainError("command has already been executed");
    }
    const before = this.captureState();
    try {
      this.apply();
      this.after = this.captureState();
    } catch (error) {
      before.restore();
      throw error;
    }
    this.before = before;
    this.lifecycle = "executed";
  }

  public undo(): void {
    if (this.lifecycle !== "executed" || this.before === undefined) {
      throw new DomainError("command cannot be undone in its current state");
    }
    this.before.restore();
    this.lifecycle = "undone";
  }

  public redo(): void {
    if (this.lifecycle !== "undone" || this.after === undefined) {
      throw new DomainError("command cannot be redone in its current state");
    }
    this.after.restore();
    this.lifecycle = "executed";
  }

  protected abstract captureState(): StateMemento;

  protected abstract apply(): void;
}
