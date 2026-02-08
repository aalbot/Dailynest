export function createActionLogger(
  requestId: string,
  actionId: string
) {
  return {
    info(message: string, data?: any) {
      console.log("[ACTION]", requestId, actionId, message, data);
    },
    warn(message: string, data?: any) {
      console.warn("[ACTION]", requestId, actionId, message, data);
    },
    error(message: string, data?: any) {
      console.error("[ACTION]", requestId, actionId, message, data);
    }
  };
}
