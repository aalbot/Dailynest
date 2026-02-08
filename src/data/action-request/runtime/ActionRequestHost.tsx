import React, { useEffect, useRef, useState } from "react";
import { actionRequestBus } from "./ActionRequestBus";
import { getAction } from "../registry/actionRegistry";
import { hasPermission } from "../permissions/permissionChecker";
import { createActionLogger } from "../logging/createActionLogger";
import { UserContext } from "../types/UserContext";
import { ActionRequest } from "../types/ActionRequest";
import { ActionResult } from "../types/ActionResult";

export function ActionRequestHost({ user }: { user: UserContext }) {
  const [req, setReq] = useState<ActionRequest | null>(null);
  const resolver = useRef<(r: ActionResult) => void>();

  useEffect(() => {
    actionRequestBus.setHandler((request, resolve) => {
      setReq(request);
      resolver.current = resolve;
    });
  }, []);

  if (!req) return null;

  const widget = getAction(req.actionId);
  if (!widget) return null;

  if (!hasPermission(user, widget.permission)) {
    resolver.current?.({
      status: "error",
      feedback: "Permission denied"
    });
    return null;
  }

  const logger = createActionLogger(req.requestId, widget.id);

  return widget.render({
    input: req.input,
    user,
    logger,
    context: {
      resolve(result) {
        resolver.current?.(result);
        setReq(null);
      },
      reject(reason) {
        resolver.current?.({
          status: "error",
          feedback: reason
        });
        setReq(null);
      }
    }
  });
}
