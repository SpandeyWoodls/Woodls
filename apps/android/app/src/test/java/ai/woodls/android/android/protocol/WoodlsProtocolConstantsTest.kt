package ai.woodls.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class WoodlsProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", WoodlsCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", WoodlsCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", WoodlsCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", WoodlsCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", WoodlsCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", WoodlsCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", WoodlsCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", WoodlsCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", WoodlsCapability.Canvas.rawValue)
    assertEquals("camera", WoodlsCapability.Camera.rawValue)
    assertEquals("screen", WoodlsCapability.Screen.rawValue)
    assertEquals("voiceWake", WoodlsCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", WoodlsScreenCommand.Record.rawValue)
  }
}
