export type ActionStatus = "success" | "cancelled" | "error";

export interface ActionResult<T = any> {
  status: ActionStatus;
  data?: T;
  feedback?: string;
}
