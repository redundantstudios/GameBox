# 💡 Future Idea — Global Leaderboards (post-shell-launch)

> Parked idea from Srinu, 20 Sept 2026. **Do not start this before the shell launches.**

## The pitch
- Games like **Planet Merge** (single-player, score-based games) get a **global leaderboard**.
- Each entry shows: **name · score · rank · nationality (flag)**.

## How we imagine it working
- **Nationality** is set once in the shell app — ideally asked at/around first launch
  (Play Store install time is what Srinu wants to explore; realistically that means a
  first-launch prompt in the shell, since Play gives us no install-time data hook).
- **Offline scoring:** the game always tracks the **highest score locally**, even fully
  offline. When the device comes online, the best score syncs up and the player's rank
  resolves.
- **Online viewing:** the leaderboard is only shown when the player is online
  (offline can still show local-best / cached snapshot).
- Needs a **leaderboard layer/plan** of its own — backend service, anti-cheat for score
  submission, name moderation, and a privacy angle (nationality is personal-ish data →
  needs consent + a Play Data Safety declaration).

## Open questions for when we pick this up
1. Backend: Firebase (fastest) vs. Play Games Services vs. our own API.
2. Score submission trust: client-reported scores are spoofable — signed session
   checksums or server-replay validation needed for "real" rankings.
3. Anonymous vs. account: guest names + device ID first, or Google sign-in?
4. Does nationality come from SIM/locale auto-detect with manual override?
5. Per-game leaderboards vs. one shell-wide profile.

**Verdict for now:** great post-launch feature. Ship the shell first.
