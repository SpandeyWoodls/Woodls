import CoreLocation
import Foundation
import WoodlsKit
import UIKit

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: WoodlsCameraSnapParams) async throws -> (format: String, base64: String, width: Int, height: Int)
    func clip(params: WoodlsCameraClipParams) async throws -> (format: String, base64: String, durationMs: Int, hasAudio: Bool)
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: WoodlsLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: WoodlsLocationGetParams,
        desiredAccuracy: WoodlsLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: WoodlsLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

protocol DeviceStatusServicing: Sendable {
    func status() async throws -> WoodlsDeviceStatusPayload
    func info() -> WoodlsDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: WoodlsPhotosLatestParams) async throws -> WoodlsPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: WoodlsContactsSearchParams) async throws -> WoodlsContactsSearchPayload
    func add(params: WoodlsContactsAddParams) async throws -> WoodlsContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: WoodlsCalendarEventsParams) async throws -> WoodlsCalendarEventsPayload
    func add(params: WoodlsCalendarAddParams) async throws -> WoodlsCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: WoodlsRemindersListParams) async throws -> WoodlsRemindersListPayload
    func add(params: WoodlsRemindersAddParams) async throws -> WoodlsRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: WoodlsMotionActivityParams) async throws -> WoodlsMotionActivityPayload
    func pedometer(params: WoodlsPedometerParams) async throws -> WoodlsPedometerPayload
}

struct WatchMessagingStatus: Sendable, Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchNotificationSendResult: Sendable, Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func sendNotification(
        id: String,
        title: String,
        body: String,
        priority: WoodlsNotificationPriority?) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
