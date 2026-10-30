import assert from "node:assert/strict";
import test from "node:test";

import { AddToCommand } from "../src/application/commands/AddToCommand.js";
import { BringToFrontCommand } from "../src/application/commands/BringToFrontCommand.js";
import { CreateCommand } from "../src/application/commands/CreateCommand.js";
import { DeleteCommand } from "../src/application/commands/DeleteCommand.js";
import { GroupCommand } from "../src/application/commands/GroupCommand.js";
import { MoveCommand } from "../src/application/commands/MoveCommand.js";
import { ScaleCommand } from "../src/application/commands/ScaleCommand.js";
import { SendToBackCommand } from "../src/application/commands/SendToBackCommand.js";
import { SetCommand } from "../src/application/commands/SetCommand.js";
import { UngroupCommand } from "../src/application/commands/UngroupCommand.js";
import { SvgEditor } from "../src/application/SvgEditor.js";
import { Circle } from "../src/domain/shapes/Circle.js";
import { Ellipse } from "../src/domain/shapes/Ellipse.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Line } from "../src/domain/shapes/Line.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import { TextShape } from "../src/domain/shapes/TextShape.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { FailingTreeCommand } from "./support/FailingTreeCommand.js";

function snapshot(document: SvgDocument): object {
  const rows: object[] = [];
  const attributes = [
    "x", "y", "width", "height", "cx", "cy", "r", "rx", "ry",
    "x1", "y1", "x2", "y2", "text", "fill", "stroke", "stroke-width",
  ];
  document.walk((shape) => {
    assert.equal(document.findById(shape.id), shape);
    assert.equal(shape.document, document);
    rows.push({
      id: shape.id,
      parent: shape.parent?.id ?? null,
      attributes: attributes.map((attribute) => shape.getAttribute(attribute)),
    });
  });
  assert.equal(rows.length, document.elementCount);
  return { width: document.width, height: document.height, rows };
}

test("create and delete commands preserve identities and exact sibling order", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const before = snapshot(document);
  const rect = new Rect("r", 1, 2, 3, 4);
  editor.execute(new CreateCommand(document, rect));
  const created = snapshot(document);
  editor.undo();
  assert.deepEqual(snapshot(document), before);
  assert.equal(rect.document, null);
  editor.redo();
  assert.deepEqual(snapshot(document), created);
  assert.equal(document.requireShape("r"), rect);

  editor.execute(new CreateCommand(document, new Circle("c", 1, 2, 3)));
  const beforeDelete = snapshot(document);
  editor.execute(new DeleteCommand(document, "r"));
  editor.undo();
  assert.deepEqual(snapshot(document), beforeDelete);
  assert.equal(document.roots[0], rect);
  editor.redo();
  assert.equal(document.findById("r"), undefined);
  assert.deepEqual(document.roots.map((shape) => shape.id), ["c"]);
});

test("one undo restores a deleted nested group with every descendant", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const rect = new Rect("r", 1, 2, 3, 4);
  const label = new TextShape("t", 1, 2, "中文 & content");
  const nested = new Group("nested", [rect, label]);
  const outer = new Group("outer", [new Circle("c", 0, 0, 1), nested]);
  editor.execute(new CreateCommand(document, outer));
  const before = snapshot(document);

  editor.execute(new DeleteCommand(document, "nested"));
  assert.equal(document.elementCount, 2);
  editor.undo();
  assert.deepEqual(snapshot(document), before);
  assert.equal(document.requireShape("nested"), nested);
  assert.equal(rect.parent, nested);
  assert.equal(label.parent, nested);
  editor.redo();
  assert.equal(document.findById("nested"), undefined);
  assert.equal(rect.document, null);
});

test("move and scale restore exact numbers instead of applying inverse arithmetic", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const rect = new Rect("r", 0.1, -0, 0.2, Number.MIN_VALUE);
  editor.execute(new CreateCommand(document, rect));
  editor.execute(new MoveCommand(document, "r", 1e20, 0));
  editor.undo();
  assert.equal(rect.x, 0.1);
  assert.ok(Object.is(rect.y, -0));
  editor.redo();
  assert.equal(rect.x, 1e20);
  editor.undo();

  editor.execute(new ScaleCommand(document, "r", Number.MIN_VALUE));
  assert.equal(rect.height, 0);
  editor.undo();
  assert.equal(rect.height, Number.MIN_VALUE);
  assert.equal(rect.width, 0.2);
  editor.redo();
  assert.equal(rect.height, 0);
});

test("Composite transform history restores every type of descendant", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const root = new Group("root", [
    new Rect("r", 1.5, 2.5, 3, 4),
    new Circle("c", 5, 6, 7),
    new Group("nested", [
      new Ellipse("e", 1, 2, 3, 4),
      new Line("l", 1, 2, 3, 4),
      new TextShape("t", 5, 6, "text"),
    ]),
  ]);
  editor.execute(new CreateCommand(document, root));
  const initial = snapshot(document);
  editor.execute(new MoveCommand(document, "root", 2.5, -1));
  const moved = snapshot(document);
  editor.execute(new ScaleCommand(document, "root", 0.3));
  const scaled = snapshot(document);
  editor.undo();
  assert.deepEqual(snapshot(document), moved);
  editor.undo();
  assert.deepEqual(snapshot(document), initial);
  editor.redo();
  editor.redo();
  assert.deepEqual(snapshot(document), scaled);
});

test("set undo restores missing styles, geometry and text contents", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const rect = new Rect("r", 1, 2, 3, 4);
  const text = new TextShape("t", 1, 2, "原内容");
  editor.execute(new CreateCommand(document, rect));
  editor.execute(new CreateCommand(document, text));
  const initial = snapshot(document);
  for (const [attribute, value] of [
    ["fill", "red"], ["stroke", "black"], ["stroke-width", "2.5"],
  ] as const) {
    editor.execute(new SetCommand(document, "r", attribute, value));
    editor.undo();
    assert.equal(rect.getAttribute(attribute), undefined);
    editor.redo();
    assert.equal(rect.getAttribute(attribute), value);
    editor.undo();
  }
  editor.execute(new SetCommand(document, "r", "width", "12.5"));
  editor.execute(new SetCommand(document, "t", "text", "新内容 with spaces"));
  editor.undo();
  assert.equal(text.text, "原内容");
  editor.undo();
  assert.deepEqual(snapshot(document), initial);
});

test("root group is one reversible unit even with reversed selection and gaps", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  for (const id of ["a", "b", "c", "d", "e"]) {
    editor.execute(new CreateCommand(document, new Rect(id, 0, 0, 1, 1)));
  }
  const before = snapshot(document);
  const count = editor.undoCount;
  editor.execute(new GroupCommand(document, "g", ["e", "a", "c"]));
  const group = document.requireShape("g");
  const after = snapshot(document);
  assert.equal(editor.undoCount, count + 1);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    editor.undo();
    assert.deepEqual(snapshot(document), before);
    assert.equal(document.findById("g"), undefined);
    editor.redo();
    assert.deepEqual(snapshot(document), after);
    assert.equal(document.requireShape("g"), group);
  }
});

test("cross-parent group undo restores both parents and all original indices", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const left = new Group("left", [
    new Rect("a", 0, 0, 1, 1), new Rect("b", 0, 0, 1, 1),
  ]);
  const right = new Group("right", [
    new Circle("c", 0, 0, 1), new Circle("d", 0, 0, 1),
  ]);
  editor.execute(new CreateCommand(document, left));
  editor.execute(new CreateCommand(document, right));
  const before = snapshot(document);
  editor.execute(new GroupCommand(document, "cross", ["d", "b", "c"]));
  const after = snapshot(document);
  editor.undo();
  assert.deepEqual(snapshot(document), before);
  editor.redo();
  assert.deepEqual(snapshot(document), after);
});

test("ungroup undo restores the original container, styles and promoted children", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const nested = new Group("nested", [
    new Rect("r", 0, 0, 1, 1), new TextShape("t", 1, 2, "node"),
  ]);
  nested.setAttribute("fill", "red");
  editor.execute(new CreateCommand(document, new Group("outer", [
    new Circle("before", 0, 0, 1), nested, new Circle("after", 0, 0, 1),
  ])));
  const before = snapshot(document);
  editor.execute(new UngroupCommand(document, "nested"));
  const after = snapshot(document);
  assert.equal(document.findById("nested"), undefined);
  editor.undo();
  assert.deepEqual(snapshot(document), before);
  assert.equal(document.requireShape("nested"), nested);
  editor.redo();
  assert.deepEqual(snapshot(document), after);
});

test("addto and same-parent reordering restore exact positions", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  editor.execute(new CreateCommand(document, new Rect("root", 0, 0, 1, 1)));
  editor.execute(new CreateCommand(document, new Group("g", [
    new Rect("a", 0, 0, 1, 1), new Rect("b", 0, 0, 1, 1),
  ])));
  const before = snapshot(document);
  editor.execute(new AddToCommand(document, "g", "root"));
  const after = snapshot(document);
  editor.undo();
  assert.deepEqual(snapshot(document), before);
  editor.redo();
  assert.deepEqual(snapshot(document), after);
  editor.execute(new AddToCommand(document, "g", "a"));
  editor.undo();
  assert.deepEqual(snapshot(document), after);
});

test("front/back are reversible on roots and nested siblings", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  editor.execute(new CreateCommand(document, new Rect("root", 0, 0, 1, 1)));
  editor.execute(new CreateCommand(document, new Group("g", [
    new Rect("a", 0, 0, 1, 1), new Rect("b", 0, 0, 1, 1),
    new Rect("c", 0, 0, 1, 1),
  ])));
  for (const command of [
    new BringToFrontCommand(document, "root"),
    new SendToBackCommand(document, "g"),
    new BringToFrontCommand(document, "b"),
    new SendToBackCommand(document, "b"),
  ]) {
    const before = snapshot(document);
    editor.execute(command);
    const after = snapshot(document);
    editor.undo();
    assert.deepEqual(snapshot(document), before);
    editor.redo();
    assert.deepEqual(snapshot(document), after);
    editor.undo();
  }
});

test("new edit clears redo but failed edits preserve document and both stacks", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  editor.execute(new CreateCommand(document, new Rect("r", 0, 0, 1, 1)));
  editor.execute(new MoveCommand(document, "r", 1, 2));
  editor.undo();
  const before = snapshot(document);
  const counts = [editor.undoCount, editor.redoCount];
  for (const command of [
    new ScaleCommand(document, "r", 0),
    new SetCommand(document, "r", "invalid", "value"),
    new CreateCommand(document, new Rect("r", 0, 0, 1, 1)),
    new GroupCommand(document, "g", ["r", "missing"]),
    new DeleteCommand(document, "missing"),
  ]) {
    assert.throws(() => editor.execute(command));
    assert.deepEqual(snapshot(document), before);
    assert.deepEqual([editor.undoCount, editor.redoCount], counts);
  }
  editor.execute(new SetCommand(document, "r", "fill", "red"));
  assert.equal(editor.redoCount, 0);
  assert.throws(() => editor.redo(), /nothing to redo/);
});

test("IO boundaries block both histories until a successful edit", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  assert.throws(() => editor.undo(), /undo not allowed after io command/);
  assert.throws(() => editor.redo(), /undo not allowed after io command/);
  assert.throws(() => editor.execute(new DeleteCommand(document, "missing")));
  assert.throws(() => editor.undo(), /undo not allowed after io command/);

  editor.execute(new CreateCommand(document, new Rect("r", 0, 0, 1, 1)));
  editor.execute(new MoveCommand(document, "r", 1, 2));
  editor.markIoBoundary();
  assert.deepEqual([editor.undoCount, editor.redoCount], [0, 0]);
  assert.throws(() => editor.undo(), /undo not allowed after io command/);
  editor.execute(new MoveCommand(document, "r", 5, 5));
  editor.undo();
  assert.equal(document.requireShape("r").getAttribute("x"), "1");
  assert.throws(() => editor.undo(), /nothing to undo/);
});

test("document/canvas queries and failed init/resize leave history intact", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  editor.execute(new CreateCommand(document, new Rect("r", 0, 0, 1, 1)));
  assert.equal(editor.document.width, 800);
  document.requireShape("r");
  assert.equal(editor.undoCount, 1);
  assert.throws(() => editor.init(-1, 2));
  assert.throws(() => editor.resizeCanvas(400, 0));
  assert.equal(editor.document, document);
  assert.equal(editor.undoCount, 1);
  editor.resizeCanvas(400, 300);
  assert.throws(() => editor.undo(), /undo not allowed after io command/);
  assert.deepEqual([document.width, document.height], [400, 300]);
});

test("document replacement clears history and rejects stale-document commands", () => {
  const editor = new SvgEditor();
  const oldDocument = editor.init();
  editor.execute(new CreateCommand(oldDocument, new Rect("r", 0, 0, 1, 1)));
  editor.undo();
  const replacement = new SvgDocument(100, 200);
  editor.replaceDocument(replacement);
  assert.deepEqual([editor.undoCount, editor.redoCount], [0, 0]);
  assert.throws(() => editor.redo(), /undo not allowed after io command/);
  assert.throws(
    () => editor.execute(new CreateCommand(oldDocument, new Rect("x", 0, 0, 1, 1))),
    /command belongs to a different document/,
  );
  assert.equal(replacement.elementCount, 0);
});

test("no-document and command lifecycle errors cannot mutate history", () => {
  const editor = new SvgEditor();
  assert.throws(() => editor.undo(), /no document\. use 'init' or 'read' first/);
  assert.throws(() => editor.redo(), /no document/);
  const document = editor.init();
  const command = new CreateCommand(document, new Rect("r", 0, 0, 1, 1));
  assert.throws(() => command.undo(), /cannot be undone/);
  editor.execute(command);
  assert.throws(() => editor.execute(command), /already been executed/);
  assert.equal(editor.undoCount, 1);
  editor.undo();
  assert.throws(() => command.undo(), /cannot be undone/);
  editor.redo();
  assert.throws(() => command.redo(), /cannot be redone/);
});

test("a failed undo preserves stacks and does not partially restore the tree", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const rect = new Rect("r", 0, 0, 1, 1);
  editor.execute(new CreateCommand(document, rect));
  editor.execute(new DeleteCommand(document, "r"));
  const foreign = new SvgDocument();
  foreign.addShape(rect);

  assert.throws(() => editor.undo(), /different document/);
  assert.deepEqual([editor.undoCount, editor.redoCount], [2, 0]);
  assert.equal(document.elementCount, 0);
  assert.equal(foreign.requireShape("r"), rect);
  foreign.deleteShape("r");
  editor.undo();
  assert.equal(document.requireShape("r"), rect);
});

test("an exception after partial mutation rolls back tree and preserves redo", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const rect = new Rect("r", 0, 0, 1, 1);
  editor.execute(new CreateCommand(document, rect));
  editor.execute(new MoveCommand(document, "r", 1, 2));
  editor.undo();
  const before = snapshot(document);

  assert.throws(
    () => editor.execute(new FailingTreeCommand(document)),
    /injected failure after tree mutation/,
  );
  assert.deepEqual(snapshot(document), before);
  assert.equal(document.requireShape("r"), rect);
  assert.deepEqual([editor.undoCount, editor.redoCount], [1, 1]);
  assert.equal(document.findById("partial"), undefined);
  assert.equal(document.findById("partial-group"), undefined);
  editor.redo();
  assert.deepEqual([rect.x, rect.y], [1, 2]);
});

test("failed redo preserves the redo entry until ownership conflict is resolved", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const rect = new Rect("r", 0, 0, 1, 1);
  editor.execute(new CreateCommand(document, rect));
  editor.undo();
  const foreign = new SvgDocument();
  foreign.addShape(rect);
  assert.throws(() => editor.redo(), /different document/);
  assert.deepEqual([editor.undoCount, editor.redoCount], [0, 1]);
  assert.equal(document.elementCount, 0);
  foreign.deleteShape("r");
  editor.redo();
  assert.equal(document.requireShape("r"), rect);
});

test("empty ungroup and stable no-op edits still form single history units", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const empty = new Group("empty");
  editor.execute(new CreateCommand(document, new Group("outer", [empty])));
  const before = snapshot(document);
  editor.execute(new UngroupCommand(document, "empty"));
  assert.equal(document.elementCount, 1);
  editor.undo();
  assert.deepEqual(snapshot(document), before);
  editor.redo();
  assert.equal(document.elementCount, 1);

  const previousCount = editor.undoCount;
  editor.execute(new BringToFrontCommand(document, "outer"));
  assert.equal(editor.undoCount, previousCount + 1);
  editor.undo();
  assert.equal(document.requireShape("outer").id, "outer");
});

test("mixed edit sequence can undo to empty then redo the exact final document", () => {
  const editor = new SvgEditor();
  const document = editor.init();
  const initial = snapshot(document);
  const commands = [
    new CreateCommand(document, new Group("flow")),
    new CreateCommand(document, new Group("node"), "flow"),
    new CreateCommand(document, new Rect("r", 0.1, 20, 100, 50), "node"),
    new CreateCommand(document, new TextShape("t", 10, 30, "开始"), "node"),
    new CreateCommand(document, new Circle("c", 200, 20, 10), "flow"),
    new SetCommand(document, "r", "fill", "red"),
    new GroupCommand(document, "combined", ["c", "node"]),
    new MoveCommand(document, "combined", 10, 5),
    new ScaleCommand(document, "combined", 0.3),
    new UngroupCommand(document, "combined"),
    new AddToCommand(document, "node", "c"),
    new BringToFrontCommand(document, "r"),
    new SendToBackCommand(document, "t"),
    new SetCommand(document, "t", "text", "处理数据"),
    new DeleteCommand(document, "node"),
  ];
  const states = [initial];
  for (const command of commands) {
    editor.execute(command);
    states.push(snapshot(document));
  }
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    editor.undo();
    assert.deepEqual(snapshot(document), states[index]);
  }
  assert.deepEqual(snapshot(document), initial);
  for (let index = 0; index < commands.length; index += 1) {
    editor.redo();
    assert.deepEqual(snapshot(document), states[index + 1]);
  }
});
