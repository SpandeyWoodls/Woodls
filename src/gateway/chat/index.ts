import type { GatewayRequestHandlers } from "../server-methods/types.js";
import { chatAbortHandlers } from "./abort.js";
import { chatHistoryHandlers } from "./history.js";
import { chatInjectHandlers } from "./inject.js";
import { chatSendHandlers } from "./send.js";

export { sanitizeChatSendMessageInput } from "./send.js";

export const chatHandlers: GatewayRequestHandlers = {
  ...chatHistoryHandlers,
  ...chatAbortHandlers,
  ...chatSendHandlers,
  ...chatInjectHandlers,
};
