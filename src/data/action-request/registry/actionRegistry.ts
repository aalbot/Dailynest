import { ActionWidget } from "../widgets/types";

const registry = new Map<string, ActionWidget>();

export function registerAction(widget: ActionWidget) {
  registry.set(widget.id, widget);
}

export function getAction(id: string) {
  return registry.get(id);
}
