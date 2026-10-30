import type { Document, Element } from "@xmldom/xmldom";
import type { Circle } from "../../domain/shapes/Circle.js";
import type { Ellipse } from "../../domain/shapes/Ellipse.js";
import type { Group } from "../../domain/shapes/Group.js";
import type { Line } from "../../domain/shapes/Line.js";
import type { Rect } from "../../domain/shapes/Rect.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import { ShapeVisitor } from "../../domain/shapes/ShapeVisitor.js";
import type { TextShape } from "../../domain/shapes/TextShape.js";

export class SvgShapeWriter extends ShapeVisitor<Element> {
  private readonly dom: Document;

  public constructor(dom: Document) {
    super();
    this.dom = dom;
  }

  public override visitRect(shape: Rect): Element {
    return this.element("rect", shape, [["x", shape.x], ["y", shape.y], ["width", shape.width], ["height", shape.height]]);
  }

  public override visitCircle(shape: Circle): Element {
    return this.element("circle", shape, [["cx", shape.cx], ["cy", shape.cy], ["r", shape.radius]]);
  }

  public override visitEllipse(shape: Ellipse): Element {
    return this.element("ellipse", shape, [["cx", shape.cx], ["cy", shape.cy], ["rx", shape.radiusX], ["ry", shape.radiusY]]);
  }

  public override visitLine(shape: Line): Element {
    return this.element("line", shape, [["x1", shape.x1], ["y1", shape.y1], ["x2", shape.x2], ["y2", shape.y2]]);
  }

  public override visitText(shape: TextShape): Element {
    const element = this.element("text", shape, [["x", shape.x], ["y", shape.y]]);
    element.appendChild(this.dom.createTextNode(shape.text));
    return element;
  }

  public override visitGroup(shape: Group): Element {
    const element = this.element("g", shape, []);
    for (const child of shape.children) element.appendChild(child.accept(this));
    return element;
  }

  private element(type: string, shape: Shape, geometry: readonly (readonly [string, number])[]): Element {
    const element = this.dom.createElementNS("http://www.w3.org/2000/svg", type);
    element.setAttribute("id", shape.id);
    for (const [name, value] of geometry) element.setAttribute(name, String(value));
    if (shape.fill !== undefined) element.setAttribute("fill", shape.fill);
    if (shape.stroke !== undefined) element.setAttribute("stroke", shape.stroke);
    if (shape.strokeWidth !== undefined) element.setAttribute("stroke-width", String(shape.strokeWidth));
    for (const [name, value] of shape.extraSvgAttributes) {
      if (name === "xml:space") element.setAttributeNS("http://www.w3.org/XML/1998/namespace", name, value);
      else element.setAttribute(name, value);
    }
    return element;
  }
}
