import { ActionResult } from "./ActionResult";

export interface ActionContext<TResult = any> {
  resolve(result: ActionResult<TResult>): void;
  reject(reason?: string): void;
}
