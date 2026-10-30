import type { Circle } from "../domain/shapes/Circle.js";
import type { Ellipse } from "../domain/shapes/Ellipse.js";
import type { Group } from "../domain/shapes/Group.js";
import type { Line } from "../domain/shapes/Line.js";
import type { Rect } from "../domain/shapes/Rect.js";
import { ShapeVisitor } from "../domain/shapes/ShapeVisitor.js";
import type { TextShape } from "../domain/shapes/TextShape.js";

export class PositionFormatter extends ShapeVisitor<string | undefined> {
  public override visitRect(shape: Rect): string {
    return `(${shape.x},${shape.y})`;
  }

  public override visitCircle(shape: Circle): string {
    return `(${shape.cx},${shape.cy})`;
  }

  public override visitEllipse(shape: Ellipse): string {
    return `(${shape.cx},${shape.cy})`;
  }

  public override visitLine(shape: Line): string {
    return `(${shape.x1},${shape.y1}) -> (${shape.x2},${shape.y2})`;
  }

  public override visitText(shape: TextShape): string {
    return `(${shape.x},${shape.y})`;
  }

  public override visitGroup(_shape: Group): undefined {
    return undefined;
  }
}
