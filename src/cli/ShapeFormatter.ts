import type { Circle } from "../domain/shapes/Circle.js";
import type { Ellipse } from "../domain/shapes/Ellipse.js";
import type { Group } from "../domain/shapes/Group.js";
import type { Line } from "../domain/shapes/Line.js";
import type { Rect } from "../domain/shapes/Rect.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { ShapeVisitor } from "../domain/shapes/ShapeVisitor.js";
import type { TextShape } from "../domain/shapes/TextShape.js";

export class ShapeFormatter extends ShapeVisitor<string> {
  public label(shape: Shape): string {
    return `${shape.typeName}#${shape.id}`;
  }

  public styles(shape: Shape): string {
    const styles: string[] = [];
    if (shape.fill !== undefined) styles.push(`fill=${shape.fill}`);
    if (shape.stroke !== undefined) styles.push(`stroke=${shape.stroke}`);
    if (shape.strokeWidth !== undefined) styles.push(`stroke-width=${shape.strokeWidth}`);
    for (const [name, value] of shape.extraSvgAttributes) {
      styles.push(`${name}=${/\s/.test(value) ? JSON.stringify(value) : value}`);
    }
    return styles.join(" ");
  }

  public inline(shape: Shape): string {
    return [this.label(shape), shape.accept(this), this.styles(shape)]
      .filter((part) => part.length > 0).join(" ");
  }

  public show(shape: Shape): string {
    const parent = shape.parent === null ? "svg" : this.label(shape.parent);
    const details = [shape.accept(this), this.styles(shape)]
      .filter((part) => part.length > 0).map((part) => `  ${part}`);
    return [`${this.label(shape)}  parent=${parent}`, ...details].join("\n");
  }

  public override visitRect(shape: Rect): string {
    return `x=${shape.x} y=${shape.y} w=${shape.width} h=${shape.height}`;
  }

  public override visitCircle(shape: Circle): string {
    return `cx=${shape.cx} cy=${shape.cy} r=${shape.radius}`;
  }

  public override visitEllipse(shape: Ellipse): string {
    return `cx=${shape.cx} cy=${shape.cy} rx=${shape.radiusX} ry=${shape.radiusY}`;
  }

  public override visitLine(shape: Line): string {
    return `(${shape.x1},${shape.y1}) -> (${shape.x2},${shape.y2})`;
  }

  public override visitText(shape: TextShape): string {
    return `(${shape.x},${shape.y}) ${JSON.stringify(shape.text)}`;
  }

  public override visitGroup(_shape: Group): string {
    return "";
  }
}
