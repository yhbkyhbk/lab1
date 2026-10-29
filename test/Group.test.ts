import assert from "node:assert/strict";
import test from "node:test";

import { Circle } from "../src/domain/shapes/Circle.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Line } from "../src/domain/shapes/Line.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import { TextShape } from "../src/domain/shapes/TextShape.js";

test("group recursively moves and scales nested descendants", () => {
  const rect = new Rect("rect", 10, 20, 30, 40);
  const circle = new Circle("circle", 100, 80, 20);
  const label = new TextShape("label", 5, 10, "节点");
  const inner = new Group("inner", [circle, label]);
  const outer = new Group("outer", [rect, inner]);

  outer.move(10, -5);
  outer.scale(2);

  assert.deepEqual(
    [rect.x, rect.y, rect.width, rect.height],
    [40, 30, 60, 80],
  );
  assert.deepEqual(
    [circle.cx, circle.cy, circle.radius],
    [220, 150, 40],
  );
  assert.deepEqual([label.x, label.y], [30, 10]);
  assert.equal(rect.parent, outer);
  assert.equal(inner.parent, outer);
  assert.equal(circle.parent, inner);
});

test("group styles stay on the group instead of overwriting children", () => {
  const rect = new Rect("rect", 0, 0, 10, 10, "red");
  const group = new Group("group", [rect]);

  group.setAttribute("fill", "blue");
  group.setAttribute("stroke-width", "3");

  assert.equal(group.fill, "blue");
  assert.equal(group.strokeWidth, 3);
  assert.equal(rect.fill, "red");
});

test("group traversal is stable depth-first order", () => {
  const group = new Group("root", [
    new Rect("r1", 0, 0, 1, 1),
    new Group("nested", [
      new Line("l1", 0, 0, 1, 1),
      new TextShape("t1", 0, 0, "text"),
    ]),
  ]);
  const ids: string[] = [];

  group.walk((shape) => ids.push(shape.id));

  assert.deepEqual(ids, ["root", "r1", "nested", "l1", "t1"]);
});

test("composite validation prevents partially applied transforms", () => {
  const first = new Rect("first", 1, 2, 3, 4);
  const overflowing = new Rect("huge", Number.MAX_VALUE, 0, 1, 1);
  const group = new Group("group", [first, overflowing]);

  assert.throws(() => group.scale(2), /outside the supported numeric range/);

  assert.deepEqual(
    [first.x, first.y, first.width, first.height],
    [1, 2, 3, 4],
  );
  assert.equal(overflowing.x, Number.MAX_VALUE);
});

test("group rejects duplicate ids and ancestor cycles atomically", () => {
  const first = new Rect("same", 0, 0, 1, 1);
  const duplicate = new Circle("same", 0, 0, 1);

  assert.throws(
    () => new Group("group", [first, duplicate]),
    /id already exists: same/,
  );
  assert.equal(first.parent, null);
  assert.equal(duplicate.parent, null);

  const parent = new Group("parent");
  const child = new Group("child");
  parent.appendChild(child);
  assert.throws(
    () => child.appendChild(parent),
    /cannot add a container into its own descendant: parent/,
  );
  assert.equal(parent.parent, null);
  assert.equal(child.parent, parent);
  assert.deepEqual(child.children, []);
});

test("empty groups accept composite operations", () => {
  const group = new Group("empty");

  group.move(10.5, -2);
  group.scale(0.5);

  assert.deepEqual(group.children, []);
});

test("membership synchronization methods cannot bypass the group aggregate", () => {
  const group = new Group("group");
  const rect = new Rect("rect", 0, 0, 1, 1);

  assert.throws(
    () => rect.attachTo(group),
    /cannot attach shape before container insertion: rect/,
  );
  assert.equal(rect.parent, null);
  assert.deepEqual(group.children, []);

  group.appendChild(rect);
  assert.throws(
    () => rect.detachFrom(group),
    /cannot detach shape before container removal: rect/,
  );
  assert.equal(rect.parent, group);
  assert.deepEqual(group.children, [rect]);
});

