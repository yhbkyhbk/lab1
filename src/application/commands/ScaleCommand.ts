import type { SvgDocument } from "../../domain/SvgDocument.js";
import { ShapeCommand } from "./ShapeCommand.js";

export class ScaleCommand extends ShapeCommand {
  private readonly factor: number;

  public constructor(document: SvgDocument, id: string, factor: number) {
    super(document, id);
    this.factor = factor;
  }

  protected override apply(): void {
    this.shape.scale(this.factor);
  }
}
