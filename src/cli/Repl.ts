import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import { CommandDispatcher } from "./CommandDispatcher.js";

export class Repl {
  private readonly write: (text: string) => void;
  private readonly dispatcher: CommandDispatcher;

  public constructor(
    write: (text: string) => void = (text) => process.stdout.write(text),
    dispatcher = new CommandDispatcher(),
  ) {
    this.write = write;
    this.dispatcher = dispatcher;
  }

  public start(): void {
    this.write("svg-editor 0.1 — type 'help' for commands\n");
    this.write("svg> ");
  }

  public async run(input: Readable = process.stdin): Promise<void> {
    const lines = createInterface({ input, crlfDelay: Infinity, terminal: false });
    this.start();
    try {
      for await (const line of lines) {
        const result = this.dispatcher.execute(line);
        if (result.length > 0) this.write(`${result}\n`);
        this.write("svg> ");
      }
    } finally {
      lines.close();
    }
  }
}

