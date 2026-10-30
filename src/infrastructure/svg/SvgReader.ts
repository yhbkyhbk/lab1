import { DOMParser, XMLSerializer, type Element, type Node } from "@xmldom/xmldom";
import { SvgReadResult } from "../../application/ports/SvgReadResult.js";
import { DomainError } from "../../domain/errors/DomainError.js";
import { ShapeFactory } from "../../domain/ShapeFactory.js";
import { Group } from "../../domain/shapes/Group.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import { SvgDocument } from "../../domain/SvgDocument.js";
import { SvgNumbers } from "./SvgNumbers.js";

export class SvgReader {
  private static readonly namespace = "http://www.w3.org/2000/svg";
  private readonly factory = new ShapeFactory();

  public parse(xml: string): SvgReadResult {
    const dom = this.parseXml(xml);
    const root = dom.documentElement;
    if (root === null || root.localName !== "svg") throw new DomainError("invalid SVG root: expected <svg>");
    this.validateNamespace(root);
    const viewBox = SvgNumbers.viewBox(root.getAttribute("viewBox"));
    const width = SvgNumbers.dimension(root.getAttribute("width"), viewBox?.width ?? 800, "width");
    const height = SvgNumbers.dimension(root.getAttribute("height"), viewBox?.height ?? 600, "height");
    const document = new SvgDocument(width, height, viewBox);
    for (const [name, value] of this.attributes(root)) {
      if (name !== "width" && name !== "height" && name !== "viewBox") {
        document.preserveSvgAttribute(name, value);
      }
    }

    const elements: Element[] = [];
    const collect = (element: Element): void => {
      this.validateNamespace(element);
      elements.push(element);
      for (const child of this.elementChildren(element)) collect(child);
    };
    for (const child of this.elementChildren(root)) collect(child);

    // Reserve all explicit ids first, including those appearing later in the file.
    const reserved = new Set<string>();
    const ids = new Map<Element, string>();
    for (const element of elements) {
      const id = element.getAttribute("id");
      if (id !== null && id !== "") {
        if (reserved.has(id)) throw new DomainError(`id already exists: ${id}`);
        reserved.add(id);
        ids.set(element, id);
      }
    }
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    for (const element of elements) {
      if (ids.has(element)) continue;
      const type = element.localName ?? element.tagName;
      let number = counters.get(type) ?? 1;
      while (reserved.has(`${type}${number}`)) number += 1;
      const id = `${type}${number}`;
      counters.set(type, number + 1);
      reserved.add(id);
      ids.set(element, id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }

    const build = (element: Element): Shape => {
      const children = this.elementChildren(element);
      const shape = this.factory.createFromSvg(
        element.localName ?? element.tagName, ids.get(element)!, this.attributes(element), element.textContent ?? "",
      );
      if (shape instanceof Group) {
        this.assertNoLooseText(element);
        for (const child of children) shape.appendChild(build(child));
      } else if (children.length > 0) {
        throw new DomainError(`unsupported child element inside <${element.localName}>`);
      } else if (shape.getAttribute("text") === undefined) {
        this.assertNoLooseText(element);
      }
      return shape;
    };
    this.assertNoLooseText(root);
    for (const element of this.elementChildren(root)) document.addShape(build(element));
    return new SvgReadResult(document, warnings);
  }

  private parseXml(xml: string): ReturnType<DOMParser["parseFromString"]> {
    try {
      const dom = new DOMParser({ onError: (_level, message) => { throw new Error(message); } })
        .parseFromString(xml, "image/svg+xml");
      for (let node = dom.firstChild; node !== null; node = node.nextSibling) {
        if (node.nodeType === 10) throw new Error("DOCTYPE is not supported");
        if (node.nodeType === 7 && node.nodeName !== "xml") throw new Error("processing instructions are not supported");
      }
      if (dom.documentElement === null) throw new Error("missing SVG root");
      // xmldom represents the XML declaration as a PI; validate the actual root tree.
      new XMLSerializer().serializeToString(dom.documentElement, { requireWellFormed: true });
      return dom;
    } catch (error) {
      throw new DomainError(`invalid SVG: ${error instanceof Error ? error.message : "invalid XML"}`);
    }
  }

  private validateNamespace(element: Element): void {
    if (element.namespaceURI !== null && element.namespaceURI !== SvgReader.namespace) {
      throw new DomainError(`unsupported SVG namespace: ${element.namespaceURI}`);
    }
  }

  private attributes(element: Element): ReadonlyMap<string, string> {
    const result = new Map<string, string>();
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index)!;
      if (attribute.namespaceURI === "http://www.w3.org/2000/xmlns/") continue;
      result.set(attribute.name, attribute.value);
    }
    return result;
  }

  private elementChildren(element: Element): Element[] {
    const children: Element[] = [];
    for (let child: Node | null = element.firstChild; child !== null; child = child.nextSibling) {
      if (child.nodeType === 1) children.push(child as Element);
      else if (child.nodeType !== 3 && child.nodeType !== 4 && child.nodeType !== 8) {
        throw new DomainError(`unsupported SVG node: ${child.nodeName}`);
      }
    }
    return children;
  }

  private assertNoLooseText(element: Element): void {
    for (let child = element.firstChild; child !== null; child = child.nextSibling) {
      if ((child.nodeType === 3 || child.nodeType === 4) && (child.nodeValue ?? "").trim() !== "") {
        throw new DomainError(`unexpected text inside <${element.localName}>`);
      }
    }
  }
}
