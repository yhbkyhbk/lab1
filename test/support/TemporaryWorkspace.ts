import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";

export class TemporaryWorkspace {
  private readonly directory = mkdtempSync(join(tmpdir(), "svg-editor-io-"));

  public get root(): string { return this.directory; }

  public path(name: string): string {
    const target = resolve(this.directory, name);
    if (!target.startsWith(`${resolve(this.directory)}${sep}`)) throw new Error("invalid temporary path");
    return target;
  }

  public write(name: string, contents: string | Uint8Array): string {
    const path = this.path(name);
    writeFileSync(path, contents, "utf8");
    return path;
  }

  public read(name: string): string { return readFileSync(this.path(name), "utf8"); }

  public files(): string[] { return readdirSync(this.directory).sort(); }

  public dispose(): void {
    const target = resolve(this.directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("svg-editor-io-")) {
      throw new Error("refusing to remove an unexpected temporary directory");
    }
    rmSync(target, { recursive: true, force: true });
  }
}
