// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "WoodlsKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "WoodlsProtocol", targets: ["WoodlsProtocol"]),
        .library(name: "WoodlsKit", targets: ["WoodlsKit"]),
        .library(name: "WoodlsChatUI", targets: ["WoodlsChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "WoodlsProtocol",
            path: "Sources/WoodlsProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "WoodlsKit",
            dependencies: [
                "WoodlsProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/WoodlsKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "WoodlsChatUI",
            dependencies: [
                "WoodlsKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/WoodlsChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "WoodlsKitTests",
            dependencies: ["WoodlsKit", "WoodlsChatUI"],
            path: "Tests/WoodlsKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
