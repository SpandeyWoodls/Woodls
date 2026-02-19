import type {
  AnyAgentTool,
  WoodlsPluginApi,
  WoodlsPluginToolFactory,
} from "../../src/plugins/types.js";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: WoodlsPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as WoodlsPluginToolFactory,
    { optional: true },
  );
}
