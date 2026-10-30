import type { SvgDocument } from "../../domain/SvgDocument.js";
import { TreeCommand } from "./TreeCommand.js";

export class UngroupCommand extends TreeCommand {
  private readonly groupId: string;

  public constructor(document: SvgDocument, groupId: string) {
    super(document);
    this.groupId = groupId;
  }

  protected override apply(): void {
    this.document.ungroupShape(this.groupId);
  }
}
