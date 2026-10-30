import type { SvgDocument } from "../../domain/SvgDocument.js";
import { TreeCommand } from "./TreeCommand.js";

export class AddToCommand extends TreeCommand {
  private readonly containerId: string;
  private readonly shapeId: string;

  public constructor(document: SvgDocument, containerId: string, shapeId: string) {
    super(document);
    this.containerId = containerId;
    this.shapeId = shapeId;
  }

  protected override apply(): void {
    this.document.addTo(this.containerId, this.shapeId);
  }
}
