# Notifications Plan — Redundant Arcade

Status: **PLANNED, not implemented.** Written 2026-09-20 after the shell UI pass
(`main @ 757fc6e`) so the work can be picked up without re-deciding anything.
Related: `HANDOFF.md`, `PROGRESS.md`, `STYLE.md`, `CONTRACT.md`.

## Goal
Bring players back without ever feeling spammy: reminders that reference what they
actually played, plus one "new game" announcement the day we ship a title.

## Ground rules (non-negotiable)
1. **100% local.** No FCM, no server, no analytics backend. Scheduling = WorkManager +
   SharedPreferences. (If we ever want remote campaigns, FCM is a *later* additive step.)
2. **Never while playing.** Nothing is posted while the app is in the foreground, and a
   notification is skipped entirely if the user already opened the shell that day.
3. **Max 1 re-engagement notification per day.** A 24h "already sent" stamp enforces it
   even if the worker is retried.
4. **Quiet hours 21:30 -> 09:00**, computed locally from the device clock.
5. **Every notification deep-links** into the shell (Home / All Games / a specific game).
6. **Ask for permission once, contextually.** Not on first launch. If the user declines,
   never auto-ask again - the Settings row opens the OS notification settings instead.

## Channels (Android 8+)
Stable ids - never rename, they are per-install state.

| id | name | importance | purpose | default |
|---|---|---|---|---|
| `arcade_daily` | Daily challenge | DEFAULT | "today's challenge is ready" | on |
| `arcade_streak` | Come back and play | DEFAULT | streak save / "your board misses you" | on |
| `arcade_news` | New games & news | LOW | new title shipped, version news | on |
| `arcade_dev` | Developer tests | MIN | test notification (developer mode only) | off |

## Permission (Android 13+ / API 33)
- Manifest: `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`.
- On API < 33 the permission is implicitly granted; still check
  `NotificationManagerCompat.areNotificationsEnabled()`.
- Ask **after the first completed game** (task-completion moment = best opt-in rate),
  never on first launch: a small explainer card - "Want a nudge when a new challenge
  drops?" - with [Enable] / [Not now], then the real system dialog. `notif_prompt_shown`
  guarantees it happens once.

## Where the state lives (`SettingsManager`)
| pref | type | meaning |
|---|---|---|
| `reminders_enabled` | boolean | master switch (default true; nothing fires without permission) |
| `reminder_slot` | string | `Morning` / `Afternoon` / `Evening` -> 09:30 / 15:30 / 19:30 |
| `news_enabled` | boolean | new-game announcements |
| `last_open_day` | string | `yyyy-MM-dd`, written in `MainActivity.onResume()` |
| `last_notif_day` | string | `yyyy-MM-dd` of the last posted re-engagement notification |
| `last_news_game_id` | string | last game id we announced |
| `notif_prompt_shown` | boolean | one-shot permission explainer |
| `games_played` / `streak_days` | int | content personalisation + milestones |

## Scheduling
- Dependency: `androidx.work:work-runtime-ktx:2.9.x` (small, survives reboot and Doze).
- `ReminderScheduler.schedule(context)`: a `PeriodicWorkRequest` (24h, 1h flex) with an
  initial delay computed to land on the chosen slot; unique work name
  `arcade_daily_reminder`, `ExistingPeriodicWorkPolicy.UPDATE`.
- Reschedule on every relevant settings change; `cancelUniqueWork` when reminders are off.
- **No exact alarms** - a reminder does not need `SCHEDULE_EXACT_ALARM` (a restricted
  permission on Android 12+). Inexact is correct here.

`DailyReminderWorker.doWork()` decides (all checks inside the worker, not at schedule time):
1. `reminders_enabled` -> else `Result.success()`.
2. Notifications enabled at OS level -> else success (no retry loop, no API spam).
3. `last_open_day == today` -> user already played, skip.
4. `last_notif_day == today` -> already nudged, skip.
5. Inside quiet hours -> skip.
6. At least one game installed (`ManifestParser.scanGames` non-empty) -> else skip.
7. Pick content by priority: **streak save** (`streak_days >= 2`, not played today) ->
   **daily challenge** (fallback). Post, stamp `last_notif_day`, `Result.success()`.

## Content
- Daily challenge: "Today's Ludo challenge is ready" / "One board, beat it in one roll."
  -> opens that game.
- Streak save: "Your 3-day streak ends tonight" / "Two minutes is all it takes." -> Home.
- New game: "Chess just landed in the arcade" -> opens the new game. Fires once per game
  id, when an id appears that is not `last_news_game_id` (checked on app start, not by the
  worker - news should not wait for the daily slot).
- Milestone (rare, max 1/month): "25 games played - the arcade salutes you."
- Personalisation: most played game id + the player count the user last used (both already
  derivable from the `studio_games` prefs / the launch path).

## Deep links
- `MainActivity` extras: `EXTRA_NOTIF_ROUTE` = `game:<id>` | `all_games` | `settings`.
- Read in `onCreate` **and** `onNewIntent` (already-running case), consume it once, then
  route through the existing path (`ModeActivity` / `GameActivity` with
  `ModeActivity.defaultPlayers(game)`).
- `PendingIntent` with `FLAG_IMMUTABLE`, a unique request code per notification id, and
  `TaskStackBuilder` so Back always lands on Home.
- Small icon must be a **silhouette** (monochrome status-bar icon): add
  `ic_notification.xml`; colour comes from `setColor(studio_primary)`.

## Settings surface (keep the calm one-row-per-setting direction)
New `NOTIFICATIONS` section:
- `Reminders` - ON/OFF pair (reuses `SelectCard`).
- `Reminder time` - Morning / Afternoon / Evening triple (reuses `SelectCard`).
- `New game news` - ON/OFF pair.
- `Send test notification` - **only visible with developer mode on** (same gating pattern
  as Ludo's `10X BOT TEST`), posts on `arcade_dev` immediately.

## Implementation order (each step independently verifiable)
1. Manifest permission + WorkManager dependency + `ic_notification.xml`.
2. `SettingsManager` prefs + getters/setters.
3. `NotificationChannels.kt` (channel creation).
4. `ArcadeNotifier.kt` (build + post + deep-link `PendingIntent` + dedupe stamp).
5. `ReminderScheduler.kt` + `DailyReminderWorker.kt`.
6. Write `last_open_day` from `MainActivity.onResume()`; call `schedule()` on app start.
7. Settings UI section + dev test button.
8. After-first-game permission explainer in `GameActivity`.
9. Deep-link routing in `MainActivity`.

## Verification
```cmd
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" shell dumpsys notification --noredact | Select-String arcade
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" shell dumpsys jobscheduler | Select-String arcade
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" logcat -d -s ArcadeNotify ReminderWorker
```
Acceptance for v1: the dev test notification posts; forcing the worker while
`reminders_enabled=false`, or after opening the app that day, posts **nothing**; tapping a
posted notification opens the intended screen and Back lands on Home; force-stopping the
app and rebooting still leaves the job scheduled.

## Open questions for the user
1. Permission timing: after the **first finished game** (proposed) or on first launch?
2. Default reminder slot: **Evening 19:30** (proposed), Morning or Afternoon?
3. Should "new game" announcements be automatic (proposed) or opt-in only?
4. Ship notifications **before** or **after** the Chess bundle lands?
