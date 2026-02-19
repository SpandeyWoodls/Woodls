import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-woodls writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.woodls.mac"
let gatewayLaunchdLabel = "ai.woodls.gateway"
let onboardingVersionKey = "woodls.onboardingVersion"
let onboardingSeenKey = "woodls.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "woodls.pauseEnabled"
let iconAnimationsEnabledKey = "woodls.iconAnimationsEnabled"
let swabbleEnabledKey = "woodls.swabbleEnabled"
let swabbleTriggersKey = "woodls.swabbleTriggers"
let voiceWakeTriggerChimeKey = "woodls.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "woodls.voiceWakeSendChime"
let showDockIconKey = "woodls.showDockIcon"
let defaultVoiceWakeTriggers = ["woodls"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "woodls.voiceWakeMicID"
let voiceWakeMicNameKey = "woodls.voiceWakeMicName"
let voiceWakeLocaleKey = "woodls.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "woodls.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "woodls.voicePushToTalkEnabled"
let talkEnabledKey = "woodls.talkEnabled"
let iconOverrideKey = "woodls.iconOverride"
let connectionModeKey = "woodls.connectionMode"
let remoteTargetKey = "woodls.remoteTarget"
let remoteIdentityKey = "woodls.remoteIdentity"
let remoteProjectRootKey = "woodls.remoteProjectRoot"
let remoteCliPathKey = "woodls.remoteCliPath"
let canvasEnabledKey = "woodls.canvasEnabled"
let cameraEnabledKey = "woodls.cameraEnabled"
let systemRunPolicyKey = "woodls.systemRunPolicy"
let systemRunAllowlistKey = "woodls.systemRunAllowlist"
let systemRunEnabledKey = "woodls.systemRunEnabled"
let locationModeKey = "woodls.locationMode"
let locationPreciseKey = "woodls.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "woodls.peekabooBridgeEnabled"
let deepLinkKeyKey = "woodls.deepLinkKey"
let modelCatalogPathKey = "woodls.modelCatalogPath"
let modelCatalogReloadKey = "woodls.modelCatalogReload"
let cliInstallPromptedVersionKey = "woodls.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "woodls.heartbeatsEnabled"
let debugPaneEnabledKey = "woodls.debugPaneEnabled"
let debugFileLogEnabledKey = "woodls.debug.fileLogEnabled"
let appLogLevelKey = "woodls.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
