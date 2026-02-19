# OpenClaw → Woodls Rebrand Audit Report

**Date:** 2026-02-19
**Status:** 55% Content Complete (97% Paths Complete)
**Assessment:** NEEDS IMMEDIATE ATTENTION - Android build will fail

---

## Executive Summary

The rebrand from OpenClaw to Woodls is **partially complete**. File paths and directory structures have been systematically renamed (97% complete), but **file contents were not consistently updated**. This creates a critical **Android build failure** and several **macOS configuration issues**.

### Critical Issues

1. **Android (CRITICAL)**: 77 files in Woodls directories still have OpenClaw package declarations
2. **macOS (HIGH)**: Configuration keys and file paths still reference "openclaw"
3. **iOS (MEDIUM)**: Mostly complete, minor subsystem ID audit needed
4. **Root (LOW)**: User documentation is complete, internal configs need audit

### Effort to Complete

- **P0 (Blocking):** 3 hours
- **P1 (Functional):** 8 hours
- **P2 (Polish):** 5 hours
- **Total:** ~16 hours to full completion

---

## Platform-by-Platform Analysis

### Android Apps (apps/android/)

#### Paths: 95% Complete ✓

- All OpenClaw packages deleted from version control
- 77 files successfully moved to `ai/woodls/android/` structure
- Directory layout matches Woodls naming: `ai.woodls.android.*`

#### Contents: 0% Complete ✗ CRITICAL ISSUE

**Problem:** Files moved but not rebranded

Every single file in the Woodls directory still declares:

```kotlin
package ai.openclaw.android      // Should be: ai.woodls.android
package ai.openclaw.android.gateway  // Should be: ai.woodls.android.gateway
package ai.openclaw.android.chat     // Should be: ai.woodls.android.chat
```

Example: `MainActivity.kt` at `/apps/android/app/src/main/java/ai/woodls/android/android/MainActivity.kt`

```kotlin
package ai.openclaw.android              // WRONG
import ai.openclaw.android.ui.RootScreen // WRONG
import ai.openclaw.android.ui.WoodlsTheme  // WRONG
```

**Scope:**

- All 77 main source files
- All 11 test files
- ~94 unrebranded import statements across the codebase

**Impact:**

- **Build Status:** Will not compile (package/directory mismatch)
- **Android Gradle:** Will fail with "package does not match directory" error
- **This is blocking Android development**

**Fix Required:**

```bash
# Global find-replace in all Android Kotlin files:
find apps/android -name "*.kt" -exec sed -i 's/package ai\.openclaw\.android/package ai.woodls.android/g' {} \;
find apps/android -name "*.kt" -exec sed -i 's/import ai\.openclaw\.android/import ai.woodls.android/g' {} \;
```

**Effort:** 2-3 minutes (automated)

---

### iOS Apps (apps/ios/)

#### Paths: 90% Complete ✓

- **Deleted:** OpenClawApp.swift
- **Created:** WoodlsApp.swift (properly named)
- **Renamed:** OpenClaw.entitlements → Woodls.entitlements
- **Renamed:** App bundle identifiers (ai.openclaw.ios → ai.woodls.ios)

#### Contents: 85% Complete ✓ MOSTLY OK

**What's correctly rebranded:**

- WoodlsAppDelegate class (was OpenClawAppDelegate)
- Logger subsystem: `ai.woodls.ios` ✓
- User-visible text: "Woodls" ✓
- Description strings: Updated ✓

**Remaining issues (minor):**

- Some Logger initializations might still reference old subsystems
- Internal module imports should be audited

**Impact:**

- **Build Status:** Should compile
- **Runtime:** Should work with possible minor logging issues
- **User Experience:** Good - branding is correct

**Fix Required:**

- Audit all Logger() calls for subsystem parameter
- Verify all bundle identifiers point to ai.woodls.ios

**Effort:** 1-2 hours (mostly review)

---

### macOS Apps (apps/macos/)

#### Paths: 100% Complete ✓

- **Moved:** Sources/OpenClaw/ → Sources/Woodls/ (380+ files)
- **Modules renamed:**
  - OpenClawLogging → WoodlsLogging
  - OpenClawIPC → WoodlsIPC
  - OpenClawMacCLI → WoodlsMacCLI
  - OpenClawDiscovery → WoodlsDiscovery
  - OpenClawProtocol → WoodlsProtocol
- **Icons renamed:** openclaw-mac.png → woodls-mac.png ✓
- **Entitlements renamed:** OpenClaw.entitlements → Woodls.entitlements ✓

#### Contents: 60% Complete ✓ PARTIALLY

**What's correctly rebranded:**

- UI title: "Woodls" (AboutSettings.swift:32) ✓
- UI descriptions: Updated ✓
- File names: All macOS source files renamed ✓
- Module structure: Woodls namespacing applied ✓

**What's STILL unrebranded (internal references):**

1. **UserDefaults keys** (HIGH PRIORITY - breaks functionality)
   - File: `Onboarding.swift`
   - Issue: `"openclaw.onboardingSeen"` should be `"woodls.onboardingSeen"`
   - Issue: `ProcessInfo+Woodls.swift` checks `"openclaw.nixMode"` should be `"woodls.nixMode"`
   - Impact: Nix mode detection won't work; onboarding state won't migrate

2. **File system paths** (HIGH PRIORITY)
   - Files: `OnboardingView+Pages.swift`, `OnboardingView+Wizard.swift`
   - Issue: References to `~/.openclaw/credentials/` should be `~/.woodls/credentials/`
   - Impact: Users upgrading will have broken credential paths

3. **Permission keys** (MEDIUM PRIORITY)
   - File: `PermissionManager.swift`
   - Issue: Uses `"openclaw-ok"` should be `"woodls-ok"`
   - Impact: Permission caching/validation won't work

4. **Process detection** (MEDIUM PRIORITY)
   - File: `PortGuardian.swift`
   - Issue: Looks for process named "openclaw", should detect "woodls"
   - Impact: Port conflict detection won't work correctly

5. **Installation commands** (MEDIUM PRIORITY)
   - File: `Onboarding.swift`
   - Issue: `npm install -g openclaw@` should be `npm install -g woodls@`
   - Impact: Users copy-pasting install command will try wrong package

6. **GitHub URLs** (LOW PRIORITY)
   - File: `AboutSettings.swift`
   - Issue: Points to `github.com/woodls/openclaw` should be `github.com/woodls/woodls`
   - Impact: Documentation/repo links broken

**Impact:**

- **Build Status:** Should compile
- **Runtime:** Configuration migration will fail on first launch
- **User Experience:** Broken for users upgrading from OpenClaw
- **Data Loss Risk:** Onboarding state won't transfer; credentials path broken

---

### Root Configuration Files

#### Status: 95% Complete ✓

**Correctly rebranded:**

- ✓ README.md - Full rebrand to Woodls terminology
- ✓ CHANGELOG.md - References "Woodls"
- ✓ Installation instructions point to `woodls` command
- ✓ Package names: @woodls/\*
- ✓ VISION.md - Rebranded

**Impact:**

- **User Experience:** Good - installation and docs are correct
- **Branding:** Consistent and professional

---

## Fix Priority and Effort Estimates

### P0: BLOCKING (3 hours total - must do first)

#### Task: Android Package Declarations (2-3 minutes)

**Files:** All 77 files in apps/android/app/src/main/java/ai/woodls/android/

Impact: Unblocks Android compilation testing

---

### P1: FUNCTIONAL (8 hours total - before release)

#### Tasks:

1. macOS UserDefaults Migration (4 hours) - Onboarding.swift, ProcessInfo+Woodls.swift
2. macOS File Paths (1-2 hours) - ~/.openclaw/ → ~/.woodls/
3. macOS Internal Strings (2 hours) - Permission keys, process detection, CLI commands

Impact: Unblocks macOS production use and user upgrades

---

### P2: POLISH (5 hours total - before GA)

#### Tasks:

1. iOS Logger Audit (2 hours)
2. GitHub URL Audit (1 hour)
3. Documentation and Comments (1 hour)

Impact: Final polish before general availability

---

## Overall Completion Matrix

| Platform    | Path Rename | Content Update | Build Status | Runtime Status |
| ----------- | ----------- | -------------- | ------------ | -------------- |
| Android     | 100%        | 0%             | BROKEN       | N/A            |
| iOS         | 90%         | 85%            | OK           | OK             |
| macOS       | 100%        | 60%            | OK           | BROKEN         |
| Root        | 100%        | 95%            | -            | OK             |
| **OVERALL** | **97%**     | **55%**        | **BLOCKED**  | **PARTIAL**    |

---

## Root Cause

This was a **file-move-only rebrand** where:

- Directory structure and filenames were renamed completely (97%)
- File contents were partially updated (55% average)
- Different platforms had different thoroughness (iOS better, Android worst)

Suggests different team members handled different platforms with inconsistent rigor.

---

## Recommendations

1. **Immediately:** Fix Android package declarations (2 min fix, unblocks testing)
2. **This week:** Complete macOS fixes (8h, unblocks production)
3. **Before GA:** Polish iOS and docs (5h)
4. **Test:** Full upgrade path testing (OpenClaw → Woodls)

Total time to completion: ~16 hours
