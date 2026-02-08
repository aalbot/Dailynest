import { ActionContext } from "../types/ActionContext";
import { UserContext } from "../types/UserContext";
import { Permission } from "../types/Permission";
import { ActionLogger } from "../logging/ActionLogger";

export interface ActionWidget<TInput = any, TResult = any> {
  id: string;
  permission?: Permission;
  render(props: {
    input?: TInput;
    context: ActionContext<TResult>;
    user: UserContext;
    logger: ActionLogger;
  }): JSX.Element;
}
