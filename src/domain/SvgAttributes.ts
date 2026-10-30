import { DomainError } from "./errors/DomainError.js";

/** Passive presentation metadata kept for SVG round trips, not editable via set. */
export class SvgAttributes {
  private readonly values = new Map<string, string>();
  private readonly allowRootStyles: boolean;
  private static readonly allowed = new Set([
    "opacity", "fill-opacity", "stroke-opacity", "fill-rule", "clip-rule",
    "font-size", "font-family", "font-weight", "font-style", "text-anchor",
    "dominant-baseline", "alignment-baseline", "letter-spacing", "word-spacing",
    "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset",
    "stroke-miterlimit", "visibility", "display", "vector-effect", "xml:space",
    "preserveAspectRatio", "version",
  ]);

  public constructor(allowRootStyles = false) {
    this.allowRootStyles = allowRootStyles;
  }

  public set(name: string, value: string): void {
    if (!SvgAttributes.allowed.has(name) && !(this.allowRootStyles && ["fill", "stroke", "stroke-width"].includes(name))) {
      throw new DomainError(`unsupported SVG attribute: ${name}`);
    }
    this.values.set(name, value);
  }

  public entries(): readonly (readonly [string, string])[] {
    return [...this.values.entries()];
  }
}
