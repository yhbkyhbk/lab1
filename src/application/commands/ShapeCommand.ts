import type { StateMemento } from "../../domain/memento/StateMemento.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import { Command } from "./Command.js";

export abstract class ShapeCommand extends Command {
  private readonly shapeId: string;

  protected constructor(document: SvgDocument, shapeId: string) {
    super(document);
    this.shapeId = shapeId;
  }

  protected get shape(): Shape {
    return this.document.requireShape(this.shapeId);
  }

  protected override captureState(): StateMemento {
    return this.shape.captureState();
  }
}
