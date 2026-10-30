import type { Circle } from "./Circle.js";
import type { Ellipse } from "./Ellipse.js";
import type { Group } from "./Group.js";
import type { Line } from "./Line.js";
import type { Rect } from "./Rect.js";
import type { TextShape } from "./TextShape.js";

export abstract class ShapeVisitor<Result> {
  public abstract visitRect(shape: Rect): Result;
  public abstract visitCircle(shape: Circle): Result;
  public abstract visitEllipse(shape: Ellipse): Result;
  public abstract visitLine(shape: Line): Result;
  public abstract visitText(shape: TextShape): Result;
  public abstract visitGroup(shape: Group): Result;
}
