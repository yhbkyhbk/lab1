import { DomainError } from "../domain/errors/DomainError.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import { CreateCommand } from "./commands/CreateCommand.js";
import type { Command } from "./commands/Command.js";
import { CommandHistory } from "./history/CommandHistory.js";

export class SvgEditor {
  private currentDocument: SvgDocument | null = null;
  private readonly history = new CommandHistory();
  private readonly shapeFactory = new ShapeFactory();

  public createShape(type: string, id: string, parameters: readonly string[], parentId?: string): CreateCommand {
    const document = this.document;
    const shape = this.shapeFactory.create(type, id, parameters);
    const command = new CreateCommand(document, shape, parentId);
    this.execute(command);
    return command;
  }

  public get document(): SvgDocument {
    if (this.currentDocument === null) {
      throw new DomainError("no document. use 'init' or 'read' first");
    }
    return this.currentDocument;
  }

  public get undoCount(): number {
    return this.history.undoCount;
  }

  public get redoCount(): number {
    return this.history.redoCount;
  }

  public init(width = 800, height = 600): SvgDocument {
    const document = new SvgDocument(width, height);
    this.replaceDocument(document);
    return document;
  }

  /** Called only after a complete, successful SVG read. */
  public replaceDocument(document: SvgDocument): void {
    this.currentDocument = document;
    this.history.markIoBoundary();
  }

  public resizeCanvas(width: number, height: number): void {
    this.document.resize(width, height);
    this.history.markIoBoundary();
  }

  /** Successful save/read operations use this boundary; failures do not. */
  public markIoBoundary(): void {
    void this.document;
    this.history.markIoBoundary();
  }

  public execute(command: Command): void {
    if (command.document !== this.document) {
      throw new DomainError("command belongs to a different document");
    }
    this.history.execute(command);
  }

  public undo(): Command {
    void this.document;
    return this.history.undo();
  }

  public redo(): Command {
    void this.document;
    return this.history.redo();
  }
}
