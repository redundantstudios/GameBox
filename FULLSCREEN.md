# Full Screen on Phones with a Camera Hole

How the shell makes a game cover the **whole** display on a phone with a
punch-hole / notch camera - and why the obvious fix does not work.

Measured on the **OPPO CPH2219 (A55, ColorOS, Android 13)**, the test
device, in landscape.

---

## The symptom

The player reported: *"the game is not playing in full screen but my shell
is full screen ... it is showing the front camera"*.

The portrait shell screens were full screen. The **landscape** game was not:
it ran in a strip with a dead band on the left, and the camera punch-hole
sat in that band instead of over the game.

The band was exactly the width of the cutout:

```
$ adb shell dumpsys window windows
Frames: parent=[115,0][2400,1080] display=[115,0][2400,1080]
        frame=[115,0][2400,1080]                       ← 115px = the cutout width
mFullConfiguration=... mAppBounds=Rect(115, 0 - 2400, 1080)   ← same band
```

and the game itself was 115px narrower than the screen:

```
[MO] ... vp=896x423     ← 896 css x 2.55 = 2285 device px (2400 - 115)
```

## Why it happens

The camera hole of this phone is a **corner** cutout. In portrait the hole is
on the display's **short** edge, and Android leaves that edge alone - which is
why the portrait shell is full screen. In **landscape** the same hole ends up
on a **long** edge, and the platform then letterboxes the app away from it.

The platform decides this per window, from the window's
`layoutInDisplayCutoutMode`:

| mode | meaning |
|---|---|
| `DEFAULT` (0) | avoid the cutout on every edge that has one |
| `SHORT_EDGES` (1) | may extend into the cutout on short edges only (in landscape: left/right) |
| `ALWAYS` (3, API 30+) | may extend into the cutout, always |

## What does NOT work (measured, not assumed)

The documented cure is `layoutInDisplayCutoutMode = ALWAYS`. The shell sets
it, in the theme **and** in code:

* `app/src/main/res/values/themes.xml` - `Theme.Shell.Game` carries
  `<item name="android:windowLayoutInDisplayCutoutMode">always</item>`
* `GameWindow.applyCutoutMode(window)` sets the same value on the window's
  attributes (`ALWAYS` on API 30+, `SHORT_EDGES` below).

**On this ROM the value never reaches the party that decides the frame.**

Measured, step by step:

1. The app-side value is accepted - the readback is `3` (`ALWAYS`).
2. The window manager's own copy of the window's attributes stays at
   `DEFAULT`. `dumpsys window windows` prints the field only when it is not
   the default, and for our window it prints **nothing**.
3. The *same* parcel carries other changes of ours correctly - the flags
   `LAYOUT_NO_LIMITS` and the cleared `LAYOUT_INSET_DECOR` do show up in the
   window manager's copy - so this is not a transport problem.
4. `SHORT_EDGES` (1) is dropped exactly the same way, so it is not a
   "wrong constant" problem.
5. The window's frame is clipped **client-side** (AOSP 12+ computes the
   frame in the app process, in `WindowLayout.computeFrames`, and skips the
   cutout only for `ALWAYS`), so the client has to have the value too - and
   the client's copy is taken from the attributes at window creation.

So: the ROM drops one field of the window's attributes for this app, and
with it the ability to draw into the camera hole.

## What does work

**Give the window the display's real size, and shift it so its left edge sits
on the true edge of the screen.**

`GameWindow.fitWindowToDisplay(window)`:

```kotlin
val display = wm.currentWindowMetrics.bounds        // 2400x1080
val appW    = ctx.resources.displayMetrics.widthPixels // 2285 (app bounds)
val band    = display.width() - appW                 // 115 - the reserved strip
lp.width  = display.width()
lp.height = display.height()
lp.x      = -Math.round(band / 2f)                  // -58
window.attributes = lp
```

The platform *centres* a window that is wider than its parent bounds, so the
offset that puts the left edge on the screen is half the reserved strip.
`FLAG_LAYOUT_NO_LIMITS` (also set) lets the window reach past the app bounds
in the first place.

Result on the same phone:

```
$ adb shell dumpsys window windows
Frames: frame=[0,0][2400,1080]          ← was [115,0][2400,1080]
[MO] ... vp=941x423                     ← was 896x423: 941 x 2.55 = 2400
```

The game now draws edge to edge, **behind** the camera hole, which is what
"full screen" has to mean on a phone with a punch-hole. The camera itself
still sits on top of the game, as the hardware demands.

In **portrait** the function puts the window back to `MATCH_PARENT`: the
platform leaves the short edge alone, so there is nothing to fight there.

## Where the code lives

| file | what it does |
|---|---|
| `app/src/main/java/com/redundantstudios/arcade/util/GameWindow.kt` | `goEdgeToEdge` (bars), `applyCutoutMode` (the cutout declaration + flags), `applyCutoutModeToView` (pushes the declaration into the view root), `fitWindowToDisplay` (the fix) |
| `app/src/main/java/com/redundantstudios/arcade/GameActivity.kt` | calls them: before `super.onCreate()` (the decor is created there), after `setContentView()`, and after every configuration change |
| `app/src/main/res/values/themes.xml` | `Theme.Shell.Game` declares `windowLayoutInDisplayCutoutMode=always` (belt to the braces for ROMs that do honour it) |

## Notes for other games

The fix is in the **shell**, not in a game, so every game in the app gets it.
A game that wants to know how much room it really has can read
`window.innerWidth / innerHeight` - after the fix those are the full screen
(941x423 css on the test phone), not the letterboxed area.

If a game is still short of the edges, check that it does not reserve the
band itself (a `--safe-left` / `env(safe-area-inset-*)` padding) and that it
does not set its own letterbox.

## How to verify after any change

```cmd
adb shell dumpsys window windows | findstr /C:"frame="
```

The game window must read `frame=[0,0][2400,1080]`. A frame that starts at
`115` means the band is back.
