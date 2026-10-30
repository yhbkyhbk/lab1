import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TreeFormatter } from "../src/cli/TreeFormatter.js";
import { Circle } from "../src/domain/shapes/Circle.js";
import { Ellipse } from "../src/domain/shapes/Ellipse.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Line } from "../src/domain/shapes/Line.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import { TextShape } from "../src/domain/shapes/TextShape.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { SvgReader } from "../src/infrastructure/svg/SvgReader.js";
import { SvgWriter } from "../src/infrastructure/svg/SvgWriter.js";

test("reader imports the exact assignment fixture and emits a missing-id warning", () => {
  const xml = readFileSync(new URL("../../fixtures/other.svg", import.meta.url), "utf8");
  const result = new SvgReader().parse(xml);
  assert.deepEqual(result.warnings, ["warning: assigned id rect1 to unnamed <rect>"]);
  assert.equal(result.document.elementCount, 7);
  assert.equal(result.document.requireShape("r2").parent?.id, "g1");
  assert.equal(result.document.viewBox.toString(), "0 0 400 300");
  assert.equal(result.document.requireShape("t1").getAttribute("text"), "imported");
});

test("missing ids avoid explicit ids anywhere in the file and stay deterministic", () => {
  const xml = '<svg><rect/><g><rect/><circle/><g/></g><rect id="rect1"/><g id="g1"/></svg>';
  const result = new SvgReader().parse(xml);
  assert.deepEqual(result.warnings, [
    "warning: assigned id rect2 to unnamed <rect>",
    "warning: assigned id g2 to unnamed <g>",
    "warning: assigned id rect3 to unnamed <rect>",
    "warning: assigned id circle1 to unnamed <circle>",
    "warning: assigned id g3 to unnamed <g>",
  ]);
  const seen: string[] = [];
  result.document.walk((shape) => seen.push(shape.id));
  assert.deepEqual(seen, ["rect2", "g2", "rect3", "circle1", "g3", "rect1", "g1"]);
  assert.deepEqual(new SvgReader().parse(xml).warnings, result.warnings);
});

test("reader rejects duplicate ids but treats id case as significant", () => {
  const reader = new SvgReader();
  assert.throws(() => reader.parse('<svg><rect id="r"/><g><circle id="r"/></g></svg>'), /id already exists: r/);
  const result = reader.parse('<svg><rect id="r"/><circle id="R"/></svg>');
  assert.equal(result.document.elementCount, 2);
  assert.deepEqual(result.warnings, []);
});

test("read-write-read preserves all types, nested order, floats and optional styles", () => {
  const document = new SvgDocument(400.5, 300.25);
  const rect = new Rect("r", -0.5, 2.25, 10.5, 20);
  const text = new TextShape("t", 10, 20, '开始 & <完成> "quoted" 😀');
  const group = new Group("g", [rect, new Group("nested", [text, new Circle("c", 1, 2, 3, "red")])]);
  group.setAttribute("fill", "blue");
  rect.setAttribute("stroke", "black");
  rect.setAttribute("stroke-width", "1.25");
  document.addShape(group);
  document.addShape(new Ellipse("e", 5, 6, 7, 8));
  document.addShape(new Line("l", 1, 2, 3, 4, "black"));
  const writer = new SvgWriter();
  const xml = writer.serialize(document);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(xml.includes("&amp; &lt;完成&gt;"));
  const result = new SvgReader().parse(xml);
  assert.deepEqual(result.warnings, []);
  assert.equal(new TreeFormatter().format(result.document), new TreeFormatter().format(document));
  assert.equal(result.document.requireShape("t").getAttribute("text"), text.text);
  assert.equal(result.document.requireShape("r").fill, undefined);
  assert.equal(writer.serialize(result.document), xml);
});

test("XML escaping preserves text, attribute entities and significant whitespace", () => {
  const document = new SvgDocument();
  const text = new TextShape('t&"<>', 0, 0, '  & < > " \' \t\n\r中文  ');
  text.setAttribute("fill", 'a&b"< >\t\n\r');
  document.addShape(text);
  const xml = new SvgWriter().serialize(document);
  const restored = new SvgReader().parse(xml).document.requireShape(text.id);
  assert.equal(restored.getAttribute("text"), text.text);
  assert.equal(restored.fill, text.fill);
});

test("reader accepts CDATA and numeric entities as child text", () => {
  const result = new SvgReader().parse('<svg><text id="t" x="1" y="2"><![CDATA[<开始>]]>&amp;&#x4E2D;&#13;</text></svg>');
  assert.equal(result.document.requireShape("t").getAttribute("text"), "<开始>&中\r");
});

test("viewBox and root/element presentation metadata survive round trips", () => {
  const xml = '<svg xmlns="http://www.w3.org/2000/svg" width="400px" height="300px" viewBox="-10 -20 200 150" fill="red" opacity="0.5"><text id="t" x="1px" y="2" font-size="16" text-anchor="middle" xml:space="preserve">  hello  </text></svg>';
  const reader = new SvgReader();
  const document = reader.parse(xml).document;
  assert.equal(document.width, 400);
  assert.equal(document.viewBox.toString(), "-10 -20 200 150");
  const saved = new SvgWriter().serialize(document);
  const roundTrip = reader.parse(saved).document;
  assert.equal(roundTrip.viewBox.toString(), document.viewBox.toString());
  assert.deepEqual(roundTrip.extraSvgAttributes, document.extraSvgAttributes);
  assert.deepEqual(roundTrip.requireShape("t").extraSvgAttributes, document.requireShape("t").extraSvgAttributes);
  assert.equal(roundTrip.requireShape("t").getAttribute("text"), "  hello  ");
  document.resize(800, 600);
  assert.equal(document.viewBox.toString(), "0 0 800 600");
});

test("reader accepts namespace prefixes and derives canvas dimensions from viewBox", () => {
  const result = new SvgReader().parse('<s:svg xmlns:s="http://www.w3.org/2000/svg" viewBox="0,0,100,200"><s:rect id="r" width="10" height="20"/></s:svg>');
  assert.deepEqual([result.document.width, result.document.height], [100, 200]);
  assert.equal(result.document.requireShape("r").typeName, "rect");
});

test("writer omits unspecified styles and preserves empty containers and empty text", () => {
  const document = new SvgDocument();
  document.addShape(new Group("g"));
  document.addShape(new TextShape("t", 0, 0, ""));
  const xml = new SvgWriter().serialize(document);
  assert.ok(!xml.includes("fill="));
  assert.ok(!xml.includes("stroke="));
  assert.ok(!xml.includes("stroke-width="));
  const result = new SvgReader().parse(xml);
  assert.equal(result.document.elementCount, 2);
  assert.equal(result.document.requireShape("t").getAttribute("text"), "");
});

test("unsupported SVG features are rejected rather than silently discarded", () => {
  const reader = new SvgReader();
  for (const xml of [
    '<svg><path id="p" d="M0 0"/></svg>',
    '<svg><g transform="translate(1,2)"/></svg>',
    '<svg><rect bogus="value"/></svg>',
    '<svg><text><tspan>text</tspan></text></svg>',
    '<svg><text text="wrong"/></svg>',
    '<svg><rect>loose text</rect></svg>',
    '<svg><g>loose text</g></svg>',
    '<svg xmlns="urn:wrong"/>',
    '<svg width="100%"/>',
  ]) assert.throws(() => reader.parse(xml), /.+/, xml);
});

test("invalid XML, numeric values and XML-only declarations are rejected", () => {
  const reader = new SvgReader();
  for (const xml of [
    "", "<svg><rect></svg>", '<svg><rect width="NaN"/></svg>',
    '<svg><circle r="-1"/></svg>', '<svg width="0"/>',
    '<svg viewBox="0 0 100"/>', '<svg viewBox="0 0 -1 10"/>',
    '<svg><rect id="bad id"/></svg>', '<svg><text>&unknown;</text></svg>',
    '<!DOCTYPE svg [<!ENTITY test "expanded">]><svg/>',
    '<?xml-stylesheet href="external.css"?><svg/>',
  ]) assert.throws(() => reader.parse(xml), /.+/, xml);
});

test("writer rejects characters that XML 1.0 cannot represent", () => {
  const document = new SvgDocument();
  document.addShape(new TextShape("t", 0, 0, "invalid\u0000text"));
  assert.throws(() => new SvgWriter().serialize(document), /cannot serialize SVG/);
});
