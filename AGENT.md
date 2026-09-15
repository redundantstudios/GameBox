# Agent Protocol - Redundant Arcade

## Review Request Standards
Every REVIEW REQUEST must strictly separate verified technical facts from visual requirements:
- **Verified in Code**: List specific logic, file changes, and logs that prove the implementation.
- **Director Must Verify Visually**: Provide an explicit checklist of UI/UX behaviors the user must verify on-device (e.g., "Check that tiles are exactly 1:0.92 ratio").

## Regression Gating
Every new phase must begin by re-running the acceptance checks of the previous phase.
1. Run previous phase's build and test suite.
2. Report "Pass/Fail" for each previous core requirement.
3. Proceed to new implementation only after regression is cleared.

## Build Pipeline
The ONLY build command is `BUILD.bat`.
Every build ends with a fresh `shell-debug.apk` in the project root — its timestamp is the proof of freshness. Never install an APK without checking its timestamp first:
`adb shell date` vs `dir shell-debug.apk`

## Build Gate
NO phase may end its REVIEW REQUEST without a passing `BUILD.bat` + fresh APK timestamp. A phase that does not compile did not happen.
