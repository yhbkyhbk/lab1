import assert from "node:assert/strict";
import test from "node:test";
import { CommandDispatcher } from "../src/cli/CommandDispatcher.js";
import { SvgEditor } from "../src/application/SvgEditor.js";
import { SvgReader } from "../src/infrastructure/svg/SvgReader.js";

test("numeric syntax is consistent across create/move/set and failures preserve redo", () => {
  const editor = new SvgEditor();
  const cli = new CommandDispatcher(editor);
  cli.execute("init");
  cli.execute("create rect r 0 0 10 20");
  cli.execute("move r 2 3");
  cli.execute("undo");
  const tree = cli.execute("tree");
  for (const value of ["0x10", "0b10", "0o10", "1_000", "1,5", "1px", "NaN", "Infinity", "-Infinity", "1e999", '""']) {
    for (const command of [
      `create circle bad ${value} 0 1`, `move r ${value} 0`,
      `set r x ${value}`, `set r stroke-width ${value}`,
    ]) {
      assert.match(cli.execute(command), /^error:/, command);
      assert.equal(cli.execute("tree"), tree, command);
      assert.deepEqual([editor.undoCount, editor.redoCount], [1, 1], command);
    }
  }
  assert.equal(cli.execute("redo"), "rect#r moved to (2,3)");
});

test("show includes imported passive presentation attributes without making them editable", () => {
  const editor = new SvgEditor();
  const document = new SvgReader().parse('<svg><text id="t" x="1" y="2" font-size="16" text-anchor="middle">hello</text></svg>').document;
  editor.replaceDocument(document);
  const cli = new CommandDispatcher(editor);
  const output = cli.execute("show t");
  assert.ok(output.includes("font-size=16"), output);
  assert.ok(output.includes("text-anchor=middle"), output);
  assert.equal(cli.execute("set t font-size 20"), "error: unknown attribute: font-size");
});

for (const [type, parameters, geometry] of [
  ["rect", "1 2 3 4", [["x", "-2.5"], ["y", "3e1"], ["width", "0"], ["height", "2.75"]]],
  ["circle", "1 2 3", [["cx", "-2.5"], ["cy", "3e1"], ["r", "0"]]],
  ["ellipse", "1 2 3 4", [["cx", "-2.5"], ["cy", "3e1"], ["rx", "0"], ["ry", "2.75"]]],
  ["line", "1 2 3 4", [["x1", "-2.5"], ["y1", "3e1"], ["x2", "-4"], ["y2", "2.75"]]],
  ["text", '1 2 "initial"', [["x", "-2.5"], ["y", "3e1"], ["text", '"中文 & < > \\\"quoted\\\""']]],
  ["g", "", []],
] as const) {
  test(`${type} accepts only its own geometry and shared styles, with exact undo`, () => {
    const editor = new SvgEditor();
    const cli = new CommandDispatcher(editor);
    cli.execute("init");
    assert.ok(!cli.execute(`create ${type} target ${parameters}`).startsWith("error:"));
    const before = cli.execute("tree");
    for (const [attribute, value] of [...geometry, ["fill", "#abcdef"], ["stroke", "black"], ["stroke-width", "1.25"]]) {
      assert.ok(!cli.execute(`set target ${attribute} ${value}`).startsWith("error:"), `${type}/${attribute}`);
      const after = cli.execute("tree");
      cli.execute("undo");
      assert.equal(cli.execute("tree"), before);
      cli.execute("redo");
      assert.equal(cli.execute("tree"), after);
      cli.execute("undo");
    }
    for (const attribute of ["id", "parent", "transform", "font-size", "bogus"]) {
      assert.equal(cli.execute(`set target ${attribute} invalid`), `error: unknown attribute: ${attribute}`);
      assert.equal(cli.execute("tree"), before);
    }
    const ownGeometry = new Set<string>(geometry.map(([attribute]) => attribute));
    for (const attribute of ["x", "y", "width", "height", "cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2", "text"]) {
      if (!ownGeometry.has(attribute)) {
        assert.equal(cli.execute(`set target ${attribute} invalid`), `error: unknown attribute: ${attribute}`);
      }
    }
  });
}

test("overflowing Composite transformations fail without changing siblings or history", () => {
  const editor = new SvgEditor();
  const cli = new CommandDispatcher(editor);
  cli.execute("init");
  cli.execute("create g g");
  cli.execute("create rect normal 1 2 3 4 in g");
  cli.execute("create rect huge 1e308 0 1 1 in g");
  const before = cli.execute("tree");
  const count = editor.undoCount;
  assert.match(cli.execute("scale g 10"), /^error: .*outside the supported numeric range/);
  assert.equal(cli.execute("tree"), before);
  assert.match(cli.execute("move g 1e308 0"), /^error: .*outside the supported numeric range/);
  assert.equal(cli.execute("tree"), before);
  assert.equal(editor.undoCount, count);
  assert.equal(cli.execute("scale g -0"), "error: scale factor must be positive");
});

test("ids remain case-sensitive through editing, grouping and undo", () => {
  const cli = new CommandDispatcher();
  cli.execute("init");
  cli.execute("create rect r 0 0 10 20");
  cli.execute("create rect R 100 200 30 40");
  cli.execute("move r 2 3");
  assert.ok(cli.execute("show r").includes("x=2 y=3"));
  assert.ok(cli.execute("show R").includes("x=100 y=200"));
  const before = cli.execute("tree");
  cli.execute("group g R r");
  cli.execute("undo");
  assert.equal(cli.execute("tree"), before);
});

test("literal in/hash/quotes inside text never become syntax or comments", () => {
  const cli = new CommandDispatcher();
  cli.execute("init");
  cli.execute("create g in");
  assert.equal(cli.execute('create text title 1 2 "# hello in in" in in'), "text#title created in g#in");
  assert.ok(cli.execute("show title").includes('"# hello in in"'));
  const before = cli.execute("tree");
  assert.equal(cli.execute("# set title text ignored"), "");
  assert.equal(cli.execute("tree"), before);
  assert.equal(cli.execute('set title text "say \\\"hello\\\""'), 'text#title updated: text="say \\\"hello\\\""');
});
