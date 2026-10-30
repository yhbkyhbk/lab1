import type { SvgDocument } from "../../domain/SvgDocument.js";
import { TreeCommand } from "./TreeCommand.js";

export class SendToBackCommand extends TreeCommand {
  private readonly shapeId: string;

  public constructor(document: SvgDocument, shapeId: string) {
    super(document);
    this.shapeId = shapeId;
  }

  protected override apply(): void {
    this.document.sendToBack(this.shapeId);
  }
}
