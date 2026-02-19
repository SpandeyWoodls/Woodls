package ai.woodls.android.node

import android.os.Build
import ai.woodls.android.BuildConfig
import ai.woodls.android.SecurePrefs
import ai.woodls.android.gateway.GatewayClientInfo
import ai.woodls.android.gateway.GatewayConnectOptions
import ai.woodls.android.gateway.GatewayEndpoint
import ai.woodls.android.gateway.GatewayTlsParams
import ai.woodls.android.protocol.WoodlsCanvasA2UICommand
import ai.woodls.android.protocol.WoodlsCanvasCommand
import ai.woodls.android.protocol.WoodlsCameraCommand
import ai.woodls.android.protocol.WoodlsLocationCommand
import ai.woodls.android.protocol.WoodlsScreenCommand
import ai.woodls.android.protocol.WoodlsSmsCommand
import ai.woodls.android.protocol.WoodlsCapability
import ai.woodls.android.LocationMode
import ai.woodls.android.VoiceWakeMode

class ConnectionManager(
  private val prefs: SecurePrefs,
  private val cameraEnabled: () -> Boolean,
  private val locationMode: () -> LocationMode,
  private val voiceWakeMode: () -> VoiceWakeMode,
  private val smsAvailable: () -> Boolean,
  private val hasRecordAudioPermission: () -> Boolean,
  private val manualTls: () -> Boolean,
) {
  companion object {
    internal fun resolveTlsParamsForEndpoint(
      endpoint: GatewayEndpoint,
      storedFingerprint: String?,
      manualTlsEnabled: Boolean,
    ): GatewayTlsParams? {
      val stableId = endpoint.stableId
      val stored = storedFingerprint?.trim().takeIf { !it.isNullOrEmpty() }
      val isManual = stableId.startsWith("manual|")

      if (isManual) {
        if (!manualTlsEnabled) return null
        if (!stored.isNullOrBlank()) {
          return GatewayTlsParams(
            required = true,
            expectedFingerprint = stored,
            allowTOFU = false,
            stableId = stableId,
          )
        }
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      // Prefer stored pins. Never let discovery-provided TXT override a stored fingerprint.
      if (!stored.isNullOrBlank()) {
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = stored,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      val hinted = endpoint.tlsEnabled || !endpoint.tlsFingerprintSha256.isNullOrBlank()
      if (hinted) {
        // TXT is unauthenticated. Do not treat the advertised fingerprint as authoritative.
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      return null
    }
  }

  fun buildInvokeCommands(): List<String> =
    buildList {
      add(WoodlsCanvasCommand.Present.rawValue)
      add(WoodlsCanvasCommand.Hide.rawValue)
      add(WoodlsCanvasCommand.Navigate.rawValue)
      add(WoodlsCanvasCommand.Eval.rawValue)
      add(WoodlsCanvasCommand.Snapshot.rawValue)
      add(WoodlsCanvasA2UICommand.Push.rawValue)
      add(WoodlsCanvasA2UICommand.PushJSONL.rawValue)
      add(WoodlsCanvasA2UICommand.Reset.rawValue)
      add(WoodlsScreenCommand.Record.rawValue)
      if (cameraEnabled()) {
        add(WoodlsCameraCommand.Snap.rawValue)
        add(WoodlsCameraCommand.Clip.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(WoodlsLocationCommand.Get.rawValue)
      }
      if (smsAvailable()) {
        add(WoodlsSmsCommand.Send.rawValue)
      }
      if (BuildConfig.DEBUG) {
        add("debug.logs")
        add("debug.ed25519")
      }
      add("app.update")
    }

  fun buildCapabilities(): List<String> =
    buildList {
      add(WoodlsCapability.Canvas.rawValue)
      add(WoodlsCapability.Screen.rawValue)
      if (cameraEnabled()) add(WoodlsCapability.Camera.rawValue)
      if (smsAvailable()) add(WoodlsCapability.Sms.rawValue)
      if (voiceWakeMode() != VoiceWakeMode.Off && hasRecordAudioPermission()) {
        add(WoodlsCapability.VoiceWake.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(WoodlsCapability.Location.rawValue)
      }
    }

  fun resolvedVersionName(): String {
    val versionName = BuildConfig.VERSION_NAME.trim().ifEmpty { "dev" }
    return if (BuildConfig.DEBUG && !versionName.contains("dev", ignoreCase = true)) {
      "$versionName-dev"
    } else {
      versionName
    }
  }

  fun resolveModelIdentifier(): String? {
    return listOfNotNull(Build.MANUFACTURER, Build.MODEL)
      .joinToString(" ")
      .trim()
      .ifEmpty { null }
  }

  fun buildUserAgent(): String {
    val version = resolvedVersionName()
    val release = Build.VERSION.RELEASE?.trim().orEmpty()
    val releaseLabel = if (release.isEmpty()) "unknown" else release
    return "WoodlsAndroid/$version (Android $releaseLabel; SDK ${Build.VERSION.SDK_INT})"
  }

  fun buildClientInfo(clientId: String, clientMode: String): GatewayClientInfo {
    return GatewayClientInfo(
      id = clientId,
      displayName = prefs.displayName.value,
      version = resolvedVersionName(),
      platform = "android",
      mode = clientMode,
      instanceId = prefs.instanceId.value,
      deviceFamily = "Android",
      modelIdentifier = resolveModelIdentifier(),
    )
  }

  fun buildNodeConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "node",
      scopes = emptyList(),
      caps = buildCapabilities(),
      commands = buildInvokeCommands(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "woodls-android", clientMode = "node"),
      userAgent = buildUserAgent(),
    )
  }

  fun buildOperatorConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "operator",
      scopes = listOf("operator.read", "operator.write", "operator.talk.secrets"),
      caps = emptyList(),
      commands = emptyList(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "woodls-control-ui", clientMode = "ui"),
      userAgent = buildUserAgent(),
    )
  }

  fun resolveTlsParams(endpoint: GatewayEndpoint): GatewayTlsParams? {
    val stored = prefs.loadGatewayTlsFingerprint(endpoint.stableId)
    return resolveTlsParamsForEndpoint(endpoint, storedFingerprint = stored, manualTlsEnabled = manualTls())
  }
}
