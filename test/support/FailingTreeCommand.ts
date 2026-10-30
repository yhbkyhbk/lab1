import { TreeCommand } from "../../src/application/commands/TreeCommand.js";
import { Rect } from "../../src/domain/shapes/Rect.js";
import type { SvgDocument } from "../../src/domain/SvgDocument.js";

/** Fault injection checks rollback after an operation has actually mutated. */
export class FailingTreeCommand extends TreeCommand {
  public constructor(document: SvgDocument) {
    super(document);
  }

  protected override apply(): void {
    this.document.addShape(new Rect("partial", 1, 2, 3, 4));
    this.document.groupShapes("partial-group", ["partial", "r"]);
    throw new Error("injected failure after tree mutation");
  }
}
