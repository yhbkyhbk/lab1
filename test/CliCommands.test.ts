import assert from "node:assert/strict";
import test from "node:test";
import { SvgEditor } from "../src/application/SvgEditor.js";
import { CommandDispatcher } from "../src/cli/CommandDispatcher.js";

test("CLI shows help before init and reports no-document errors", () => {
  const cli = new CommandDispatcher();
  const help = cli.execute("help");
  for (const command of ["init", "read", "save", "canvas", "create", "delete", "move",
    "scale", "set", "group", "ungroup", "addto", "front", "back", "tree", "show", "undo", "redo"]) {
    assert.ok(help.includes(command));
  }
  assert.equal(cli.execute("tree"), "error: no document. use 'init' or 'read' first");
  assert.equal(cli.execute("undo"), "error: no document. use 'init' or 'read' first");
  assert.equal(cli.execute("save"), "error: no document. use 'init' or 'read' first");
  assert.equal(cli.execute("bogus"), "error: unknown command: bogus");
  assert.equal(cli.execute(" # comment"), "");
});

test("CLI creates all six types including nested groups with in suffix", () => {
  const editor = new SvgEditor();
  const cli = new CommandDispatcher(editor);
  assert.equal(cli.execute("init"), "canvas 800x600 created");
  assert.equal(cli.execute("create g scene"), "g#scene created");
  assert.equal(cli.execute("create g node in scene"), "g#node created in g#scene");
  assert.equal(cli.execute("create rect r 10 20 30 40 #fff in node"), "rect#r created in g#node");
  assert.equal(cli.execute("create circle c 50 60 10 red in scene"), "circle#c created in g#scene");
  assert.equal(cli.execute("create ellipse e 1 2 3 4"), "ellipse#e created");
  assert.equal(cli.execute("create line l 10 20 30 40 black"), "line#l created");
  assert.equal(cli.execute('create text t 20 40 "hello in 中文" in node'), "text#t created in g#node");
  assert.equal(editor.document.elementCount, 7);
  assert.equal(editor.document.requireShape("t").getAttribute("text"), "hello in 中文");
  assert.equal(cli.execute("create box b"), "error: unknown shape type: box (is the plugin loaded?)");
});

test("tree and show produce stable hierarchy, geometry, styles and parent details", () => {
  const cli = new CommandDispatcher();
  cli.execute("init 400 300");
  cli.execute("create g markers");
  cli.execute("create circle c1 100 100 20 red in markers");
  cli.execute('create text title 20 40 "My Diagram"');
  cli.execute("create rect r1 0 0 10 20");
  cli.execute("create ellipse e1 1 2 3 4");
  cli.execute("create line l1 10 20 30 40 black");
  assert.equal(cli.execute("tree"), [
    "svg (400x300)",
    "├── g#markers",
    "│   └── circle#c1 cx=100 cy=100 r=20 fill=red",
    '├── text#title (20,40) "My Diagram"',
    "├── rect#r1 x=0 y=0 w=10 h=20",
    "├── ellipse#e1 cx=1 cy=2 rx=3 ry=4",
    "└── line#l1 (10,20) -> (30,40) stroke=black",
  ].join("\n"));
  assert.equal(cli.execute("tree markers"), "g#markers\n└── circle#c1 cx=100 cy=100 r=20 fill=red");
  assert.equal(cli.execute("show c1"), "circle#c1  parent=g#markers\n  cx=100 cy=100 r=20\n  fill=red");
  assert.equal(cli.execute("show title"), 'text#title  parent=svg\n  (20,40) "My Diagram"');
});

test("move/set/scale feedback and undo/redo match visible state", () => {
  const cli = new CommandDispatcher();
  cli.execute("init");
  cli.execute("create circle c1 100 100 20 red");
  assert.equal(cli.execute("move c1 30 0"), "circle#c1 moved to (130,100)");
  assert.equal(cli.execute("undo"), "circle#c1 moved back to (100,100)");
  assert.equal(cli.execute("redo"), "circle#c1 moved to (130,100)");
  assert.equal(cli.execute("scale c1 2"), "circle#c1 scaled by 2");
  assert.ok(cli.execute("show c1").includes("cx=260 cy=200 r=40"));
  cli.execute("undo");
  assert.ok(cli.execute("show c1").includes("cx=130 cy=100 r=20"));
  cli.execute('create text title 20 40 "My Diagram"');
  assert.equal(cli.execute('set title text "My Diagram v2"'), 'text#title updated: text="My Diagram v2"');
  assert.equal(cli.execute("undo"), 'text#title updated: text="My Diagram"');
  assert.equal(cli.execute('set title text ""'), 'text#title updated: text=""');
  cli.execute("undo");
  assert.ok(cli.execute("show title").includes('"My Diagram"'));
});

test("CLI tree editing supports group, nested ungroup, addto, z-order and delete undo", () => {
  const cli = new CommandDispatcher();
  cli.execute("init");
  cli.execute("create g root");
  cli.execute("create rect a 0 0 1 1 in root");
  cli.execute("create rect b 2 2 1 1 in root");
  const initial = cli.execute("tree");
  assert.equal(cli.execute("group node b a"), "g#node created with 2 children");
  assert.equal(cli.execute("move node 1 2"), "g#node moved by (1,2)");
  assert.equal(cli.execute("undo"), "g#node moved back by (-1,-2)");
  assert.equal(cli.execute("ungroup node"), "g#node ungrouped");
  assert.equal(cli.execute("tree"), initial);
  cli.execute("undo");
  assert.ok(cli.execute("tree").includes("g#node"));
  cli.execute("create g other in root");
  assert.equal(cli.execute("addto other a"), "rect#a moved into g#other");
  assert.ok(cli.execute("show a").includes("parent=g#other"));
  cli.execute("undo");
  assert.ok(cli.execute("show a").includes("parent=g#node"));
  cli.execute("front a");
  assert.ok(cli.execute("tree node").endsWith("rect#a x=0 y=0 w=1 h=1"));
  cli.execute("back a");
  assert.ok(cli.execute("tree node").includes("├── rect#a"));
  assert.equal(cli.execute("delete a"), "rect#a deleted");
  assert.equal(cli.execute("undo"), "rect#a restored into g#node");
});

test("malformed CLI commands preserve tree, indexes and history", () => {
  const editor = new SvgEditor();
  const cli = new CommandDispatcher(editor);
  cli.execute("init");
  cli.execute("create g root");
  cli.execute("create rect r 0 0 1 1 in root");
  cli.execute("move r 1 2");
  cli.execute("undo");
  const tree = cli.execute("tree");
  const counts = [editor.undoCount, editor.redoCount];
  const rect = editor.document.requireShape("r");
  for (const command of [
    "create rect r 0 0 1 1", "create rect bad NaN 0 1 1", "create g x in missing",
    "create g x in r", "create g x extra", 'create g "bad id"',
    "move r 2", "move r 1 2 extra", "scale r 0", "scale r Infinity", "set r bogus value",
    "group x r root", "group x r r", 'group "bad id" r', "ungroup root", "addto root root",
    "delete missing", "front missing", "back missing", "canvas 300", "canvas -1 300",
    'set r fill "unterminated', "undo extra", "redo extra", "help extra", "tree r extra", "show r extra",
  ]) {
    const result = cli.execute(command);
    assert.ok(result.startsWith("error:"), `${command}: ${result}`);
    assert.equal(result.split("\n").length, 1);
    assert.equal(cli.execute("tree"), tree, command);
    assert.deepEqual([editor.undoCount, editor.redoCount], counts, command);
    assert.equal(editor.document.requireShape("r"), rect);
  }
  assert.equal(cli.execute("redo"), "rect#r moved to (1,2)");
});

test("display commands do not block history; canvas modification does", () => {
  const cli = new CommandDispatcher();
  cli.execute("init");
  cli.execute("create rect r 0 0 1 1");
  cli.execute("tree");
  cli.execute("show r");
  cli.execute("help");
  assert.equal(cli.execute("canvas"), "canvas 800x600");
  assert.equal(cli.execute("undo"), "rect#r creation undone");
  cli.execute("redo");
  assert.equal(cli.execute("canvas 400 300"), "canvas 400x300");
  assert.equal(cli.execute("undo"), "error: undo not allowed after io command");
  assert.equal(cli.execute("redo"), "error: undo not allowed after io command");
  cli.execute("move r 1 2");
  assert.equal(cli.execute("undo"), "rect#r moved back to (0,0)");
});

test("an editor without a storage adapter fails IO without altering history", () => {
  const cli = new CommandDispatcher();
  cli.execute("init");
  cli.execute("create g g");
  assert.equal(cli.execute("save demo.svg"), "error: SVG storage is not configured");
  assert.equal(cli.execute("read demo.svg"), "error: SVG storage is not configured");
  assert.equal(cli.execute("undo"), "g#g creation undone");
});
