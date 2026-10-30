import type { StateMemento } from "../../domain/memento/StateMemento.js";
import { Command } from "./Command.js";

export abstract class TreeCommand extends Command {
  protected override captureState(): StateMemento {
    return this.document.captureTreeState();
  }
}
