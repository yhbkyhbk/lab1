import assert from "node:assert/strict";
import test from "node:test";

import { Repl } from "../src/cli/Repl.js";

test("REPL prints the application banner and prompt", () => {
  let output = "";
  const repl = new Repl((text) => {
    output += text;
  });

  repl.start();

  assert.equal(
    output,
    "svg-editor 0.1 — type 'help' for commands\nsvg> ",
  );
});

