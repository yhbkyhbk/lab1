import assert from "node:assert/strict";
import test from "node:test";

import { SvgDocument } from "../src/domain/SvgDocument.js";
import { Circle } from "../src/domain/shapes/Circle.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import type { Shape } from "../src/domain/shapes/Shape.js";
import { TextShape } from "../src/domain/shapes/TextShape.js";

function publicTreeSnapshot(document: SvgDocument): object {
  const traversal: string[] = [];
  const indexed: string[] = [];
  document.walk((shape) => {
    traversal.push(`${shape.parent?.id ?? "svg"}/${shape.id}`);
    if (document.findById(shape.id) === shape && shape.document === document) {
      indexed.push(shape.id);
    }
  });
  return {
    roots: document.roots.map((shape) => shape.id),
    traversal,
    indexed,
    elementCount: document.elementCount,
  };
}

function ids(shapes: readonly Shape[]): string[] {
  return shapes.map((shape) => shape.id);
}

test("delete removes a root shape and restore returns it to the exact index", () => {
  const document = new SvgDocument();
  const first = new Rect("first", 0, 0, 1, 1);
  const removed = new Circle("removed", 5, 5, 2);
  const last = new TextShape("last", 0, 0, "last");
  document.addShape(first);
  document.addShape(removed);
  document.addShape(last);

  const placement = document.deleteShape("removed");

  assert.deepEqual(ids(document.roots), ["first", "last"]);
  assert.equal(document.findById("removed"), undefined);
  assert.equal(removed.parent, null);
  assert.equal(removed.document, null);
  assert.equal(placement.shape, removed);
  assert.equal(placement.parent, null);
  assert.equal(placement.index, 1);

  document.restoreShape(placement);
  assert.deepEqual(ids(document.roots), ["first", "removed", "last"]);
  assert.equal(document.requireShape("removed"), removed);
  assert.equal(removed.document, document);
});

test("delete removes and restores an entire nested subtree", () => {
  const before = new Rect("before", 0, 0, 1, 1);
  const child = new Rect("child", 1, 1, 2, 2);
  const label = new TextShape("label", 1, 2, "nested");
  const nested = new Group("nested", [child, label]);
  const after = new Circle("after", 10, 10, 1);
  const outer = new Group("outer", [before, nested, after]);
  const document = new SvgDocument();
  document.addShape(outer);

  const placement = document.deleteShape("nested");

  assert.deepEqual(ids(outer.children), ["before", "after"]);
  for (const id of ["nested", "child", "label"]) {
    assert.equal(document.findById(id), undefined);
  }
  assert.equal(nested.parent, null);
  assert.equal(nested.document, null);
  assert.equal(child.parent, nested);
  assert.equal(child.document, null);

  document.restoreShape(placement);
  assert.deepEqual(ids(outer.children), ["before", "nested", "after"]);
  assert.equal(document.requireShape("child"), child);
  assert.equal(nested.parent, outer);
  assert.equal(child.parent, nested);
});

test("group preserves document order even when ids are supplied in reverse", () => {
  const document = new SvgDocument();
  for (const id of ["a", "b", "c", "d"]) {
    document.addShape(new Rect(id, 0, 0, 1, 1));
  }

  const group = document.groupShapes("selected", ["c", "a"]);

  assert.deepEqual(ids(document.roots), ["selected", "b", "d"]);
  assert.deepEqual(ids(group.children), ["a", "c"]);
  assert.equal(document.elementCount, 5);
  assert.equal(document.requireShape("a").parent, group);
  assert.equal(document.requireShape("c").parent, group);
});

test("group deterministically collects targets from different parents", () => {
  const leftOne = new Rect("left-1", 0, 0, 1, 1);
  const leftTwo = new Rect("left-2", 0, 0, 1, 1);
  const rightOne = new Circle("right-1", 0, 0, 1);
  const rightTwo = new Circle("right-2", 0, 0, 1);
  const left = new Group("left", [leftOne, leftTwo]);
  const right = new Group("right", [rightOne, rightTwo]);
  const document = new SvgDocument();
  document.addShape(left);
  document.addShape(right);

  const group = document.groupShapes("cross", ["right-1", "left-2"]);

  assert.deepEqual(ids(left.children), ["left-1", "cross"]);
  assert.deepEqual(ids(group.children), ["left-2", "right-1"]);
  assert.deepEqual(ids(right.children), ["right-2"]);
  assert.equal(group.parent, left);
  assert.equal(document.elementCount, 7);
});

test("invalid group requests are atomic", () => {
  const child = new Rect("child", 0, 0, 1, 1);
  const parent = new Group("parent", [child]);
  const sibling = new Circle("sibling", 5, 5, 1);
  const document = new SvgDocument();
  document.addShape(parent);
  document.addShape(sibling);
  const before = publicTreeSnapshot(document);

  assert.throws(
    () => document.groupShapes("new", ["child", "parent"]),
    /cannot group a container into its own descendant: parent/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
  assert.throws(
    () => document.groupShapes("parent", ["sibling"]),
    /id already exists: parent/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
  assert.throws(
    () => document.groupShapes("new", ["sibling", "sibling"]),
    /shape specified more than once: sibling/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
  assert.throws(
    () => document.groupShapes("new", ["missing"]),
    /no such shape: missing/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
  assert.throws(
    () => document.groupShapes("new", []),
    /group requires at least one shape/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
});

test("ungroup promotes children into the nested group position", () => {
  const before = new Rect("before", 0, 0, 1, 1);
  const first = new Rect("first", 1, 1, 1, 1);
  const second = new Circle("second", 2, 2, 1);
  const nested = new Group("nested", [first, second]);
  const after = new TextShape("after", 0, 0, "after");
  const outer = new Group("outer", [before, nested, after]);
  const document = new SvgDocument();
  document.addShape(outer);

  const removedGroup = document.ungroupShape("nested");

  assert.equal(removedGroup, nested);
  assert.deepEqual(ids(outer.children), ["before", "first", "second", "after"]);
  assert.deepEqual(nested.children, []);
  assert.equal(document.findById("nested"), undefined);
  assert.equal(nested.document, null);
  assert.equal(first.parent, outer);
  assert.equal(second.parent, outer);
  assert.equal(first.document, document);
  assert.equal(document.elementCount, 5);
});

test("top-level ungroup and non-container ungroup fail atomically", () => {
  const leaf = new Rect("leaf", 0, 0, 1, 1);
  const top = new Group("top", [leaf]);
  const document = new SvgDocument();
  document.addShape(top);
  const before = publicTreeSnapshot(document);

  assert.throws(
    () => document.ungroupShape("top"),
    /cannot ungroup top-level container: top/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
  assert.throws(
    () => document.ungroupShape("leaf"),
    /not a container: leaf/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
});

test("addto moves shapes to the target container as the last child", () => {
  const root = new Rect("root", 0, 0, 1, 1);
  const first = new Rect("first", 0, 0, 1, 1);
  const second = new Circle("second", 0, 0, 1);
  const target = new Group("target", [first, second]);
  const document = new SvgDocument();
  document.addShape(root);
  document.addShape(target);

  const rootPlacement = document.addTo("target", "root");
  assert.equal(rootPlacement.parent, null);
  assert.equal(rootPlacement.index, 0);
  assert.deepEqual(ids(document.roots), ["target"]);
  assert.deepEqual(ids(target.children), ["first", "second", "root"]);

  const firstPlacement = document.addTo("target", "first");
  assert.equal(firstPlacement.parent, target);
  assert.equal(firstPlacement.index, 0);
  assert.deepEqual(ids(target.children), ["second", "root", "first"]);
  assert.equal(document.elementCount, 4);
});

test("addto rejects self and descendant cycles without mutation", () => {
  const child = new Group("child");
  const parent = new Group("parent", [child]);
  const leaf = new Rect("leaf", 0, 0, 1, 1);
  const document = new SvgDocument();
  document.addShape(parent);
  document.addShape(leaf);
  const before = publicTreeSnapshot(document);

  assert.throws(
    () => document.addTo("child", "parent"),
    /cannot add a container into its own descendant: parent/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
  assert.throws(
    () => document.addTo("parent", "parent"),
    /cannot add a container into its own descendant: parent/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
  assert.throws(
    () => document.addTo("missing", "leaf"),
    /no such container: missing/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
  assert.throws(
    () => document.addTo("leaf", "parent"),
    /not a container: leaf/,
  );
  assert.deepEqual(publicTreeSnapshot(document), before);
});

test("front and back change only same-level z-order", () => {
  const first = new Rect("first", 0, 0, 1, 1);
  const second = new Rect("second", 0, 0, 1, 1);
  const innerFirst = new Circle("inner-first", 0, 0, 1);
  const innerSecond = new Circle("inner-second", 0, 0, 1);
  const group = new Group("group", [innerFirst, innerSecond]);
  const document = new SvgDocument();
  document.addShape(first);
  document.addShape(second);
  document.addShape(group);

  const rootPlacement = document.bringToFront("first");
  assert.equal(rootPlacement.index, 0);
  assert.deepEqual(ids(document.roots), ["second", "group", "first"]);
  document.sendToBack("first");
  assert.deepEqual(ids(document.roots), ["first", "second", "group"]);

  document.bringToFront("inner-first");
  assert.deepEqual(ids(group.children), ["inner-second", "inner-first"]);
  document.sendToBack("inner-first");
  assert.deepEqual(ids(group.children), ["inner-first", "inner-second"]);
  assert.deepEqual(ids(document.roots), ["first", "second", "group"]);
});

test("moveShapeTo restores addto and z-order placements exactly", () => {
  const first = new Rect("first", 0, 0, 1, 1);
  const moved = new Rect("moved", 0, 0, 1, 1);
  const last = new Rect("last", 0, 0, 1, 1);
  const target = new Group("target");
  const document = new SvgDocument();
  document.addShape(first);
  document.addShape(moved);
  document.addShape(last);
  document.addShape(target);

  const original = document.addTo("target", "moved");
  document.moveShapeTo(original);
  assert.deepEqual(ids(document.roots), ["first", "moved", "last", "target"]);
  assert.deepEqual(target.children, []);
  assert.equal(moved.parent, null);

  const zOrder = document.bringToFront("first");
  assert.deepEqual(ids(document.roots), ["moved", "last", "target", "first"]);
  document.moveShapeTo(zOrder);
  assert.deepEqual(ids(document.roots), ["first", "moved", "last", "target"]);
});

test("saved placements can dismantle a root-level group without top-level ungroup", () => {
  const document = new SvgDocument();
  const first = new Rect("first", 0, 0, 1, 1);
  const middle = new Rect("middle", 0, 0, 1, 1);
  const last = new Rect("last", 0, 0, 1, 1);
  document.addShape(first);
  document.addShape(middle);
  document.addShape(last);
  const firstPlacement = document.locateShape("first");
  const lastPlacement = document.locateShape("last");

  document.groupShapes("temporary", ["first", "last"]);
  document.moveShapeTo(lastPlacement);
  document.moveShapeTo(firstPlacement);
  document.deleteShape("temporary");

  assert.deepEqual(ids(document.roots), ["first", "middle", "last"]);
  assert.equal(document.findById("temporary"), undefined);
  assert.equal(document.requireShape("first"), first);
  assert.equal(document.requireShape("last"), last);
});
