import { ActionRequest } from "../types/ActionRequest";
import { ActionResult } from "../types/ActionResult";

type Resolver = (result: ActionResult) => void;

class ActionRequestBus {
  private handler?: (req: ActionRequest, resolve: Resolver) => void;

  setHandler(fn: (req: ActionRequest, resolve: Resolver) => void) {
    this.handler = fn;
  }

  request<T = any>(req: ActionRequest): Promise<ActionResult<T>> {
    return new Promise(resolve => {
      if (!this.handler) {
        resolve({ status: "error", feedback: "No handler registered" });
        return;
      }
      this.handler(req, resolve);
    });
  }
}

export const actionRequestBus = new ActionRequestBus();
