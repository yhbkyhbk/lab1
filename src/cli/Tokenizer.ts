import { DomainError } from "../domain/errors/DomainError.js";

export class Tokenizer {
  public tokenize(line: string): string[] {
    if (line.trimStart().startsWith("#")) return [];
    const tokens: string[] = [];
    let value = "";
    let started = false;
    let quoted = false;
    let closedQuote = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index]!;
      if (quoted) {
        const next = line[index + 1];
        if (character === "\\" && (next === '"' || next === "\\")) {
          value += next;
          index += 1;
        } else if (character === '"') {
          quoted = false;
          closedQuote = true;
        } else {
          value += character;
        }
      } else if (/\s/.test(character)) {
        if (started) tokens.push(value);
        value = "";
        started = false;
        closedQuote = false;
      } else {
        if (closedQuote) throw new DomainError("expected whitespace after closing quote");
        if (character === '"') {
          if (started) throw new DomainError("double quote must start a parameter");
          quoted = true;
        } else {
          value += character;
        }
        started = true;
      }
    }
    if (quoted) throw new DomainError("unterminated double quote");
    if (started) tokens.push(value);
    return tokens;
  }
}
