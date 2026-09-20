# Coins Economy Plan

> **Status: PARKED** — post-launch, alongside `LEADERBOARD_IDEA.md` and
> `ONLINE_MULTIPLAYER_PLAN.md`. Design principles agreed up front so we never drift.

## 1. Design principles (the anti-gamble charter)

1. **Coins are earned by playing, not the only way to play.** Every game is fully
   playable with zero coins. Coins buy convenience and cosmetics — never core access.
2. **No loot boxes, no random paid rewards, no timers that starve the player.**
   If a paid element has chance involved, it does not get sold for real money.
3. **No hard paywalls and no "energy" system.** Ads + coins cover everything;
   IAP is a shortcut and a thank-you, not a key.
4. **Every coin transaction is explicit.** No misleading buttons, no double-tap
   traps, no "watch ad to continue" guilt loops. One clear prompt, easy cancel.
5. **Loss protection:** coins can never be lost by accident — spend dialogs state
   exactly what is spent and what is received.

## 2. Earning (watch ads / play)

| Source | Amount | Cap |
|---|---|---|
| Rewarded ad ("Get 25 coins") in game over / menu | 25 | 5/day (ads stay a choice, not a job) |
| Finishing a game (any result) | 5 | — |
| Daily return bonus | 10 | 1/day |
| Win streaks / high score milestones | bonus 10–50 | per-game events |

- Offline earns still count (shell tracks offline score already); ads obviously
  require network → reuse the offline guard from the ad flow.
- Rates live in one `Economy.kt` config so balancing never touches games.

## 3. Spending (kept gentle)

- **Cosmetics first:** dice skins, tile/board themes, avatar frames (Ludo pieces).
- **Convenience:** one "undo" in Planet-merge-style games, one extra life in a
  single-player run (never in PvP).
- **Entry fees only for optional prize rooms** (Phase B with multiplayer):
  small coin entry, winner takes a pot. Never required, never cash-out — that keeps
  us clearly out of gambling territory (no real-money value, no paid entry).
- **IAP (later):** coin packs + one "remove ads" + a one-time "supporter" pack.
  Prices low, honest, no "best value!" pressure patterns.

## 4. Wallet architecture

- Single source of truth in the **shell** (`Coins.kt` over SharedPreferences),
  exposed to games via `NativeBridge.getCoins()/addCoins()/spendCoins()`.
  Games never own the balance — the shell approves every transaction, which also
  gives us one audit log and simple cheat reduction.
- Balance + lifetime stats survive reinstalls only when we add Play Cloud Save
  (Phase B; note in leaderboard plan).
- All coin UI in games uses the shell's visual language (rounded, cream/green).

## 5. Where it plugs in

1. Home header gets a small coin chip (tap → "How to earn" sheet: honest, readable).
2. `NativeBridge` + `Coins.kt` (no games changed) — prove it with a debug row in
   Settings (dev mode only).
3. Ludo: cosmetic dice skins as the first spend; rewarded-ad earn button on the
   game-over screen.
4. Later: prize rooms (with multiplayer), IAP, Play Cloud Save.

## 6. Policy notes (Play Store)

- Disclose ads-for-coins in the Data Safety form; rewarded ads are fine.
- No coin purchases are consumable in ways that mimic gambling (no cash-out ever).
- IAP coin packs must use Play Billing (no side channels) — standard.
