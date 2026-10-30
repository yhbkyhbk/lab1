import assert from "node:assert/strict";
import test from "node:test";
import { SvgEditor } from "../src/application/SvgEditor.js";
import { CommandDispatcher } from "../src/cli/CommandDispatcher.js";
import type { Shape } from "../src/domain/shapes/Shape.js";
import { SvgReader } from "../src/infrastructure/svg/SvgReader.js";
import { SvgWriter } from "../src/infrastructure/svg/SvgWriter.js";
import { DocumentSnapshot } from "./support/DocumentSnapshot.js";
import { SeededRandom } from "./support/SeededRandom.js";

for (const seed of [17, 42, 2026, 65537]) {
  test(`seed ${seed}: 160 mixed edits preserve invariants, exact undo and redo`, (context) => {
    const random = new SeededRandom(seed);
    const editor = new SvgEditor();
    const cli = new CommandDispatcher(editor);
    cli.execute("init");
    const document = editor.document;
    const states = [new DocumentSnapshot(document)];
    let rejected = 0;
    for (let step = 0; step < 160; step += 1) {
      const shapes: Shape[] = [];
      document.walk((shape) => shapes.push(shape));
      const groups = shapes.filter((shape) => shape.typeName === "g");
      let command: string;
      if (shapes.length === 0 || random.integer(12) < 3) {
        const [type, parameters] = random.pick([
          ["rect", "1.5 -2 30 40"], ["circle", "10 20 5"], ["ellipse", "5 6 7 8"],
          ["line", "1 2 30 40 black"], ["text", `1 2 ${JSON.stringify(`节点 ${seed}/${step} & < > "quoted"`)}`], ["g", ""],
        ] as const);
        const parent = groups.length > 0 && random.integer(2) === 0 ? ` in ${random.pick(groups).id}` : "";
        command = `create ${type} s${seed}_${step} ${parameters}${parent}`;
      } else {
        const target = random.pick(shapes);
        const parent = groups.length === 0 ? "missing" : random.pick(groups).id;
        command = random.pick([
          `move ${target.id} ${random.integer(9) - 4} ${random.integer(9) - 4}`,
          `scale ${target.id} ${random.pick([0.5, 1.25, 2])}`,
          `set ${target.id} fill ${random.pick(["red", "#abcdef", "none"])}`,
          `group g${seed}_${step} ${target.id} ${random.pick(shapes).id}`,
          `addto ${parent} ${target.id}`,
          `ungroup ${target.id}`,
          `front ${target.id}`,
          `back ${target.id}`,
          `delete ${target.id}`,
          `scale ${target.id} 0`,
        ]);
      }
      const before = new DocumentSnapshot(document);
      const counts = [editor.undoCount, editor.redoCount];
      const output = cli.execute(command);
      const description = `seed=${seed}, step=${step}, command=${command}`;
      if (output.startsWith("error:")) {
        rejected += 1;
        before.assertMatches(document, description);
        assert.deepEqual([editor.undoCount, editor.redoCount], counts, description);
      } else {
        assert.equal(editor.undoCount, counts[0]! + 1, description);
        const after = new DocumentSnapshot(document);
        states.push(after);
        if (step % 11 === 0) {
          assert.ok(!cli.execute("undo").startsWith("error:"), description);
          before.assertMatches(document, `${description}: immediate undo`);
          assert.ok(!cli.execute("redo").startsWith("error:"), description);
          after.assertMatches(document, `${description}: immediate redo`);
        }
      }
      if (step % 13 === 0) {
        const original = new SvgWriter().serialize(document);
        const imported = new SvgReader().parse(original);
        assert.deepEqual(imported.warnings, []);
        assert.equal(new SvgWriter().serialize(imported.document), original, `${description}: round trip`);
      }
    }

    const edits = states.length - 1;
    assert.ok(edits > 50);
    assert.ok(rejected > 0);
    for (let index = edits - 1; index >= 0; index -= 1) {
      assert.ok(!cli.execute("undo").startsWith("error:"));
      states[index]!.assertMatches(document, `seed=${seed}: undo to ${index}`);
    }
    assert.equal(editor.undoCount, 0);
    assert.equal(editor.redoCount, edits);
    for (let index = 1; index <= edits; index += 1) {
      assert.ok(!cli.execute("redo").startsWith("error:"));
      states[index]!.assertMatches(document, `seed=${seed}: redo to ${index}`);
    }
    assert.equal(editor.undoCount, edits);
    assert.equal(editor.redoCount, 0);
    context.diagnostic(`${edits} successful edits; ${rejected} rejected commands; every undo/redo state checked`);
  });
}
