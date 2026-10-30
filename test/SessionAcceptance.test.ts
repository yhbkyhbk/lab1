import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { SvgEditor } from "../src/application/SvgEditor.js";
import { CommandDispatcher } from "../src/cli/CommandDispatcher.js";
import { SvgFileStorage } from "../src/infrastructure/svg/SvgFileStorage.js";
import { TemporaryWorkspace } from "./support/TemporaryWorkspace.js";

test("entire assignment transcript matches the expected output line for line", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  temporary.write("other.svg", readFileSync(new URL("../../fixtures/other.svg", import.meta.url), "utf8"));
  const input = readFileSync(new URL("../../fixtures/assignment.commands.txt", import.meta.url), "utf8");
  const expected = readFileSync(new URL("../../fixtures/assignment.expected.txt", import.meta.url), "utf8").trim();
  const child = spawnSync(process.execPath, [fileURLToPath(new URL("../src/main.js", import.meta.url))], {
    cwd: temporary.root, input, encoding: "utf8", timeout: 5000,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  const actual = child.stdout.replace(/^svg-editor[^\r\n]*\r?\n/, "")
    .replace(/svg> /g, "").replace(/\r\n/g, "\n").trim();
  assert.equal(actual, expected.replace(/\r\n/g, "\n"));
  const saved = new SvgFileStorage().read(temporary.path("demo.svg")).document;
  assert.equal(saved.elementCount, 5);
  assert.equal(saved.requireShape("c1").getAttribute("cx"), "130");
  assert.equal(saved.requireShape("title").getAttribute("text"), "My Diagram");
  assert.equal(saved.requireShape("box").parent?.id, "markers");
  assert.deepEqual(temporary.files(), ["demo.svg", "other.svg"]);
});

test("read/save boundaries preserve imported metadata through subsequent editing and undo", (context) => {
  const temporary = new TemporaryWorkspace();
  context.after(() => temporary.dispose());
  const path = temporary.write("styled.svg", '<svg width="400" height="300" viewBox="-10 -20 200 150" fill="blue"><g id="g"><text id="t" x="10" y="20" font-size="16" text-anchor="middle">原文字</text><rect id="r" width="10" height="20"/></g></svg>');
  const editor = new SvgEditor(new SvgFileStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute(`read ${JSON.stringify(path)}`);
  const before = cli.execute("tree");
  cli.execute("group node t r");
  cli.execute("scale node 2");
  cli.execute('set t text "新内容"');
  cli.execute("delete node");
  for (let index = 0; index < 4; index += 1) cli.execute("undo");
  assert.equal(cli.execute("tree"), before);
  cli.execute("save");
  const saved = new SvgFileStorage().read(path).document;
  assert.equal(saved.viewBox.toString(), "-10 -20 200 150");
  assert.deepEqual(saved.extraSvgAttributes, [["fill", "blue"]]);
  assert.deepEqual(saved.requireShape("t").extraSvgAttributes, [["font-size", "16"], ["text-anchor", "middle"]]);
  assert.equal(saved.requireShape("t").getAttribute("text"), "原文字");
  assert.equal(cli.execute("redo"), "error: undo not allowed after io command");
  assert.equal(cli.execute("undo"), "error: undo not allowed after io command");
});

test("EOF with no commands and a final line without newline both exit cleanly", () => {
  const entry = fileURLToPath(new URL("../src/main.js", import.meta.url));
  for (const input of ["", 'init\ncreate text t 1 2 "last line"\nshow t']) {
    const child = spawnSync(process.execPath, [entry], { input, encoding: "utf8", timeout: 5000 });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stderr, "");
    if (input.length > 0) assert.ok(child.stdout.includes('"last line"'));
  }
});
