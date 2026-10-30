import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

class ArchitectureAudit {
  #root = fileURLToPath(new URL("../", import.meta.url));
  #sourceRoot = join(this.#root, "src");
  #problems = [];

  run() {
    const files = this.#files(this.#sourceRoot).filter((path) => path.endsWith(".ts"));
    const fileSet = new Set(files);
    let classes = 0;
    let imports = 0;
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const name = this.#sourceName(file);
      const declarations = [...source.matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)/g)];
      classes += declarations.length;
      if (declarations.length > 1) this.#problems.push(`${name}: more than one exported class`);
      for (const declaration of declarations) {
        if (declaration[1] !== basename(file, ".ts")) {
          this.#problems.push(`${name}: class name and filename differ`);
        }
      }
      if (declarations.length === 0 && name !== "main.ts" && name !== "domain/internal/TreeMutationToken.ts") {
        this.#problems.push(`${name}: missing the expected class declaration`);
      }
      if (/\bswitch\s*\(/.test(source)) this.#problems.push(`${name}: switch dispatch requires review`);
      for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
        imports += 1;
        const dependency = match[1];
        if (dependency.startsWith(".")) {
          const target = resolve(dirname(file), dependency.replace(/\.js$/, ".ts"));
          if (!fileSet.has(target)) this.#problems.push(`${name}: missing or incorrectly cased import ${dependency}`);
          if (!this.#allowed(name, this.#sourceName(target))) {
            this.#problems.push(`${name}: forbidden dependency ${dependency}`);
          }
        } else if (!this.#allowedExternal(name, dependency)) {
          this.#problems.push(`${name}: forbidden external dependency ${dependency}`);
        }
      }
    }

    for (const file of this.#files(this.#root).filter((path) => path.endsWith(".md"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (target.length === 0 || /^[a-z]+:\/\//i.test(target)) continue;
        if (!existsSync(resolve(dirname(file), target))) {
          this.#problems.push(`${relative(this.#root, file)}: broken link ${target}`);
        }
      }
    }

    const documentation = readFileSync(join(this.#root, "doc/README.md"), "utf8");
    const embeddedDiagram = documentation.match(/```plantuml\r?\n([\s\S]*?)```/)?.[1];
    const diagramSource = readFileSync(join(this.#root, "doc/architecture.puml"), "utf8");
    if (embeddedDiagram?.replaceAll("\r\n", "\n").trim() !== diagramSource.replaceAll("\r\n", "\n").trim()) {
      this.#problems.push("doc/README.md: embedded PlantUML differs from architecture.puml");
    }

    if (this.#problems.length > 0) {
      console.error(this.#problems.join("\n"));
      process.exitCode = 1;
    } else {
      console.log(`Architecture audit passed: ${files.length} source files, ${classes} classes, ${imports} static imports; local Markdown links valid.`);
      console.log("Reviewed rules: domain inward-only; application -> domain; infrastructure -> domain/ports; CLI read-only domain access; one class per matching file; no switch dispatch.");
    }
  }

  #allowed(source, target) {
    if (source === "main.ts") return true;
    const layer = source.split("/")[0];
    if (target.startsWith(`${layer}/`)) return true;
    if (layer === "domain") return false;
    if (layer === "application") return target.startsWith("domain/");
    if (layer === "infrastructure") return target.startsWith("domain/") || target.startsWith("application/ports/");
    if (layer === "cli") return target.startsWith("application/") || (target.startsWith("domain/") && !target.startsWith("domain/internal/"));
    return false;
  }

  #allowedExternal(source, dependency) {
    if (source.startsWith("infrastructure/")) return dependency.startsWith("node:") || dependency === "@xmldom/xmldom";
    if (source.startsWith("cli/")) return dependency === "node:readline" || dependency === "node:stream";
    return false;
  }

  #sourceName(file) {
    return relative(this.#sourceRoot, file).replaceAll("\\", "/");
  }

  #files(directory) {
    const files = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (["node_modules", "dist", "tmp", ".git"].includes(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) files.push(...this.#files(path));
      else if (entry.isFile()) files.push(path);
    }
    return files;
  }
}

new ArchitectureAudit().run();
