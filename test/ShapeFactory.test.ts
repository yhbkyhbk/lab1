import assert from "node:assert/strict";
import test from "node:test";
import { ShapeFactory } from "../src/domain/ShapeFactory.js";

test("factory creates exactly six built-in types with optional styles omitted", () => {
  const factory = new ShapeFactory();
  for (const [type, parameters] of [
    ["rect", ["1", "2", "3", "4"]],
    ["circle", ["1", "2", "3"]],
    ["ellipse", ["1", "2", "3", "4"]],
    ["line", ["1", "2", "3", "4"]],
    ["text", ["1", "2", "中文 text"]],
    ["g", []],
  ] as const) {
    const shape = factory.create(type, `${type}-1`, parameters);
    assert.equal(shape.typeName, type);
    assert.equal(shape.fill, undefined);
    assert.equal(shape.stroke, undefined);
  }
  assert.equal(factory.create("rect", "r", ["0", "0", "1", "1", "#fff"]).fill, "#fff");
  assert.equal(factory.create("line", "l", ["0", "0", "1", "1", "black"]).stroke, "black");
});

test("factory validates numeric input, arity, ids and unsupported box", () => {
  const factory = new ShapeFactory();
  assert.equal(factory.create("circle", "c", ["-.5", "+2.5e1", "3"]).getAttribute("cy"), "25");
  for (const value of ["NaN", "Infinity", "0x10", "", "1e999"]) {
    assert.throws(() => factory.create("circle", "c", [value, "0", "1"]), /invalid number/);
  }
  assert.throws(() => factory.create("rect", "r", ["1", "2"]), /shape parameters/);
  assert.throws(() => factory.create("g", "g", ["extra"]), /shape parameters/);
  assert.throws(() => factory.create("g", "bad id", []), /whitespace/);
  assert.throws(() => factory.create("box", "box", []),
    /unknown shape type: box \(is the plugin loaded\?\)/);
});
