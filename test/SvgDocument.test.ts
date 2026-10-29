import assert from "node:assert/strict";
import test from "node:test";

import { SvgDocument } from "../src/domain/SvgDocument.js";
import { Circle } from "../src/domain/shapes/Circle.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Rect } from "../src/domain/shapes/Rect.js";

test("document owns canvas dimensions and ordered root shapes", () => {
  const document = new SvgDocument();
  const first = new Rect("r1", 0, 0, 10, 10);
  const second = new Circle("c1", 20, 20, 5);

  document.addShape(first);
  document.addShape(second);
  document.resize(400.5, 300.25);

  assert.deepEqual([document.width, document.height], [400.5, 300.25]);
  assert.deepEqual(document.roots, [first, second]);
  assert.equal(first.parent, null);
  assert.equal(document.elementCount, 2);
});

test("document indexes nested shapes and attaches new children by container id", () => {
  const nestedRect = new Rect("nested-rect", 0, 0, 10, 10);
  const group = new Group("scene", [nestedRect]);
  const document = new SvgDocument();
  document.addShape(group);

  const circle = new Circle("c1", 20, 20, 5);
  document.addShape(circle, "scene");

  assert.equal(document.findById("scene"), group);
  assert.equal(document.findById("nested-rect"), nestedRect);
  assert.equal(document.requireShape("c1"), circle);
  assert.equal(circle.parent, group);
  assert.equal(circle.document, document);
  assert.equal(nestedRect.document, document);
  assert.deepEqual(group.children, [nestedRect, circle]);
  assert.equal(document.elementCount, 3);
});

test("an attached group keeps the document index synchronized", () => {
  const document = new SvgDocument();
  const group = new Group("scene");
  document.addShape(group);

  const circle = new Circle("c1", 20, 20, 5);
  group.appendChild(circle);

  assert.equal(document.requireShape("c1"), circle);
  assert.equal(circle.document, document);
  assert.equal(circle.parent, group);

  const duplicate = new Rect("c1", 0, 0, 1, 1);
  assert.throws(() => group.appendChild(duplicate), /id already exists: c1/);
  assert.deepEqual(group.children, [circle]);
  assert.equal(duplicate.parent, null);
  assert.equal(duplicate.document, null);
});

test("ids are globally unique and case-sensitive", () => {
  const document = new SvgDocument();
  const lower = new Rect("r1", 0, 0, 10, 10);
  const upper = new Rect("R1", 0, 0, 10, 10);
  document.addShape(lower);
  document.addShape(upper);

  const duplicate = new Circle("r1", 5, 5, 2);
  assert.throws(
    () => document.addShape(duplicate),
    /id already exists: r1/,
  );

  assert.deepEqual(document.roots, [lower, upper]);
  assert.equal(document.elementCount, 2);
  assert.equal(duplicate.parent, null);
});

test("failed parent lookup and duplicate subtree insertion are atomic", () => {
  const document = new SvgDocument();
  const leaf = new Rect("leaf", 0, 0, 10, 10);
  document.addShape(leaf);

  const missingParentChild = new Circle("c1", 0, 0, 1);
  assert.throws(
    () => document.addShape(missingParentChild, "missing"),
    /no such container: missing/,
  );
  assert.throws(
    () => document.addShape(missingParentChild, "leaf"),
    /not a container: leaf/,
  );

  const duplicateSubtree = new Group("group", [
    new Rect("leaf", 1, 1, 2, 2),
  ]);
  assert.throws(
    () => document.addShape(duplicateSubtree),
    /id already exists: leaf/,
  );

  assert.deepEqual(document.roots, [leaf]);
  assert.equal(document.elementCount, 1);
  assert.equal(missingParentChild.parent, null);
  assert.equal(duplicateSubtree.parent, null);
});

test("document rejects invalid dimensions without changing the canvas", () => {
  const document = new SvgDocument(100, 80);

  assert.throws(
    () => document.resize(0, 50),
    /canvas width must be positive/,
  );
  assert.throws(
    () => document.resize(50, Number.NaN),
    /canvas height must be positive/,
  );

  assert.deepEqual([document.width, document.height], [100, 80]);
});

test("requireShape reports missing ids", () => {
  const document = new SvgDocument();

  assert.throws(() => document.requireShape("missing"), /no such shape: missing/);
});

test("membership synchronization cannot bypass document invariants", () => {
  const firstDocument = new SvgDocument();
  const secondDocument = new SvgDocument();
  const rect = new Rect("rect", 0, 0, 1, 1);

  assert.throws(
    () => rect.attachToDocument(firstDocument),
    /cannot attach shape before document insertion: rect/,
  );
  assert.equal(rect.document, null);

  firstDocument.addShape(rect);
  assert.throws(
    () => rect.detachFromDocument(firstDocument),
    /cannot detach shape before document removal: rect/,
  );
  assert.throws(
    () => secondDocument.addShape(rect),
    /shape already belongs to a document: rect/,
  );

  assert.equal(rect.document, firstDocument);
  assert.equal(firstDocument.requireShape("rect"), rect);
  assert.equal(secondDocument.elementCount, 0);
});

