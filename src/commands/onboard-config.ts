import type { WoodlsConfig } from "../config/config.js";

export function applyOnboardingLocalWorkspaceConfig(
  baseConfig: WoodlsConfig,
  workspaceDir: string,
): WoodlsConfig {
  return {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: {
        ...baseConfig.agents?.defaults,
        workspace: workspaceDir,
      },
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
  };
}
