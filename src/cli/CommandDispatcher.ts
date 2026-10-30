import { AddToCommand } from "../application/commands/AddToCommand.js";
import { BringToFrontCommand } from "../application/commands/BringToFrontCommand.js";
import type { Command } from "../application/commands/Command.js";
import { DeleteCommand } from "../application/commands/DeleteCommand.js";
import { GroupCommand } from "../application/commands/GroupCommand.js";
import { MoveCommand } from "../application/commands/MoveCommand.js";
import { ScaleCommand } from "../application/commands/ScaleCommand.js";
import { SendToBackCommand } from "../application/commands/SendToBackCommand.js";
import { SetCommand } from "../application/commands/SetCommand.js";
import { UngroupCommand } from "../application/commands/UngroupCommand.js";
import { SvgEditor } from "../application/SvgEditor.js";
import { DomainError } from "../domain/errors/DomainError.js";
import { CommandArguments } from "./CommandArguments.js";
import { CommandFeedback } from "./CommandFeedback.js";
import { HelpFormatter } from "./HelpFormatter.js";
import { PositionFormatter } from "./PositionFormatter.js";
import { ShapeFormatter } from "./ShapeFormatter.js";
import { Tokenizer } from "./Tokenizer.js";
import { TreeFormatter } from "./TreeFormatter.js";

export class CommandDispatcher {
  private readonly editor: SvgEditor;
  private readonly tokenizer = new Tokenizer();
  private readonly shapes = new ShapeFormatter();
  private readonly positions = new PositionFormatter();
  private readonly trees = new TreeFormatter();
  private readonly feedback = new WeakMap<Command, CommandFeedback>();
  private readonly handlers: ReadonlyMap<string, (args: CommandArguments) => string>;

  public constructor(editor = new SvgEditor()) {
    this.editor = editor;
    this.handlers = new Map([
      ["init", (args) => this.init(args)],
      ["canvas", (args) => this.canvas(args)],
      ["create", (args) => this.create(args)],
      ["delete", (args) => this.delete(args)],
      ["move", (args) => this.move(args)],
      ["scale", (args) => this.scale(args)],
      ["set", (args) => this.set(args)],
      ["group", (args) => this.group(args)],
      ["ungroup", (args) => this.ungroup(args)],
      ["addto", (args) => this.addTo(args)],
      ["front", (args) => this.front(args)],
      ["back", (args) => this.back(args)],
      ["tree", (args) => this.tree(args)],
      ["show", (args) => this.show(args)],
      ["help", (args) => this.help(args)],
      ["undo", (args) => this.undo(args)],
      ["redo", (args) => this.redo(args)],
      ["read", (args) => this.read(args)],
      ["save", (args) => this.save(args)],
    ]);
  }

  public execute(line: string): string {
    try {
      const tokens = this.tokenizer.tokenize(line);
      const name = tokens[0];
      if (name === undefined) return "";
      const handler = this.handlers.get(name);
      if (handler === undefined) throw new DomainError(`unknown command: ${name}`);
      return handler(new CommandArguments(tokens.slice(1)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "unexpected command failure";
      return `error: ${message.replace(/[\r\n]/g, " ")}`;
    }
  }

  private init(args: CommandArguments): string {
    args.expect(0, 2, "init [w] [h]");
    const document = this.editor.init(
      args.length >= 1 ? args.number(0) : 800,
      args.length >= 2 ? args.number(1) : 600,
    );
    return `canvas ${document.width}x${document.height} created`;
  }

  private canvas(args: CommandArguments): string {
    args.expect(0, 2, "canvas [w] [h]");
    if (args.length === 1) throw new DomainError("usage: canvas [w] [h]");
    if (args.length === 2) this.editor.resizeCanvas(args.number(0), args.number(1));
    const document = this.editor.document;
    return `canvas ${document.width}x${document.height}`;
  }

  private create(args: CommandArguments): string {
    args.expect(2, Number.MAX_SAFE_INTEGER, "create <type> <id> [params...] [in <containerId>]");
    let parameters = args.tail(2);
    let parentId: string | undefined;
    if (parameters.length >= 2 && parameters.at(-2) === "in") {
      parentId = parameters.at(-1)!;
      parameters = parameters.slice(0, -2);
    }
    const command = this.editor.createShape(args.text(0), args.text(1), parameters, parentId);
    const shape = this.editor.document.requireShape(args.text(1));
    const label = this.shapes.label(shape);
    const summary = `${label} created${parentId === undefined ? "" : ` in g#${parentId}`}`;
    const feedback = new CommandFeedback(() => summary, () => `${label} creation undone`);
    this.feedback.set(command, feedback);
    return feedback.describeApplied();
  }

  private delete(args: CommandArguments): string {
    args.expect(1, 1, "delete <id>");
    const document = this.editor.document;
    const shape = document.requireShape(args.text(0));
    const label = this.shapes.label(shape);
    const parent = shape.parent === null ? "svg" : this.shapes.label(shape.parent);
    return this.edit(new DeleteCommand(document, shape.id),
      () => `${label} deleted`, () => `${label} restored into ${parent}`);
  }

  private move(args: CommandArguments): string {
    args.expect(3, 3, "move <id> <dx> <dy>");
    const document = this.editor.document;
    const shape = document.requireShape(args.text(0));
    const label = this.shapes.label(shape);
    const dx = args.number(1);
    const dy = args.number(2);
    return this.edit(new MoveCommand(document, shape.id, dx, dy), () => {
      const position = shape.accept(this.positions);
      return position === undefined ? `${label} moved by (${dx},${dy})` : `${label} moved to ${position}`;
    }, () => {
      const position = shape.accept(this.positions);
      return position === undefined ? `${label} moved back by (${-dx},${-dy})` : `${label} moved back to ${position}`;
    });
  }

  private scale(args: CommandArguments): string {
    args.expect(2, 2, "scale <id> <factor>");
    const document = this.editor.document;
    const shape = document.requireShape(args.text(0));
    const label = this.shapes.label(shape);
    const factor = args.number(1);
    return this.edit(new ScaleCommand(document, shape.id, factor),
      () => `${label} scaled by ${factor}`, () => `${label} scaling undone`);
  }

  private set(args: CommandArguments): string {
    args.expect(3, 3, "set <id> <attr> <value>");
    const document = this.editor.document;
    const shape = document.requireShape(args.text(0));
    const label = this.shapes.label(shape);
    const attribute = args.text(1);
    const summary = (): string => {
      const value = shape.getAttribute(attribute);
      const formatted = value === undefined ? "(unset)" : attribute === "text" ? JSON.stringify(value) : value;
      return `${label} updated: ${attribute}=${formatted}`;
    };
    return this.edit(new SetCommand(document, shape.id, attribute, args.text(2)), summary, summary);
  }

  private group(args: CommandArguments): string {
    args.expect(2, Number.MAX_SAFE_INTEGER, "group <newGid> <id1> <id2>...");
    const document = this.editor.document;
    const groupId = args.text(0);
    const count = args.length - 1;
    return this.edit(new GroupCommand(document, groupId, args.tail(1)),
      () => `g#${groupId} created with ${count} children`, () => `g#${groupId} grouping undone`);
  }

  private ungroup(args: CommandArguments): string {
    args.expect(1, 1, "ungroup <gid>");
    const groupId = args.text(0);
    return this.edit(new UngroupCommand(this.editor.document, groupId),
      () => `g#${groupId} ungrouped`, () => `g#${groupId} restored`);
  }

  private addTo(args: CommandArguments): string {
    args.expect(2, 2, "addto <gid> <id>");
    const document = this.editor.document;
    const containerId = args.text(0);
    const shape = document.requireShape(args.text(1));
    const label = this.shapes.label(shape);
    return this.edit(new AddToCommand(document, containerId, shape.id),
      () => `${label} moved into g#${containerId}`, () => `${label} parent restored`);
  }

  private front(args: CommandArguments): string {
    args.expect(1, 1, "front <id>");
    const document = this.editor.document;
    const shape = document.requireShape(args.text(0));
    const label = this.shapes.label(shape);
    return this.edit(new BringToFrontCommand(document, shape.id),
      () => `${label} brought to front`, () => `${label} z-order restored`);
  }

  private back(args: CommandArguments): string {
    args.expect(1, 1, "back <id>");
    const document = this.editor.document;
    const shape = document.requireShape(args.text(0));
    const label = this.shapes.label(shape);
    return this.edit(new SendToBackCommand(document, shape.id),
      () => `${label} sent to back`, () => `${label} z-order restored`);
  }

  private tree(args: CommandArguments): string {
    args.expect(0, 1, "tree [id]");
    return this.trees.format(this.editor.document, args.length === 0 ? undefined : args.text(0));
  }

  private show(args: CommandArguments): string {
    args.expect(1, 1, "show <id>");
    return this.shapes.show(this.editor.document.requireShape(args.text(0)));
  }

  private help(args: CommandArguments): string {
    args.expect(0, 0, "help");
    return new HelpFormatter().format();
  }

  private undo(args: CommandArguments): string {
    args.expect(0, 0, "undo");
    const command = this.editor.undo();
    return this.feedback.get(command)?.describeReverted() ?? "undo completed";
  }

  private redo(args: CommandArguments): string {
    args.expect(0, 0, "redo");
    const command = this.editor.redo();
    return this.feedback.get(command)?.describeApplied() ?? "redo completed";
  }

  private read(args: CommandArguments): string {
    args.expect(1, 1, "read <file.svg>");
    throw new DomainError("read is not implemented yet (SVG IO: stage 6)");
  }

  private save(args: CommandArguments): string {
    args.expect(0, 1, "save [file.svg]");
    void this.editor.document;
    throw new DomainError("save is not implemented yet (SVG IO: stage 6)");
  }

  private edit(command: Command, applied: () => string, reverted: () => string): string {
    this.editor.execute(command);
    const feedback = new CommandFeedback(applied, reverted);
    this.feedback.set(command, feedback);
    return feedback.describeApplied();
  }
}
