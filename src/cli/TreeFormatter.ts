import type { Shape } from "../domain/shapes/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { ShapeFormatter } from "./ShapeFormatter.js";

export class TreeFormatter {
  private readonly shapes = new ShapeFormatter();

  public format(document: SvgDocument, id?: string): string {
    const lines: string[] = [];
    if (id === undefined) {
      lines.push(`svg (${document.width}x${document.height})`);
      this.appendChildren(document.roots, "", lines);
    } else {
      const root = document.requireShape(id);
      lines.push(this.shapes.inline(root));
      this.appendChildren(root.children, "", lines);
    }
    return lines.join("\n");
  }

  private appendChildren(children: readonly Shape[], prefix: string, lines: string[]): void {
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? "└── " : "├── "}${this.shapes.inline(child)}`);
      this.appendChildren(child.children, `${prefix}${last ? "    " : "│   "}`, lines);
    });
  }
}
