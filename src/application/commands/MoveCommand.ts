import type { SvgDocument } from "../../domain/SvgDocument.js";
import { ShapeCommand } from "./ShapeCommand.js";

export class MoveCommand extends ShapeCommand {
  private readonly dx: number;
  private readonly dy: number;

  public constructor(document: SvgDocument, id: string, dx: number, dy: number) {
    super(document, id);
    this.dx = dx;
    this.dy = dy;
  }

  protected override apply(): void {
    this.shape.move(this.dx, this.dy);
  }
}
