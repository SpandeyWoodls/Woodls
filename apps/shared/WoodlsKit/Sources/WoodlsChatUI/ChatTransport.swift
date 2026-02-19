import Foundation

public enum WoodlsChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(WoodlsChatEventPayload)
    case agent(WoodlsAgentEventPayload)
    case seqGap
}

public protocol WoodlsChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> WoodlsChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [WoodlsChatAttachmentPayload]) async throws -> WoodlsChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> WoodlsChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<WoodlsChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension WoodlsChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "WoodlsChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> WoodlsChatSessionsListResponse {
        throw NSError(
            domain: "WoodlsChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
