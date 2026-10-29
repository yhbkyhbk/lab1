export class Repl {
  private readonly write: (text: string) => void;

  public constructor(
    write: (text: string) => void = (text) => process.stdout.write(text),
  ) {
    this.write = write;
  }

  public start(): void {
    this.write("svg-editor 0.1 — type 'help' for commands\n");
    this.write("svg> ");
  }
}

