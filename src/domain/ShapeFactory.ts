import { DomainError } from "./errors/DomainError.js";
import { ShapeParameters } from "./ShapeParameters.js";
import { ShapeDefinition } from "./ShapeDefinition.js";
import { Circle } from "./shapes/Circle.js";
import { Ellipse } from "./shapes/Ellipse.js";
import { Group } from "./shapes/Group.js";
import { Line } from "./shapes/Line.js";
import { Rect } from "./shapes/Rect.js";
import type { Shape } from "./shapes/Shape.js";
import { TextShape } from "./shapes/TextShape.js";

export class ShapeFactory {
  private readonly builders = new Map<string, ShapeDefinition>([
    ["rect", new ShapeDefinition(["x", "y", "width", "height"], (id, args: ShapeParameters) => {
      args.expectCount(4, 5);
      return new Rect(id, args.number(0), args.number(1), args.number(2), args.number(3), args.optionalText(4));
    })],
    ["circle", new ShapeDefinition(["cx", "cy", "r"], (id, args) => {
      args.expectCount(3, 4);
      return new Circle(id, args.number(0), args.number(1), args.number(2), args.optionalText(3));
    })],
    ["ellipse", new ShapeDefinition(["cx", "cy", "rx", "ry"], (id, args) => {
      args.expectCount(4, 5);
      return new Ellipse(id, args.number(0), args.number(1), args.number(2), args.number(3), args.optionalText(4));
    })],
    ["line", new ShapeDefinition(["x1", "y1", "x2", "y2"], (id, args) => {
      args.expectCount(4, 5);
      return new Line(id, args.number(0), args.number(1), args.number(2), args.number(3), args.optionalText(4));
    })],
    ["text", new ShapeDefinition(["x", "y", "$text"], (id, args) => {
      args.expectCount(3);
      return new TextShape(id, args.number(0), args.number(1), args.text(2));
    })],
    ["g", new ShapeDefinition([], (id, args) => {
      args.expectCount(0);
      return new Group(id);
    })],
  ]);

  public create(type: string, id: string, parameters: readonly string[]): Shape {
    const definition = this.definition(type);
    this.validateId(id);
    return definition.create(id, parameters);
  }

  public createFromSvg(type: string, id: string, attributes: ReadonlyMap<string, string>, text: string): Shape {
    this.validateId(id);
    return this.definition(type).fromSvg(id, attributes, text);
  }

  private definition(type: string): ShapeDefinition {
    const definition = this.builders.get(type);
    if (definition === undefined) {
      throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return definition;
  }

  private validateId(id: string): void {
    if (id.length === 0 || /\s/.test(id)) {
      throw new DomainError("shape id must not be empty or contain whitespace");
    }
  }
}
