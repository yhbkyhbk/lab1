import { Repl } from "./cli/Repl.js";
import { CommandDispatcher } from "./cli/CommandDispatcher.js";
import { SvgEditor } from "./application/SvgEditor.js";
import { SvgFileStorage } from "./infrastructure/svg/SvgFileStorage.js";

const editor = new SvgEditor(new SvgFileStorage());
const dispatcher = new CommandDispatcher(editor);
const repl = new Repl(undefined, dispatcher);
await repl.run();

