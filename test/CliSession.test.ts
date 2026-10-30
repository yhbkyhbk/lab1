import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Repl } from "../src/cli/Repl.js";

test("REPL processes CRLF script lines and continues after errors until EOF", async () => {
  let output = "";
  const repl = new Repl((text) => { output += text; });
  await repl.run(Readable.from(['init\r\n# comment\r\ncreate text t 1 2 "中文"\r\n',
    'move missing 1 2\r\nshow t\r\n']));
  assert.ok(output.startsWith("svg-editor 0.1"));
  assert.ok(output.includes("text#t created"));
  assert.ok(output.includes("error: no such shape: missing"));
  assert.ok(output.includes('text#t  parent=svg\n  (1,2) "中文"'));
  assert.ok(output.endsWith("svg> "));
  assert.equal((output.match(/svg> /g) ?? []).length, 6);
});

test("CLI process replays the flowchart fixture and exits cleanly at EOF", () => {
  const script = readFileSync(new URL("../../fixtures/flowchart.commands.txt", import.meta.url), "utf8");
  const child = spawnSync(process.execPath, [fileURLToPath(new URL("../src/main.js", import.meta.url))], {
    input: script, encoding: "utf8", timeout: 5000,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  assert.ok(!child.stdout.includes("error:"), child.stdout);
  assert.ok(child.stdout.includes("├── g#node1"));
  assert.ok(child.stdout.includes('text#process-label (545,135) "处理数据"'));
  assert.ok(child.stdout.includes("g#node2 moved by (0,100)"));
  assert.ok(child.stdout.includes("g#node2 moved back by (0,-100)"));
  assert.ok(child.stdout.includes('text#process-label updated: text="处理数据 v2"'));
});
