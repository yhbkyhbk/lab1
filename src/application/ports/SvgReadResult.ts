import type { SvgDocument } from "../../domain/SvgDocument.js";

export class SvgReadResult {
  private readonly parsedDocument: SvgDocument;
  private readonly messages: readonly string[];

  public constructor(document: SvgDocument, warnings: readonly string[]) {
    this.parsedDocument = document;
    this.messages = [...warnings];
  }

  public get document(): SvgDocument { return this.parsedDocument; }
  public get warnings(): readonly string[] { return [...this.messages]; }
}
