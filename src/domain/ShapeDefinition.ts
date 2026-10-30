import { DomainError } from "./errors/DomainError.js";
import { ShapeParameters } from "./ShapeParameters.js";
import type { Shape } from "./shapes/Shape.js";

export class ShapeDefinition {
  private readonly geometry: readonly string[];
  private readonly builder: (id: string, args: ShapeParameters) => Shape;

  public constructor(geometry: readonly string[], builder: (id: string, args: ShapeParameters) => Shape) {
    this.geometry = [...geometry];
    this.builder = builder;
  }

  public create(id: string, parameters: readonly string[]): Shape {
    return this.builder(id, new ShapeParameters(parameters));
  }

  public fromSvg(id: string, attributes: ReadonlyMap<string, string>, text: string): Shape {
    const parameters = this.geometry.map((attribute) =>
      attribute === "$text" ? text : (attributes.get(attribute) ?? "0").trim().replace(/px$/, ""));
    const shape = this.create(id, parameters);
    for (const [name, value] of attributes) {
      if (name === "id" || this.geometry.includes(name)) continue;
      if (name === "text") throw new DomainError("SVG text content must be child text, not an attribute");
      if (name === "fill" || name === "stroke" || name === "stroke-width") {
        shape.setAttribute(name, name === "stroke-width" ? value.trim().replace(/px$/, "") : value);
      } else {
        shape.preserveSvgAttribute(name, value);
      }
    }
    return shape;
  }
}
