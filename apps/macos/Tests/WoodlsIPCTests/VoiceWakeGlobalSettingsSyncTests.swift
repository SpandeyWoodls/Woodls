import WoodlsProtocol
import Foundation
import Testing
@testable import Woodls

@Suite(.serialized) struct VoiceWakeGlobalSettingsSyncTests {
    @Test func appliesVoiceWakeChangedEventToAppState() async {
        let previous = await MainActor.run { AppStateStore.shared.swabbleTriggerWords }

        await MainActor.run {
            AppStateStore.shared.applyGlobalVoiceWakeTriggers(["before"])
        }

        let payload = WoodlsProtocol.AnyCodable(["triggers": ["woodls", "computer"]])
        let evt = EventFrame(
            type: "event",
            event: "voicewake.changed",
            payload: payload,
            seq: nil,
            stateversion: nil)

        await VoiceWakeGlobalSettingsSync.shared.handle(push: .event(evt))

        let updated = await MainActor.run { AppStateStore.shared.swabbleTriggerWords }
        #expect(updated == ["woodls", "computer"])

        await MainActor.run {
            AppStateStore.shared.applyGlobalVoiceWakeTriggers(previous)
        }
    }

    @Test func ignoresVoiceWakeChangedEventWithInvalidPayload() async {
        let previous = await MainActor.run { AppStateStore.shared.swabbleTriggerWords }

        await MainActor.run {
            AppStateStore.shared.applyGlobalVoiceWakeTriggers(["before"])
        }

        let payload = WoodlsProtocol.AnyCodable(["unexpected": 123])
        let evt = EventFrame(
            type: "event",
            event: "voicewake.changed",
            payload: payload,
            seq: nil,
            stateversion: nil)

        await VoiceWakeGlobalSettingsSync.shared.handle(push: .event(evt))

        let updated = await MainActor.run { AppStateStore.shared.swabbleTriggerWords }
        #expect(updated == ["before"])

        await MainActor.run {
            AppStateStore.shared.applyGlobalVoiceWakeTriggers(previous)
        }
    }
}
