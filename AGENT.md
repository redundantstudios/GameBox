# Agent Protocol - Redundant Arcade

## THE STANDING RULE — Feedback → Change → Build → Install → Test
This rule is permanent and applies to EVERY chat, EVERY task, EVERY turn. It
overrides any instinct to stop at "the change looks right".

1. **Take the feedback.** Every user report is a bug report or a change request.
   Treat it as authoritative. Do not re-litigate it, do not ask for proof, do not
   defer it to a later turn. "It works for me" never outranks what the user
   reports from their hand.
2. **Change according to it.** Implement the feedback exactly as asked. If the
   feedback is ambiguous, pick the reading that matches the words used, and say
   which reading you took.
3. **Build and install — always, in the same turn.** Run `DEPLOY.bat`. A change
   that is not on the device does not exist. Never end a turn with "let me know
   if that works" while an unbuilt fix is sitting in the working tree.
4. **Stop. The user tests and gives the next feedback.** That closes the loop.

**Never** end a turn with an applied-but-unbuilt change. **Never** report a fix
as done on the strength of code inspection alone when a build is possible.

### DO NOT TEST THE APP YOURSELF — the user does that
This is absolute. After `BUILD.bat` / `DEPLOY.bat` and the install, **stop.**

- **Do not** launch the app (`monkey`, `am start`, tapping through the shell).
- **Do not** drive the game, open a specific game, or navigate its screens.
- **Do not** sit and watch logcat for gameplay behaviour, and never open a game
  "just to check for console errors".
- The ONLY device commands allowed are the build/install pipeline itself:
  `adb devices` (to confirm a phone is present) and `adb install`, plus reading
  back what was packaged out of the built APK.

The user opens the app, plays it, and reports what they see. That report is the
test result. A launch-and-stare by the agent is not a substitute for it — it
buries the user in noise, and it has already happened once in this project.

Reading the built APK to confirm a change is *packaged* is fine and encouraged.
Playing the game to find out whether it *feels* right is the user's job, always.
If something looks risky, say so in the summary and let them look at it.

### When you DO need a log
If a user report describes a runtime failure and you need the log to diagnose it,
**ask them to reproduce it** and read the log they generate — or say plainly what
you need and why. Do not go and reproduce it yourself on their phone. This is how
the Bomb Relay rewarded-ad bug got found: the user reported the symptom, the log
was read, and the cause was a `_studioAdCb` vs `__studioAdCb` name mismatch that
dropped every reward silently. The log was the evidence — the diagnosis was still
theirs to trigger.

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

## Syntax Verification
All inlined JavaScript in HTML files must be verified for parse-ability before any build.
- Use the delivery gate script: `node -e "const fs=require('fs');const s=fs.readFileSync('path/to/file','utf8');const m=[...s.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];m.forEach((x,i)=>{try{new Function(x[1])}catch(e){console.log('SYNTAX FAIL script#'+i+': '+e.message);process.exit(1)}});console.log('ALL SCRIPTS PARSE OK')"`
- Any "SYNTAX FAIL" is a hard block on deployment.
- This check must be reported as "Pass" in the REVIEW REQUEST.

## Build Gate
NO phase may end its REVIEW REQUEST without a passing `BUILD.bat` + fresh APK timestamp. A phase that does not compile did not happen.
Every phase that adds new API calls must end with a compile check and quote the import lines added.
