import type { WoodlsConfig } from "./config.js";

export function ensurePluginAllowlisted(cfg: WoodlsConfig, pluginId: string): WoodlsConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}
