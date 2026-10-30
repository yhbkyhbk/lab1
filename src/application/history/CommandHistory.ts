import { DomainError } from "../../domain/errors/DomainError.js";
import type { Command } from "../commands/Command.js";

export class CommandHistory {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private blockedByIo = false;

  public get undoCount(): number {
    return this.undoStack.length;
  }

  public get redoCount(): number {
    return this.redoStack.length;
  }

  public get isBlockedByIo(): boolean {
    return this.blockedByIo;
  }

  public execute(command: Command): void {
    command.execute();
    // A failed command must not clear redo or unlock an IO boundary.
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.blockedByIo = false;
  }

  public undo(): Command {
    this.assertHistoryAllowed();
    const command = this.undoStack.at(-1);
    if (command === undefined) throw new DomainError("nothing to undo");
    command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return command;
  }

  public redo(): Command {
    this.assertHistoryAllowed();
    const command = this.redoStack.at(-1);
    if (command === undefined) throw new DomainError("nothing to redo");
    command.redo();
    this.redoStack.pop();
    this.undoStack.push(command);
    return command;
  }

  public markIoBoundary(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blockedByIo = true;
  }

  private assertHistoryAllowed(): void {
    if (this.blockedByIo) {
      throw new DomainError("undo not allowed after io command");
    }
  }
}
