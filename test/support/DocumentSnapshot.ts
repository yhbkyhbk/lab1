import assert from "node:assert/strict";
import type { Shape } from "../../src/domain/shapes/Shape.js";
import type { Group } from "../../src/domain/shapes/Group.js";
import type { SvgDocument } from "../../src/domain/SvgDocument.js";
import { SvgWriter } from "../../src/infrastructure/svg/SvgWriter.js";

/** Independent public-API check of topology, identity, metadata and attributes. */
export class DocumentSnapshot {
  private readonly xml: string;
  private readonly shapes = new Map<string, Shape>();

  public constructor(document: SvgDocument) {
    const visited = new Set<Shape>();
    const visit = (shape: Shape, parent: Group | null): void => {
      assert.ok(!visited.has(shape), `cycle or repeated shape: ${shape.id}`);
      assert.ok(!this.shapes.has(shape.id), `duplicate id: ${shape.id}`);
      visited.add(shape);
      this.shapes.set(shape.id, shape);
      assert.equal(shape.parent, parent);
      assert.equal(shape.document, document);
      assert.equal(document.findById(shape.id), shape);
      for (const child of shape.children) {
        // The actual parent's public reference is also checked against membership.
        assert.equal(child.parent, shape);
        visit(child, child.parent);
      }
    };
    for (const root of document.roots) visit(root, null);
    assert.equal(visited.size, document.elementCount);
    this.xml = new SvgWriter().serialize(document);
  }

  public get encoded(): string { return this.xml; }

  public assertMatches(document: SvgDocument, message: string): void {
    const actual = new DocumentSnapshot(document);
    assert.equal(actual.xml, this.xml, message);
    for (const [id, shape] of this.shapes) {
      assert.equal(actual.shapes.get(id), shape, `${message}: identity ${id}`);
    }
  }
}
