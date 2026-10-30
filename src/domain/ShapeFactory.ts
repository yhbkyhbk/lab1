import { DomainError } from "./errors/DomainError.js";
import { ShapeParameters } from "./ShapeParameters.js";
import { Circle } from "./shapes/Circle.js";
import { Ellipse } from "./shapes/Ellipse.js";
import { Group } from "./shapes/Group.js";
import { Line } from "./shapes/Line.js";
import { Rect } from "./shapes/Rect.js";
import type { Shape } from "./shapes/Shape.js";
import { TextShape } from "./shapes/TextShape.js";

export class ShapeFactory {
  private readonly builders = new Map<string, (id: string, args: ShapeParameters) => Shape>([
    ["rect", (id, args) => {
      args.expectCount(4, 5);
      return new Rect(id, args.number(0), args.number(1), args.number(2), args.number(3), args.optionalText(4));
    }],
    ["circle", (id, args) => {
      args.expectCount(3, 4);
      return new Circle(id, args.number(0), args.number(1), args.number(2), args.optionalText(3));
    }],
    ["ellipse", (id, args) => {
      args.expectCount(4, 5);
      return new Ellipse(id, args.number(0), args.number(1), args.number(2), args.number(3), args.optionalText(4));
    }],
    ["line", (id, args) => {
      args.expectCount(4, 5);
      return new Line(id, args.number(0), args.number(1), args.number(2), args.number(3), args.optionalText(4));
    }],
    ["text", (id, args) => {
      args.expectCount(3);
      return new TextShape(id, args.number(0), args.number(1), args.text(2));
    }],
    ["g", (id, args) => {
      args.expectCount(0);
      return new Group(id);
    }],
  ]);

  public create(type: string, id: string, parameters: readonly string[]): Shape {
    const builder = this.builders.get(type);
    if (builder === undefined) {
      throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    if (id.length === 0 || /\s/.test(id)) {
      throw new DomainError("shape id must not be empty or contain whitespace");
    }
    return builder(id, new ShapeParameters(parameters));
  }
}
