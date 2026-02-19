// swift-tools-version: 6.2
// Package manifest for the Woodls macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "Woodls",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "WoodlsIPC", targets: ["WoodlsIPC"]),
        .library(name: "WoodlsDiscovery", targets: ["WoodlsDiscovery"]),
        .executable(name: "Woodls", targets: ["Woodls"]),
        .executable(name: "woodls-mac", targets: ["WoodlsMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/WoodlsKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "WoodlsIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "WoodlsDiscovery",
            dependencies: [
                .product(name: "WoodlsKit", package: "WoodlsKit"),
            ],
            path: "Sources/WoodlsDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Woodls",
            dependencies: [
                "WoodlsIPC",
                "WoodlsDiscovery",
                .product(name: "WoodlsKit", package: "WoodlsKit"),
                .product(name: "WoodlsChatUI", package: "WoodlsKit"),
                .product(name: "WoodlsProtocol", package: "WoodlsKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/Woodls.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "WoodlsMacCLI",
            dependencies: [
                "WoodlsDiscovery",
                .product(name: "WoodlsKit", package: "WoodlsKit"),
                .product(name: "WoodlsProtocol", package: "WoodlsKit"),
            ],
            path: "Sources/WoodlsMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "WoodlsIPCTests",
            dependencies: [
                "WoodlsIPC",
                "Woodls",
                "WoodlsDiscovery",
                .product(name: "WoodlsProtocol", package: "WoodlsKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
