import Foundation
import Testing
@testable import Woodls

@Suite(.serialized)
struct WoodlsConfigFileTests {
    @Test
    func configPathRespectsEnvOverride() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("woodls-config-\(UUID().uuidString)")
            .appendingPathComponent("woodls.json")
            .path

        await TestIsolation.withEnvValues(["WOODLS_CONFIG_PATH": override]) {
            #expect(WoodlsConfigFile.url().path == override)
        }
    }

    @MainActor
    @Test
    func remoteGatewayPortParsesAndMatchesHost() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("woodls-config-\(UUID().uuidString)")
            .appendingPathComponent("woodls.json")
            .path

        await TestIsolation.withEnvValues(["WOODLS_CONFIG_PATH": override]) {
            WoodlsConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "ws://gateway.ts.net:19999",
                    ],
                ],
            ])
            #expect(WoodlsConfigFile.remoteGatewayPort() == 19999)
            #expect(WoodlsConfigFile.remoteGatewayPort(matchingHost: "gateway.ts.net") == 19999)
            #expect(WoodlsConfigFile.remoteGatewayPort(matchingHost: "gateway") == 19999)
            #expect(WoodlsConfigFile.remoteGatewayPort(matchingHost: "other.ts.net") == nil)
        }
    }

    @MainActor
    @Test
    func setRemoteGatewayUrlPreservesScheme() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("woodls-config-\(UUID().uuidString)")
            .appendingPathComponent("woodls.json")
            .path

        await TestIsolation.withEnvValues(["WOODLS_CONFIG_PATH": override]) {
            WoodlsConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "wss://old-host:111",
                    ],
                ],
            ])
            WoodlsConfigFile.setRemoteGatewayUrl(host: "new-host", port: 2222)
            let root = WoodlsConfigFile.loadDict()
            let url = ((root["gateway"] as? [String: Any])?["remote"] as? [String: Any])?["url"] as? String
            #expect(url == "wss://new-host:2222")
        }
    }

    @Test
    func stateDirOverrideSetsConfigPath() async {
        let dir = FileManager().temporaryDirectory
            .appendingPathComponent("woodls-state-\(UUID().uuidString)", isDirectory: true)
            .path

        await TestIsolation.withEnvValues([
            "WOODLS_CONFIG_PATH": nil,
            "WOODLS_STATE_DIR": dir,
        ]) {
            #expect(WoodlsConfigFile.stateDirURL().path == dir)
            #expect(WoodlsConfigFile.url().path == "\(dir)/woodls.json")
        }
    }

    @MainActor
    @Test
    func saveDictAppendsConfigAuditLog() async throws {
        let stateDir = FileManager().temporaryDirectory
            .appendingPathComponent("woodls-state-\(UUID().uuidString)", isDirectory: true)
        let configPath = stateDir.appendingPathComponent("woodls.json")
        let auditPath = stateDir.appendingPathComponent("logs/config-audit.jsonl")

        defer { try? FileManager().removeItem(at: stateDir) }

        try await TestIsolation.withEnvValues([
            "WOODLS_STATE_DIR": stateDir.path,
            "WOODLS_CONFIG_PATH": configPath.path,
        ]) {
            WoodlsConfigFile.saveDict([
                "gateway": ["mode": "local"],
            ])

            let configData = try Data(contentsOf: configPath)
            let configRoot = try JSONSerialization.jsonObject(with: configData) as? [String: Any]
            #expect((configRoot?["meta"] as? [String: Any]) != nil)

            let rawAudit = try String(contentsOf: auditPath, encoding: .utf8)
            let lines = rawAudit
                .split(whereSeparator: \.isNewline)
                .map(String.init)
            #expect(!lines.isEmpty)
            guard let last = lines.last else {
                Issue.record("Missing config audit line")
                return
            }
            let auditRoot = try JSONSerialization.jsonObject(with: Data(last.utf8)) as? [String: Any]
            #expect(auditRoot?["source"] as? String == "macos-woodls-config-file")
            #expect(auditRoot?["event"] as? String == "config.write")
            #expect(auditRoot?["result"] as? String == "success")
            #expect(auditRoot?["configPath"] as? String == configPath.path)
        }
    }
}
