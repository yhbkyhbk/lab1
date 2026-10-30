import assert from "node:assert/strict";
import test from "node:test";
import { Tokenizer } from "../src/cli/Tokenizer.js";

test("tokenizer preserves colors and handles whole-line comments", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize(" \t# ignored"), []);
  assert.deepEqual(tokenizer.tokenize(" \t "), []);
  assert.deepEqual(tokenizer.tokenize("create rect r 1 2 3 4 #ffffff"),
    ["create", "rect", "r", "1", "2", "3", "4", "#ffffff"]);
  assert.deepEqual(tokenizer.tokenize("move r 1 2 # not an inline comment"),
    ["move", "r", "1", "2", "#", "not", "an", "inline", "comment"]);
});

test("tokenizer keeps quoted Unicode, empty text and literal in as one parameter", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize('create text t 1 2 "开始 in node" in node'),
    ["create", "text", "t", "1", "2", "开始 in node", "in", "node"]);
  assert.deepEqual(tokenizer.tokenize('set t text ""'), ["set", "t", "text", ""]);
});

test("tokenizer supports escaped quotes and preserves Windows path backslashes", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize(String.raw`set t text "say \"hello\""`),
    ["set", "t", "text", 'say "hello"']);
  assert.deepEqual(tokenizer.tokenize(String.raw`read "C:\图形\my file.svg"`),
    ["read", String.raw`C:\图形\my file.svg`]);
  assert.deepEqual(tokenizer.tokenize(String.raw`set t text "a\\b"`),
    ["set", "t", "text", String.raw`a\b`]);
});

test("tokenizer rejects malformed quoting instead of dropping content", () => {
  const tokenizer = new Tokenizer();
  assert.throws(() => tokenizer.tokenize('set t text "unfinished'), /unterminated double quote/);
  assert.throws(() => tokenizer.tokenize('set t text "done"tail'), /whitespace after closing quote/);
  assert.throws(() => tokenizer.tokenize('set t text ab"cd"'), /double quote must start/);
});
