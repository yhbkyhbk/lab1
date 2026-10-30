import type { SvgDocument } from "../../domain/SvgDocument.js";
import { TreeCommand } from "./TreeCommand.js";

export class GroupCommand extends TreeCommand {
  private readonly groupId: string;
  private readonly shapeIds: readonly string[];

  public constructor(document: SvgDocument, groupId: string, ids: readonly string[]) {
    super(document);
    this.groupId = groupId;
    this.shapeIds = [...ids];
  }

  protected override apply(): void {
    this.document.groupShapes(this.groupId, this.shapeIds);
  }
}
