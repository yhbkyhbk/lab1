import { randomUUID } from "node:crypto";
import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { SvgReadResult } from "../../application/ports/SvgReadResult.js";
import { SvgStorage } from "../../application/ports/SvgStorage.js";
import { DomainError } from "../../domain/errors/DomainError.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import { SvgReader } from "./SvgReader.js";
import { SvgWriter } from "./SvgWriter.js";

export class SvgFileStorage extends SvgStorage {
  private readonly reader = new SvgReader();
  private readonly writer = new SvgWriter();

  public override read(path: string): SvgReadResult {
    let xml: string;
    try {
      xml = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path));
    } catch {
      throw new DomainError(`cannot read file: ${path}`);
    }
    return this.reader.parse(xml);
  }

  public override write(path: string, document: SvgDocument): void {
    const xml = this.writer.serialize(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    let created = false;
    try {
      const descriptor = openSync(temporary, "wx");
      created = true;
      try {
        writeFileSync(descriptor, xml, "utf8");
      } finally {
        closeSync(descriptor);
      }
      renameSync(temporary, path);
      created = false;
    } catch {
      throw new DomainError(`cannot write file: ${path}`);
    } finally {
      if (created) {
        try { unlinkSync(temporary); } catch { /* Preserve the original write error. */ }
      }
    }
  }
}
