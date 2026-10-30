import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { SvgReadResult } from "./SvgReadResult.js";

export abstract class SvgStorage {
  public abstract read(path: string): SvgReadResult;
  public abstract write(path: string, document: SvgDocument): void;
}
