import type { Shape } from "../../domain/shapes/Shape.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import { TreeCommand } from "./TreeCommand.js";

export class CreateCommand extends TreeCommand {
  private readonly createdShape: Shape;
  private readonly parentId: string | undefined;

  public constructor(document: SvgDocument, shape: Shape, parentId?: string) {
    super(document);
    this.createdShape = shape;
    this.parentId = parentId;
  }

  protected override apply(): void {
    this.document.addShape(this.createdShape, this.parentId);
  }
}
