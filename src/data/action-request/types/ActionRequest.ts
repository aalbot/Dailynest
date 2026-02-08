export type ActionContainer = "modal" | "drawer" | "inline";

export interface ActionRequest<TInput = any> {
  requestId: string;
  actionId: string;
  container: ActionContainer;
  input?: TInput;
}
