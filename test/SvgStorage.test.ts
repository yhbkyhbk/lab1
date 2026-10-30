import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { SvgEditor } from "../src/application/SvgEditor.js";
import { CommandDispatcher } from "../src/cli/CommandDispatcher.js";
import { TreeFormatter } from "../src/cli/TreeFormatter.js";
import { SvgFileStorage } from "../src/infrastructure/svg/SvgFileStorage.js";
import { TemporaryWorkspace } from "./support/TemporaryWorkspace.js";

test("file storage saves and reads actual SVG with Unicode/spaces in the path", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const editor = new SvgEditor(new SvgFileStorage());
  const cli = new CommandDispatcher(editor);
  const path = temporary.path("中文 diagram.svg");
  cli.execute("init 400 300");
  cli.execute("create g node");
  cli.execute("create rect r 10.5 20 100 50 #fff in node");
  cli.execute('create text t 20 40 "开始 & <结束>" in node');
  const before = cli.execute("tree");
  assert.equal(cli.execute(`save ${JSON.stringify(path)}`), `saved to ${path} (3 elements)`);
  assert.equal(editor.filePath, path);
  assert.ok(temporary.read("中文 diagram.svg").includes("&amp; &lt;结束&gt;"));
  assert.deepEqual(temporary.files(), ["中文 diagram.svg"]);
  assert.equal(cli.execute("undo"), "error: undo not allowed after io command");
  cli.execute("init 100 100");
  assert.equal(cli.execute(`read ${JSON.stringify(path)}`), `read ${path} (3 elements)`);
  assert.equal(cli.execute("tree"), before);
  assert.equal(cli.execute("redo"), "error: undo not allowed after io command");
});

test("bare save uses last read/saved path and init resets remembered path", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const path = temporary.write("source.svg", '<svg width="100" height="200"><rect id="r" width="10" height="20"/></svg>');
  const editor = new SvgEditor(new SvgFileStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute(`read ${JSON.stringify(path)}`);
  cli.execute("move r 5 6");
  assert.equal(cli.execute("save"), `saved to ${path} (1 elements)`);
  assert.ok(temporary.read("source.svg").includes('x="5" y="6"'));
  const secondPath = temporary.path("second.svg");
  cli.execute(`save ${JSON.stringify(secondPath)}`);
  assert.equal(editor.filePath, secondPath);
  cli.execute("set r fill red");
  cli.execute("save");
  assert.ok(temporary.read("second.svg").includes('fill="red"'));
  assert.ok(!temporary.read("source.svg").includes('fill="red"'));
  cli.execute("init");
  assert.equal(editor.filePath, undefined);
  assert.equal(cli.execute("save"), "error: no file path. use 'save <file.svg>' first");
});

test("successful read emits all warnings before summary and clears both stacks", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const path = temporary.write("source.svg", '<svg><rect/><g><circle/></g></svg>');
  const editor = new SvgEditor(new SvgFileStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute("init");
  cli.execute("create g old");
  cli.execute("undo");
  const output = cli.execute(`read ${JSON.stringify(path)}`);
  assert.equal(output, [
    "warning: assigned id rect1 to unnamed <rect>",
    "warning: assigned id g1 to unnamed <g>",
    "warning: assigned id circle1 to unnamed <circle>",
    `read ${path} (3 elements)`,
  ].join("\n"));
  assert.deepEqual([editor.undoCount, editor.redoCount], [0, 0]);
  assert.equal(cli.execute("undo"), "error: undo not allowed after io command");
  cli.execute("move circle1 2 3");
  assert.equal(cli.execute("undo"), "circle#circle1 moved back to (0,0)");
});

test("failed read preserves current document, path, ids and undo/redo without warnings", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const valid = temporary.write("valid.svg", '<svg><rect id="r" width="10" height="20"/></svg>');
  const invalidPaths = [
    temporary.path("missing.svg"),
    temporary.write("malformed.svg", "<svg><rect></svg>"),
    temporary.write("duplicates.svg", '<svg><rect/><g id="same"/><circle id="same"/></svg>'),
    temporary.write("unsupported.svg", '<svg><rect/><g transform="translate(1,2)"/></svg>'),
    temporary.write("invalid-utf8.svg", new Uint8Array([0xff, 0xfe, 0x3c, 0x00])),
  ];
  const editor = new SvgEditor(new SvgFileStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute(`read ${JSON.stringify(valid)}`);
  const document = editor.document;
  const rect = document.requireShape("r");
  cli.execute("move r 2 3");
  cli.execute("undo");
  const tree = cli.execute("tree");
  for (const path of invalidPaths) {
    const result = cli.execute(`read ${JSON.stringify(path)}`);
    assert.ok(result.startsWith("error:"), result);
    assert.equal(result.split("\n").length, 1);
    assert.ok(!result.includes("warning:"));
    assert.equal(editor.document, document);
    assert.equal(document.requireShape("r"), rect);
    assert.equal(editor.filePath, valid);
    assert.equal(cli.execute("tree"), tree);
    assert.deepEqual([editor.undoCount, editor.redoCount], [0, 1]);
  }
  assert.equal(cli.execute("redo"), "rect#r moved to (2,3)");
});

test("failed save leaves path/history/target intact and cleans temporary files", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const originalPath = temporary.write("original.svg", '<svg><rect id="r" width="1" height="1"/></svg>');
  const editor = new SvgEditor(new SvgFileStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute(`read ${JSON.stringify(originalPath)}`);
  cli.execute("move r 2 3");
  const tree = cli.execute("tree");
  const files = temporary.files();
  const originalXml = temporary.read("original.svg");
  for (const path of [temporary.root, temporary.path("missing-parent/out.svg")]) {
    assert.equal(cli.execute(`save ${JSON.stringify(path)}`), `error: cannot write file: ${path}`);
    assert.equal(editor.filePath, originalPath);
    assert.equal(editor.undoCount, 1);
    assert.equal(cli.execute("tree"), tree);
    assert.deepEqual(temporary.files(), files);
    assert.equal(temporary.read("original.svg"), originalXml);
  }
  assert.equal(cli.execute("undo"), "rect#r moved back to (0,0)");
});

test("serialization failure never overwrites an existing target or locks undo", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const path = temporary.write("existing.svg", "ORIGINAL CONTENT");
  const editor = new SvgEditor(new SvgFileStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute("init");
  cli.execute('create text t 0 0 "valid"');
  cli.execute('set t text "invalid\u0000text"');
  assert.match(cli.execute(`save ${JSON.stringify(path)}`), /^error: cannot serialize SVG:/);
  assert.equal(temporary.read("existing.svg"), "ORIGINAL CONTENT");
  assert.deepEqual(temporary.files(), ["existing.svg"]);
  assert.equal(editor.filePath, undefined);
  assert.equal(editor.undoCount, 2);
  cli.execute("undo");
  assert.equal(editor.document.requireShape("t").getAttribute("text"), "valid");
});

test("saving with no path is a failed operation and keeps edit history", () => {
  const editor = new SvgEditor(new SvgFileStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute("init");
  cli.execute("create g g");
  assert.equal(cli.execute("save"), "error: no file path. use 'save <file.svg>' first");
  assert.equal(cli.execute("undo"), "g#g creation undone");
});

test("assignment transcript replays save/read and warns on the external fixture", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const cli = new CommandDispatcher(new SvgEditor(new SvgFileStorage()));
  for (const line of [
    "init 800 600", "create rect bg 0 0 800 600 #ffffff",
    'create text title 20 40 "My Diagram"', "create circle c1 100 100 20 red",
    "create rect box 200 80 60 60 #3366ff", "group markers c1 box",
    "move c1 30 0", "undo", "redo", 'set title text "My Diagram v2"', "undo",
  ]) assert.ok(!cli.execute(line).startsWith("error:"), line);
  assert.equal(cli.execute("group bad c1 markers"), "error: cannot group a container into its own descendant: markers");
  cli.execute("delete box");
  assert.equal(cli.execute("undo"), "rect#box restored into g#markers");
  const path = temporary.path("demo.svg");
  assert.equal(cli.execute(`save ${JSON.stringify(path)}`), `saved to ${path} (5 elements)`);
  assert.equal(cli.execute("undo"), "error: undo not allowed after io command");
  const fixture = fileURLToPath(new URL("../../fixtures/other.svg", import.meta.url));
  assert.equal(cli.execute(`read ${JSON.stringify(fixture)}`),
    `warning: assigned id rect1 to unnamed <rect>\nread ${fixture} (7 elements)`);
  assert.ok(cli.execute("tree").includes("svg (400x300)"));
});

test("real CLI process saves then reads the generated file before EOF", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const path = temporary.path("流程图.svg");
  const input = readFileSync(new URL("../../fixtures/flowchart.commands.txt", import.meta.url), "utf8") +
    `\nsave ${JSON.stringify(path)}\nundo\ninit\nread ${JSON.stringify(path)}\ntree\n`;
  const child = spawnSync(process.execPath, [fileURLToPath(new URL("../src/main.js", import.meta.url))], {
    input, encoding: "utf8", timeout: 5000,
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  assert.ok(child.stdout.includes(`saved to ${path} (8 elements)`), child.stdout);
  assert.ok(child.stdout.includes("error: undo not allowed after io command"));
  assert.ok(child.stdout.includes(`read ${path} (8 elements)`));
  assert.ok(child.stdout.includes('text#process-label (545,135) "处理数据 v2"'));
  const result = new SvgFileStorage().read(path);
  assert.equal(result.document.elementCount, 8);
  assert.ok(new TreeFormatter().format(result.document).includes("line#arrow1"));
});
