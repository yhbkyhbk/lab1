import type { SvgDocument } from "../../domain/SvgDocument.js";
import { ShapeCommand } from "./ShapeCommand.js";

export class SetCommand extends ShapeCommand {
  private readonly attribute: string;
  private readonly value: string;

  public constructor(document: SvgDocument, id: string, attribute: string, value: string) {
    super(document, id);
    this.attribute = attribute;
    this.value = value;
  }

  protected override apply(): void {
    this.shape.setAttribute(this.attribute, this.value);
  }
}
