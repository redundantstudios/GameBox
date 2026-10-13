# Plan: In-app updates + notification expansion

Status: researched 2026-10-13. Nothing implemented yet - this is the plan.

## Where the app stands today

| Piece | State |
|---|---|
| `versionCode` / `versionName` | `1` / `"1.0"` in `app/build.gradle` (fresh Play listing) |
| Play Core in-app update | **not present** - `app-update-ktx` is not a dependency |
| Google maven repo | present (`google()` in both `build.gradle` files), so the artifact resolves |
| Notification channels | `CH_DAILY`, `CH_STREAK`, `CH_NEWS`, `CH_DEV` in `NotificationChannels.kt` |
| Daily reminder | `DailyReminderWorker.kt` + `ReminderScheduler.kt` (WorkManager, 24h periodic) |
| Prefs | `SettingsManager.kt`, store `studio_settings` |
| Deep links | `MainActivity.EXTRA_NOTIF_ROUTE` -> `"home"` or `"game:<id>"` |

## Verified API behaviour (from the current Play docs)

Checked against developer.android.com/guide/playcore/in-app-updates, not memory.

- `AppUpdateManagerFactory.create(context).appUpdateInfo` -> `UpdateAvailability.UPDATE_AVAILABLE`.
- Two flow types. **Immediate** is full-screen: Play shows its own confirmation, and if the
  user accepts, Play downloads, installs and restarts the app. **Flexible** lets the user keep
  playing while it downloads; we then call `completeUpdate()`.
- *"If the user closes or terminates the app during the update, the update should continue to
  download and install in the background without additional user confirmation."* - but this only
  applies **after the user has already accepted**.
- `UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS` means a flow we started was
  interrupted. Every entry point must re-check and resume it.
- Immediate flow results: `RESULT_OK`, `RESULT_CANCELED`, `ActivityResult.RESULT_IN_APP_UPDATE_FAILED`.
- Each `AppUpdateInfo` instance may start a flow **once only** - a retry needs a fresh fetch.
- Library: `com.google.android.play:app-update-ktx:2.1.0` (latest published; `app-update` 2.1.0).

## The honest constraint, stated up front

**There is no API that silently installs an update the user has not agreed to.** Play Core only
gives us "ask, and then act on the answer". So "if they did not confirm, update automatically in
the background" cannot be delivered literally.

What is achievable, and is what I propose to build:

| User's phrasing | What actually happens |
|---|---|
| Pop up when a new version exists | Our own dialog, on a safe screen. Play's dialog only after they tap Update. |
| They do not confirm | We do not nag on that screen. We re-arm and ask again on the next cold start, and a notification nudges them. |
| Update automatically in the background | Once they have accepted once, Play finishes the download/install in the background even if they close the app. Before that, background install is not ours to trigger. |
| Pop up when it completes | Detected on the next cold start by comparing `BuildConfig.VERSION_CODE` against a stored value, because Play kills and restarts the process. |

If you want a true silent path, the only lever is Play Store's own auto-update setting, which
belongs to the user, not to us. I will not pretend otherwise in the UI copy.

## Design

### 1. `AppUpdate.kt` (new, `util/`) - all Play Core contact

Single owner for the library so nothing else imports it:

```kotlin
object AppUpdate {
    fun check(activity: Activity, onState: (State) -> Unit)
    fun start(activity: Activity, launcher: ActivityResultLauncher<IntentSenderRequest>)
    enum class State { Unavailable, UpToDate, Available, Downloading, Failed }
}
```

- `Unavailable` when Play Store is missing or the package was never installed from Play.
- `isUpdateTypeAllowed(IMMEDIATE)` is checked before offering; if Play only allows flexible we
  fall back to flexible rather than showing a button that cannot work.

### 2. Version bookkeeping (`SettingsManager`)

- `KEY_LAST_SEEN_VERSION` (Int), written on every successful cold start.
- `KEY_UPDATE_PROMPTED_VERSION` (Int) - which versionCode we have already nagged about, so we
  prompt once per release rather than on every launch.
- `KEY_UPDATE_COMPLETED_SHOWN` (Boolean) - so the completion popup shows once.

### 3. Update-available popup (our own dialog)

`dialog_update.xml` matching the shell's chunky-border style:

- Kicker `NEW VERSION`, title `Update ready`, body `New games and fixes are waiting.`
- Buttons: **Update now** (starts IMMEDIATE flow), **Later** (dismiss; re-arms for next launch).

Guardrails:
- Only ever shown on the home screen, never mid-game. Starting an immediate flow kills the UI.
- Rate-limited to once per `versionCode`, plus a minimum gap (say 3 days) before re-asking.
- Respects `DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS` by resuming rather than restarting.

### 4. Update-complete popup

On cold start, before `setContentView`:

```kotlin
val seen = SettingsManager.lastSeenVersion
if (seen in 1 until BuildConfig.VERSION_CODE && !SettingsManager.updateCompletedShown) {
    SettingsManager.lastSeenVersion = BuildConfig.VERSION_CODE
    SettingsManager.updateCompletedShown = true
    // queue the "What's new" dialog once the home screen is up
}
```

Body deliberately generic - *"New games just landed"* - as requested, no per-game listing.
A "See what's new" button deep-links to the games grid via the existing route mechanism.

### 5. Notification: update available

New channel `CH_UPDATE` (`IMPORTANCE_DEFAULT`, marimba chime to match the rest).

A periodic WorkManager job (`UpdateCheckWorker`, every 6h) calls `AppUpdateManager` and posts
once per `versionCode`. `AppUpdate` needs a `Context`, not an `Activity`, for the *check* -
only the *flow* needs an Activity - so this is safe off the main thread.

Suppressed when: `AppUpdate.State.Unavailable`, the user has no notification permission, or
`KEY_UPDATE_PROMPTED_VERSION` already equals the offered version.

### 6. Notification: update complete

A manifest-registered receiver for `android.intent.action.MY_PACKAGE_REPLACED` posts
*"Update finished - new games inside"* straight after Play installs, so the user hears about it
even if they do not reopen the app immediately. Cold-start detection remains as the backstop.

### 7. Ten daily notifications

`DailyReminderWorker` currently posts one fixed challenge card. Change:

- Add `DailyMessages.kt`: 10 title/body pairs, each with a `game:<id>` or `home` route.
- Selection is **deterministic per day** (`dayIndex % 10`) so a retry cannot double-post a
  different message, and a re-render never reshuffles.
- The existing hard skips stay exactly as they are: reminders off, no permission, opened today,
  already nudged today, quiet hours 21:30-09:00, no games.
- `CH_STREAK` keeps its current behaviour - it is a separate, state-driven notification and
  should not be folded into the rotation.

Draft ten (titles / bodies), all short, none clickbait:

1. "Take a break" / "Two minutes is all it takes."
2. "Your board is waiting" / "One round, then back to it."
3. "Beat your best" / "One run to try to beat it."
4. "New personal best?" / "The old one will not hold."
5. "Quick game?" / "No download, no waiting - just tap."
6. "Streak alive" / "Do not let it lapse tonight."
7. "Something to unwind with" / "One clean round does it."
8. "Your seat is warm" / "The arcade kept your place."
9. "Fancy a rematch?" / "Same board, better hands."
10. "One more for the road" / "Then back to whatever you were doing."

## Build order

Each step is independently shippable and verifiable.

1. Add the dependency + `AppUpdate` object + version prefs. Verify: compiles, `UpToDate` on a
   sideloaded build, no crash when Play Store is absent.
2. Update-available popup + rate limiting. Verify: bump `versionCode`, open from an internal
   track, confirm the dialog appears once and not again after "Later".
3. Resume handling for `DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS`. Verify: kill the app mid-flow,
   reopen, confirm it resumes instead of showing a second dialog.
4. Update-complete detection + popup. Verify: complete a real update, confirm the popup names
   new games exactly once.
5. `MY_PACKAGE_REPLACED` receiver + `CH_UPDATE` channel. Verify: post the "update finished"
   notification from a real install.
6. `UpdateCheckWorker` background check.
7. `DailyMessages` + rotation in `DailyReminderWorker`. Verify: 10 consecutive days produce 10
   distinct messages; skips unchanged.

## Testing constraint - read before starting

**In-app updates cannot be exercised on a sideloaded APK.** Play Core only reports an available
update for a package installed from Google Play. Every `./deploy.bat` build is a sideload, so on
those the feature will always report `Unavailable` - which is the correct behaviour, but it means
steps 2-6 are unverifiable locally.

To test properly:
- Upload to an **internal testing** track, install from Play on the device, then push a second
  build with a higher `versionCode` to the same track.
- Real ad units would show; keep test unit IDs for the ad surfaces.
- Worth adding a debug-only override (`SettingsManager.forceUpdateState`) so the *popups* can be
  rehearsed on a sideload without a real update in flight.

## Risks

| Risk | Mitigation |
|---|---|
| Immediate flow is full-screen and restarts the app | Only from the home screen, never mid-game |
| Prompt fatigue | Once per `versionCode`, plus a 3-day floor |
| Completion popup never fires | `MY_PACKAGE_REPLACED` receiver + cold-start backstop |
| Play Store not present (sideload, some markets) | `State.Unavailable` everywhere, no crash, no prompt |
| Notification spam | Workers keep every existing hard skip; new channel is separate so users can mute it alone |
| `app-update-ktx` unmaintained since 2023 | Still the supported path; pin to 2.1.0 |

## Not in this plan

- Remote config / server-driven content. Everything stays local, as the notification ground
  rules already require.
- Per-game release notes in the completion popup. Deliberately generic, as requested.
- The deferred **Orrery / Ember / Connect Four lag**. Separate task.