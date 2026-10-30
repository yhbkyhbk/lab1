import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";
import { DomainError } from "../../domain/errors/DomainError.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import { SvgShapeWriter } from "./SvgShapeWriter.js";

export class SvgWriter {
  public serialize(document: SvgDocument): string {
    try {
      const dom = new DOMImplementation().createDocument("http://www.w3.org/2000/svg", "svg", null);
      const root = dom.documentElement!;
      root.setAttribute("width", String(document.width));
      root.setAttribute("height", String(document.height));
      root.setAttribute("viewBox", document.viewBox.toString());
      for (const [name, value] of document.extraSvgAttributes) {
        if (name === "xml:space") root.setAttributeNS("http://www.w3.org/XML/1998/namespace", name, value);
        else root.setAttribute(name, value);
      }
      const visitor = new SvgShapeWriter(dom);
      for (const shape of document.roots) {
        root.appendChild(dom.createTextNode("\n  "));
        root.appendChild(shape.accept(visitor));
      }
      if (document.roots.length > 0) root.appendChild(dom.createTextNode("\n"));
      const xml = new XMLSerializer().serializeToString(dom, { requireWellFormed: true });
      // Literal CR in text would be normalized by XML readers; retain it as a reference.
      return `<?xml version="1.0" encoding="UTF-8"?>\n${xml.replace(/\r/g, "&#13;")}\n`;
    } catch (error) {
      throw new DomainError(`cannot serialize SVG: ${error instanceof Error ? error.message : "invalid data"}`);
    }
  }
}
