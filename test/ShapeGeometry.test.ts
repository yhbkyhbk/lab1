import assert from "node:assert/strict";
import test from "node:test";

import { Circle } from "../src/domain/shapes/Circle.js";
import { Ellipse } from "../src/domain/shapes/Ellipse.js";
import { Line } from "../src/domain/shapes/Line.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import { TextShape } from "../src/domain/shapes/TextShape.js";

test("rect moves and scales every geometric attribute", () => {
  const rect = new Rect("r1", 10, 20, 100, 50);

  rect.move(2.5, -5);
  rect.scale(0.5);

  assert.deepEqual(
    [rect.x, rect.y, rect.width, rect.height],
    [6.25, 7.5, 50, 25],
  );
  assert.equal(rect.fill, undefined);
});

test("circle and ellipse move and scale centers and radii", () => {
  const circle = new Circle("c1", 100, 80, 20, "red");
  const ellipse = new Ellipse("e1", -10, 30, 8, 4);

  circle.move(5, -10);
  circle.scale(2);
  ellipse.move(10, 2.5);
  ellipse.scale(0.5);

  assert.deepEqual(
    [circle.cx, circle.cy, circle.radius, circle.fill],
    [210, 140, 40, "red"],
  );
  assert.deepEqual(
    [ellipse.cx, ellipse.cy, ellipse.radiusX, ellipse.radiusY],
    [0, 16.25, 4, 2],
  );
});

test("line transforms both endpoints", () => {
  const line = new Line("edge", 10, 20, 30, 40, "black");

  line.move(-5, 10);
  line.scale(1.5);

  assert.deepEqual(
    [line.x1, line.y1, line.x2, line.y2, line.stroke],
    [7.5, 45, 37.5, 75, "black"],
  );
});

test("text transforms its position and preserves editable content", () => {
  const text = new TextShape("title", 20, 40, "初始文本");

  text.move(5, -10);
  text.scale(2);
  text.setAttribute("text", "My Diagram & 处理数据");

  assert.deepEqual(
    [text.x, text.y, text.text],
    [50, 60, "My Diagram & 处理数据"],
  );
});

test("set accepts common styles and only the shape-specific whitelist", () => {
  const rect = new Rect("r1", 0, 0, 10, 20);

  rect.setAttribute("fill", "#ffffff");
  rect.setAttribute("stroke", "black");
  rect.setAttribute("stroke-width", "2.5");
  rect.setAttribute("x", "-3.5");

  assert.equal(rect.getAttribute("fill"), "#ffffff");
  assert.equal(rect.getAttribute("stroke"), "black");
  assert.equal(rect.getAttribute("stroke-width"), "2.5");
  assert.equal(rect.x, -3.5);

  assert.throws(
    () => rect.setAttribute("cx", "10"),
    /unknown attribute: cx/,
  );
  assert.equal(rect.x, -3.5);
});

test("invalid numeric updates and scale factors leave shape state unchanged", () => {
  const rect = new Rect("r1", 10, 20, 30, 40);
  const initial = [rect.x, rect.y, rect.width, rect.height];

  assert.throws(
    () => rect.setAttribute("width", "-1"),
    /width must not be negative/,
  );
  assert.throws(
    () => rect.setAttribute("x", "not-a-number"),
    /invalid number for x/,
  );
  for (const factor of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => rect.scale(factor), /scale factor must be positive/);
  }

  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], initial);
});

