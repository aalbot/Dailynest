import { actionRequestBus } from "../runtime/ActionRequestBus";
import { ActionResult } from "../types/ActionResult";

export async function runFlow(
  steps: { actionId: string; input?: any }[]
): Promise<ActionResult> {
  let data: any = {};

  for (const step of steps) {
    const res = await actionRequestBus.request({
      requestId: crypto.randomUUID(),
      actionId: step.actionId,
      container: "modal",
      input: step.input
    });

    if (res.status !== "success") return res;
    data[step.actionId] = res.data;
  }

  return { status: "success", data };
}
