# Undercover — Category & Word Database Restructure

Before/after record for the UnderCover word database, category merge, free-tier
change and selection logic. Everything below was produced from
`Undercover_Production_Curated_Pairs.json` and the generated block inside
`UnderCover.html`; no word pair was invented, translated or replaced with a new
word.

---

## 1. At a glance

| | Before | After |
| --- | --- | --- |
| Categories | 41 | **22** |
| Word pairs | 2,023 | **1,976** |
| Free categories | 6 | **3** |
| Free pairs | 637 (31.5%) | **211 (10.7%)** |
| Locked pairs | 1,386 | **1,765 (89.3%)** |
| Duplicate pairs | 26 exact + 17 reversed across categories | **0** |
| Selection | flatten every pool, pick a pair | **pick a category, then a pair** |
| Data source | HTML block edited by hand | **JSON is authoritative; HTML is generated** |

Removed 47 pairs (30 exact, 17 reversed). Corrected 11 spelling / malformed
entries. No unique pair was removed.

Free tier (universal, no regional or entertainment vocabulary):

| Category | Pairs |
| --- | --- |
| `WORLD FOOD & FRUIT` | 34 |
| `ANIMALS & NATURE` | 118 |
| `EVERYDAY OBJECTS` | 59 |

Every Telugu, Indian, cinema, music, celebrity, sport, technology, place and
space category is locked by default.

---

## 2. Merge map — 41 → 22

| New category (`id`) | Pairs | Built from |
| --- | --- | --- |
| TELUGU CINEMA & CHARACTERS (`telugu-cinema`) | 217 | TELUGU CINEMA (176) + TELUGU MOVIE CHARACTERS (43) |
| TELUGU CELEBRITIES (`telugu-celebrities`) | 46 | TOLLYWOOD CELEBRITIES (46) |
| TELUGU FOOD (`telugu-food`) | 115 | ANDHRA/TELANGANA FOOD (116) |
| TELUGU CULTURE & SLANG (`telugu-culture`) | 117 | TELUGU STATES CULTURE & DAILY LIFE (86) + TELUGU RELATIONS & SLANG (44) |
| INDIAN CINEMA (`indian-cinema`) | 196 | SOUTH INDIAN CINEMA (103) + BOLLYWOOD (100) |
| INDIAN CELEBRITIES (`indian-celebrities`) | 62 | SOUTH INDIAN CELEBRITIES (31) + BOLLYWOOD CELEBRITIES (32) |
| HOLLYWOOD (`hollywood`) | 113 | HOLLYWOOD (113) |
| GLOBAL CELEBRITIES (`global-celebrities`) | 28 | FOREIGN CELEBRITIES (31) |
| WEB SERIES, OTT & ANIME (`screen-streaming`) | 87 | WEB SERIES & OTT (54) + ANIME (33) |
| MUSIC (`music`) | 108 | INDIAN MUSIC (57) + WESTERN MUSIC (51) |
| CRICKET (`cricket`) | 89 | CRICKET (90) |
| SPORTS & GAMES (`sports`) | 82 | SPORTS GENERAL (66) + SPORTS (18) + BOARD & PARTY GAMES (5) |
| INDIAN FOOD (`indian-food`) | 89 | INDIAN FOOD GENERAL (90) + INDIAN FOOD (5) |
| **WORLD FOOD & FRUIT (`world-food`)** *(free)* | 34 | GLOBAL FOOD (16) + FRUITS (18) |
| **ANIMALS & NATURE (`animals`)** *(free)* | 118 | ANIMALS & NATURE (53) + ANIMALS (42) + BIRDS (15) + OCEAN ANIMALS (11) + WEATHER & NATURE (7) |
| TECHNOLOGY & GADGETS (`technology`) | 91 | TECHNOLOGY & GADGETS (72) + TECHNOLOGY (24) |
| PROFESSIONS & JOBS (`professions`) | 90 | PROFESSIONS (90) |
| INDIA: PLACES & CITIES (`india-places`) | 150 | PLACES IN INDIA (66) + INDIAN CITIES (38) + ANDHRA/TELANGANA PLACES (48) |
| FESTIVALS OF INDIA (`festivals`) | 33 | FESTIVALS INDIA (34) |
| **EVERYDAY OBJECTS (`everyday`)** *(free)* | 59 | TRANSPORT (19) + CLOTHING (24) + HOME OBJECTS (4) + 12 household pairs moved from TELUGU CULTURE & SLANG |
| COLORS & SHAPES (`colors`) | 10 | COLORS & SHAPES (10) |
| SPACE (`space`) | 42 | SPACE (42) |

Pair counts differ from the source totals only by the duplicate removals listed
in §4.

### Telugu consolidation (7 → 4)

The seven Telugu categories became four coherent ones so the vocabulary sits
where a player would look for it:

- **Films and characters together** — `TELUGU CINEMA & CHARACTERS` holds both
  film-vs-film pairs and character pairs, because the two were constantly
  referring to each other.
- **People** — `TELUGU CELEBRITIES` kept separate; a name-vs-name round plays
  differently from a film-vs-film round.
- **Food** — `TELUGU FOOD` stands alone. The Andhra/Telangana dishes were not
  split into North/South Indian food; they are a distinct, recognisable set.
- **Culture, relationships and slang together** — `TELUGU CULTURE & SLANG`
  merges daily life, festivals, relationships and slang. The festival pair
  (`Sankranti / Ugadi`) stays here rather than in the pan-India festival
  category.
- **Places moved out** — Andhra/Telangana places joined `INDIA: PLACES &
  CITIES`, where a city-vs-city round is coherent and the pool is large enough
  to avoid repeats.

---

## 3. Free tier decision

Chosen free categories are all broad, international themes:

| Free category | Pairs | Why free |
| --- | --- | --- |
| WORLD FOOD & FRUIT | 34 | Food is universally recognisable; the pool is small, so it is the "quick round" option. |
| ANIMALS & NATURE | 118 | Largest free pool; covers animals, birds, sea life, weather and plants. |
| EVERYDAY OBJECTS | 59 | Transport, clothing and household objects — things every player has seen, regardless of region. |

211 free pairs is 10.7% of the database and the free trio gives a first-time
player three distinct themes without unlocking anything.

`EVERYDAY OBJECTS` was the free slot chosen in the UI pass, replacing `SPACE`.
Its 47 original pairs were joined by 12 household-object pairs that had been
sitting in `TELUGU CULTURE & SLANG` (fans, tumblers, bucket/mug, broom, stove,
grinder, matchbox, slate/notebook and similar). Both names in each moved pair
are plain English, so the free tier stays usable without any regional
knowledge; the Telugu-language pairs (Kappu, Cheepuru, Pattal, Vindanakarra,
Kunda) stayed in the Telugu category. Nothing was invented and nothing was
duplicated — each pair was moved verbatim.

`ANIMALS & NATURE` is the free category with the most regional vocabulary
(`Gaur (Indian Bison)`, `Sambar Deer`, `Neem Tree`). It stays free because the
theme is universal and the instruction was not to drop or replace words; the
regional items are simply a small part of a 118-pair pool.

Locked by default: all four Telugu categories, all Indian categories, cricket,
all cinema and celebrity categories, music, sport, technology, professions,
places, festivals, colours and space.

---

## 4. Duplicates removed — 47

Comparison key ignores case, punctuation, spacing and word order, so
`Chak De India / Swades` and `Swades / Chak De! India` count as one pair.

| Reason | Count |
| --- | --- |
| Exact duplicate | 30 |
| Reversed duplicate (`A / B` vs `B / A`) | 17 |

Removals by resulting category:

| Category | Removed | Category | Removed |
| --- | --- | --- | --- |
| ANIMALS & NATURE | 10 | TELUGU CINEMA & CHARACTERS | 2 |
| INDIAN CINEMA | 7 | INDIA: PLACES & CITIES | 2 |
| SPORTS & GAMES | 7 | TELUGU FOOD | 1 |
| INDIAN FOOD | 6 | TELUGU CULTURE & SLANG | 1 |
| TECHNOLOGY & GADGETS | 5 | INDIAN CELEBRITIES | 1 |
| GLOBAL CELEBRITIES | 3 | CRICKET | 1 |
| | | FESTIVALS OF INDIA | 1 |

### Where a shared pair was kept

A pair that appeared in two categories was kept in the more specific one:

| Pair | Kept in |
| --- | --- |
| Irani Chai / Filter Coffee | TELUGU FOOD (not culture) |
| Anirudh Ravichander / G V Prakash | MUSIC (not celebrities) |
| Taylor Swift / Selena Gomez | MUSIC |
| Billie Eilish / Olivia Rodrigo | MUSIC |
| Lionel Messi / Cristiano Ronaldo | SPORTS & GAMES |
| Drishyam / Drishyam 2 | INDIAN CINEMA |
| Kanchana / Chandramukhi | TELUGU CINEMA & CHARACTERS |
| Dosa / Idli, Rasam / Sambar, Rava Dosa / Masala Dosa | TELUGU FOOD |
| Samosa / Kachori | INDIAN FOOD |
| Sankranti / Ugadi | TELUGU CULTURE & SLANG |

<details>
<summary>Full removal list (47)</summary>

| # | Category | Removed pair | Reason |
| --- | --- | --- | --- |
| 1 | TELUGU CINEMA & CHARACTERS | Ee Nagaraniki Emaindi / Pelli Choopulu | reversed |
| 2 | TELUGU CINEMA & CHARACTERS | Tagore / Shankar Dada MBBS | reversed |
| 3 | TELUGU FOOD | Sarva Pindi / Sakinalu | reversed |
| 4 | TELUGU CULTURE & SLANG | Irani Chai / Filter Coffee | exact |
| 5 | INDIAN CINEMA | Sivaji: The Boss / Anniyan | reversed |
| 6 | INDIAN CINEMA | Chandramukhi / Kanchana | reversed |
| 7 | INDIAN CINEMA | Drishyam / Drishyam 2 | exact |
| 8 | INDIAN CINEMA | Sholay / Deewaar | exact |
| 9 | INDIAN CINEMA | Munna Bhai M.B.B.S. / Lage Raho Munna Bhai | exact |
| 10 | INDIAN CINEMA | Krrish / Koi... Mil Gaya | reversed |
| 11 | INDIAN CINEMA | Swades / Chak De! India | exact |
| 12 | SPORTS & GAMES | Tennis / Badminton | reversed |
| 13 | SPORTS & GAMES | Baseball / Softball | exact |
| 14 | SPORTS & GAMES | Boxing / Wrestling | exact |
| 15 | SPORTS & GAMES | Swimming / Diving | exact |
| 16 | SPORTS & GAMES | Table Tennis / Squash | exact |
| 17 | SPORTS & GAMES | Basketball / Volleyball | exact |
| 18 | SPORTS & GAMES | Chess / Checkers | exact |
| 19 | INDIAN CELEBRITIES | Anirudh Ravichander / G V Prakash | exact |
| 20 | GLOBAL CELEBRITIES | Taylor Swift / Selena Gomez | exact |
| 21 | GLOBAL CELEBRITIES | Lionel Messi / Cristiano Ronaldo | exact |
| 22 | GLOBAL CELEBRITIES | Billie Eilish / Olivia Rodrigo | exact |
| 23 | CRICKET | Hat-trick / Five-Wicket Haul | exact |
| 24 | INDIAN FOOD | Idli / Dosa | reversed |
| 25 | INDIAN FOOD | Masala Dosa / Rava Dosa | reversed |
| 26 | INDIAN FOOD | Sambar / Rasam | reversed |
| 27 | INDIAN FOOD | Vada Pav / Pav Bhaji | reversed |
| 28 | INDIAN FOOD | Pav Bhaji / Chole Bhature | reversed |
| 29 | INDIAN FOOD | Samosa / Kachori | exact |
| 30 | ANIMALS & NATURE | Lion / Tiger | exact |
| 31 | ANIMALS & NATURE | Tiger / Leopard | exact |
| 32 | ANIMALS & NATURE | Leopard / Cheetah | exact |
| 33 | ANIMALS & NATURE | Cheetah / Jaguar | exact |
| 34 | ANIMALS & NATURE | Elephant / Rhinoceros | exact |
| 35 | ANIMALS & NATURE | Horse / Donkey | exact |
| 36 | ANIMALS & NATURE | Lion / Cheetah | exact |
| 37 | ANIMALS & NATURE | Camel / Zebra | exact |
| 38 | ANIMALS & NATURE | Eagle / Falcon | reversed |
| 39 | ANIMALS & NATURE | Eagle / Hawk | exact |
| 40 | TECHNOLOGY & GADGETS | Headphones / Earbuds | reversed |
| 41 | TECHNOLOGY & GADGETS | Smart TV / Projector | exact |
| 42 | TECHNOLOGY & GADGETS | Router / Modem | exact |
| 43 | TECHNOLOGY & GADGETS | Processor / Motherboard | exact |
| 44 | TECHNOLOGY & GADGETS | Power Bank / Charger | exact |
| 45 | INDIA: PLACES & CITIES | Chandigarh / Amritsar | reversed |
| 46 | INDIA: PLACES & CITIES | Annavaram / Simhachalam | reversed |
| 47 | FESTIVALS OF INDIA | Ugadi / Sankranti | reversed |

</details>

The exact `[civilian, imposter]` orientation of every surviving pair is
unchanged. Where a reversed duplicate was removed, the surviving copy keeps its
own original orientation — the imposter is still the second word of the pair
that was kept.

---

## 5. Corrections — 11

| Category | Before | After | Why |
| --- | --- | --- | --- |
| TELUGU CINEMA & CHARACTERS | DJ Tillu / Tillu Square Radhika | DJ Tillu / Radhika (Tillu) | Malformed: the second word was a film name plus a suffix, not the character |
| TELUGU CINEMA & CHARACTERS | Ee Nagaraniki Emaindi / Pellichoopulu | … / Pelli Choopulu | Spelling |
| TELUGU FOOD | Sarvapindi / Sakinalu | Sarva Pindi / Sakinalu | Spelling |
| INDIAN CINEMA | Sivaji / Anniyan | Sivaji: The Boss / Anniyan | Full release title |
| INDIAN CINEMA | Sholay / Deewar | Sholay / Deewaar | Spelling |
| INDIAN CINEMA | Chak De India / Bhaag Milkha Bhaag | Chak De! India / … | Official punctuation |
| INDIAN CINEMA | Munna Bhai MBBS / … | Munna Bhai M.B.B.S. / … | Official punctuation |
| INDIAN CINEMA | Krrish / Koi Mil Gaya | Krrish / Koi... Mil Gaya | Official punctuation |
| INDIAN CINEMA | Barfi / Jagga Jasoos | Barfi! / Jagga Jasoos | Official punctuation |
| INDIAN CINEMA | Swades / Chak De India | Swades / Chak De! India | Official punctuation |
| CRICKET | Hat-trick / Five Wicket Haul | Hat-trick / Five-Wicket Haul | Hyphenation |

These are the only edits to word text. No pair was swapped, and no replacement
word was introduced.

### Kept but flagged

Left in the database, because they are legitimate distinct pairs, but worth a
look if curation is revisited:

- **Sequel pairs** — `Baahubali: The Beginning / Baahubali 2: The Conclusion`,
  `Drishyam / Drishyam 2`, `Stree / Stree 2`. Both sides are well known, so the
  round works; they are simply predictable.
- **Same story, two versions** — `Arjun Reddy / Kabir Singh`.
- **Near-identical technology pairs** — `SSD / HDD` alongside
  `Hard Disk Drive / Solid State Drive`. Not a duplicate by word, but the same
  comparison twice.

---

## 6. Selection change

Before, every enabled category's pairs were flattened into one array and a
single random index was taken. That made a 217-pair category 217× more likely
than a 34-pair one, so the small free categories almost never appeared.

Now:

1. Filter to enabled, unlocked categories.
2. Drop pairs in the recent-pair window.
3. Pick a **category** uniformly at random from what is left.
4. Pick a **pair** uniformly at random inside that category.

Result: each enabled category has the same chance of being drawn, independent of
its size.

### Recent-pair window

- A 12-entry history is kept and persisted in shell storage under `recent`.
- Keys are category-free (`word|word`, normalised), so a pair that used to exist
  in two categories is still excluded once.
- When the eligible pool is smaller than the window (e.g. `COLORS & SHAPES` with
  10 pairs), the oldest half of the history is relaxed first and the draw is
  retried. The window shrinks, the pool never does.
- If a pool is exhausted completely, the history is ignored rather than
  inventing a pair. A missing pool returns `false`; it never fabricates words.

---

## 7. Saved-state migration

Category ids used to be derived from the display name, so every rename or merge
would have orphaned saved selections and unlocks. Old ids are now mapped through
`LEGACY_CATEGORY_MAP` (41 entries) by `migrateCatId()`:

- All 41 historical ids map to a current category.
- Merged categories from the same source keep the **latest** unlock expiry
  (e.g. `sports-general` + `board-and-party-games` → one `sports` expiry).
- Expiries on categories that are now free are dropped, because the category
  needs no unlock.
- Expired unlocks are rejected on load.
- A saved selection that only contains old free-now-locked categories falls back
  to the new free trio instead of leaving the player with nothing enabled.
- Saved recent-pair history is validated (`^[a-z0-9]+\|[a-z0-9]+$`),
  de-duplicated and capped at 12 on load.

---

## 8. Build and validation tooling

`Tools/build_undercover.js`

- Validates the JSON schema: `id`, `name`, `free`, `pairs`; slug-shaped unique
  ids, unique names, boolean `free`, non-empty pair arrays, two non-blank
  strings per pair, no leading/trailing whitespace, no same-word pairs.
- Rejects **any** duplicate pair across the whole database using the
  normalised, order-insensitive key.
- Enforces exactly three free categories.
- Warns if a free category id looks culture-specific.
- Regenerates the HTML block between `/* WORD_CATEGORIES_START */` and
  `/* WORD_CATEGORIES_END */`, then re-parses it and fails if it is not byte-for-
  byte identical to the JSON.
- `--check` validates without writing (CI-friendly), `--verbose` lists every
  category.

```
node Tools/build_undercover.js --check
node Tools/build_undercover.js --verbose
```

`Tools/_integrate_games.js` now runs the build before integrating UnderCover,
so a stale HTML snapshot cannot be shipped into `app/src/main/assets`.

`UnderCover.html` stays a single offline file; the data is still embedded, so
there is no runtime fetch and no new dependency.

The old scratch dump `UnderCoverGame_wordsData.txt` (the 41-category flat JSON
with a `.txt` extension) was deleted so there is only one source of truth.
Nothing references it, and it remains recoverable from git history:
`git show HEAD:"sources/Playable Games/UnderCoverGame_wordsData.txt"`.

---

## 9. Preserved behaviour

Untouched by this change, and covered by the browser run:

- Multiple imposters, helper "imposter count" logic, and role assignment.
- Deal/pass-phone order, dossier reveal, clue order, voting, tallies and
  elimination flow.
- Home / setup / settings / rules screens; sounds; haptics; toasts.
- Rewarded unlock contract: only a confirmed completion unlocks; a failure
  unlocks nothing and shows `AD NOT COMPLETED · CATEGORY LOCKED`;
  30-minute duration; expiry persisted and restored; no invented SDK methods
  and no simulated success.
- Background/resume and `window.Game` lifecycle shims.
- GameBox bridge (`GameBox`, `Studio`, `NativeBridge`) and shell settings sync.

Deliberately removed as dead code: `FREE_CATEGORY_IDS`, name-derived
`categoryId()`, `usedPairs`, `lastPairWords` and the flattened `pairPool`
selection.

---

## 10. Verification performed

**Build / data**

- `node Tools/build_undercover.js --check` → 22 categories, 1,976 pairs,
  3 free / 19 locked, JSON and embedded HTML identical.
- No invented or reversed pairs: every output pair exists in the original JSON
  (after corrections), orientation intact → `invented: 0`, `ordered-key
  misses: 0`.
- `node Tools/_integrate_games.js undercover` → 170 KB asset, data identical to
  JSON.

**Selection (Node, 2,200 draws)**

- 22/22 categories reachable; per-category draws 78–122 (expected ~100).
- 500 free-tier draws with no repeat inside the 12-window.
- 60 draws from a 10-pair pool: zero immediate repeats.
- Single-pair pool: no crash, no invented word.
- All 41 legacy ids map; new ids round-trip.

**Saved state (Node)**

- Merged unlock keeps the later expiry; free-category expiry skipped; expired
  unlock rejected.
- Old free-now-locked selection falls back to the free trio.
- Recent list filtered, de-duplicated and capped at 12; draft and imposter
  count restore correctly.

**Browser (Chrome, CDP, headless)**

- Source file: all checks passed with no runtime errors.
- Free tier = `WORLD FOOD & FRUIT` 34 + `ANIMALS & NATURE` 118 +
  `EVERYDAY OBJECTS` 59 = 211 pairs; the other 19 categories stay locked.
- 22 categories / 1,976 pairs in the page; 3 free and 19 locked chips; 3 enabled
  by default.
- Locked chip opens the unlock dialog; failed ad leaves the category locked;
  successful ad unlocks for 30 minutes, persists, and survives a reload.
- Legacy ids in storage migrate to merged categories; old locked ids do not
  leak into the selection.
- Category-first draws across the free tier hit all three categories with no
  repeat inside 12.
- 3 players / 1 imposter starts correctly; pass-phone screen shows; dossier
  shows a real word from a free category; 5 players / 2 imposters assigns
  correctly.

**Package**

- `shell-debug.apk` built (19,964,394 bytes).
- APK asset contains 22 categories, 1,976 pair rows, the legacy map and the
  recent-pair logic, and no `FREE_CATEGORY_IDS`.

---

## 11. Still needs native-shell testing

The connected device (`0015935AT001973`) is PIN-locked: `adb` delivers the
`GameActivity` intent, but the screen stays on the keyguard, so nothing about
the rendered game or the ad bridge could be observed on-device. The following
must be confirmed on the unlocked phone:

1. Category sheet renders as 3 free chips + 19 locked chips, readable on a
   small screen with no clipped names.
2. Tapping a locked chip opens the unlock dialog; a completed rewarded ad
   unlocks for 30 minutes and the chip shows the countdown.
3. A **failed or dismissed** ad leaves the category locked, with no simulated
   success.
4. The unlock survives an app restart (expiry read back from storage).
5. Haptics fire and sounds play through the native bridge.
6. Back button and the shell's BACK chrome behave correctly from home, setup
   and mid-round.
7. Pause/resume (app backgrounded during a round) preserves state.
8. GameBox storage persistence across process death, not just a reload.
9. Orientation lock and safe-area insets on the notch.

Browser coverage cannot stand in for these: the ad bridge, haptics and storage
are all native implementations.

---

## 12. Revision - UI pass

Four UI issues were fixed after the data restructure. Gameplay, categories
(other than the free flag and the moved pair list), ads, rewards and shell
integration were left alone.

### 12.1 Back button flashed on the New Game page

**Cause (not a CSS transition inside the game).** The shell's `#studioBack` is
injected into the page by `Tools/_shell/back.html` and learns whether the game is
on its front page by polling `front()` every 250 ms. `showScreen()` swapped the
active screen instantly, but the shell only noticed up to 250 ms later, so its
44x44 BACK button stayed painted on top of the New Game screen while that screen
slid in. Measured with frame sampling: **21 frames** (~350 ms) of the button over
the setup screen.

**Fix.** `showScreen()` now dispatches `studiofrontchange` in the same task as
the class swap, and `back.html` re-evaluates the front state synchronously on
that event (`sync()`). The 250 ms poll stays as a fallback for other games;
nothing changes for a game that never dispatches the event.

**Result.** 0 frames with the button on the New Game screen. Every transition
(`Setup, Pass, Word, Table, Vote, Elim, Win, Home`) was swept with 10 extra
frames each, and BACK visibility matched the front page in every frame. Going
back to Home shows it immediately, so the 250 ms delay is gone in both
directions.

### 12.2 Top padding on the New Game page

**Cause.** The shell runs games edge-to-edge and does not pad the WebView:
`GameActivity` never calls `setPadding`, and the injected shell CSS only styles
`#studioBack`. So the game owns the top inset, and `.top` used a flat
`padding:14px 16px 0` with no safe-area term (the home gear and footer already
used `env(safe-area-inset-top)`).

**Fix.** `.top` is now
`padding:calc(20px + env(safe-area-inset-top)) 16px 0` - 6px more breathing room
plus the real inset when the WebView reports one. Because the shell adds none,
this cannot double-apply. No change was made to `GameActivity`.

**Result.** 20px at inset 0; with a 32px emulated inset the computed padding was
52px exactly once, and the header moved below the inset.

### 12.3 Back and Settings not vertically aligned

**Cause.** The shell BACK is `top:max(10px, env(safe-area-inset-top))`; the Home
gear was `top:calc(12px + env(safe-area-inset-top))`. Both are 44x44, so the
gear sat 2px lower at inset 0 and `inset + 2` lower otherwise.

**Fix.** One scoped rule, `#scrHome .corner-btn{top:max(10px,env(safe-area-inset-top))}`.
The other `.corner-btn` screens (Pass, Word, Win) keep their existing position.
Horizontal placement (`right:14px`), size, border, colours and spacing are
unchanged.

**Result.** Centre delta 0px at inset 0 and 0px at a 32px inset; the gear's
horizontal centre stayed at the same x.

### 12.4 Free category: SPACE → EVERYDAY OBJECTS

`EVERYDAY OBJECTS` already existed (47 pairs: transport 20, clothing 23,
household 4). It was made free and 12 household-object pairs were moved into it
from `TELUGU CULTURE & SLANG`, verbatim and in source order:

`Ceiling Fan / Table Fan`, `Steel Tumbler / Plastic Cup`, `Water Mug / Steel
Tumbler`, `Chalk Piece / Slate Pencil`, `Slate / Notebook`, `Water Pot / Copper
Bottle`, `Broomstick / Mop Stick`, `Matchbox / Gas Lighter`, `Mortar and Pestle /
Mixer Grinder`, `Bucket / Mug`, `Gas Stove / Cylinder`, `Mixer Grinder / Wet
Grinder`.

Both names in every moved pair are plain English, so the free tier stays usable
without regional knowledge. Telugu-language household pairs (`Kappu (Teacup)`,
`Cheepuru / Mop`, `Pattal (Leaf Plate)`, `Visanakarra`, `Kunda`) stayed in the
Telugu category, as did clothing, relations, festivals and slang.

| | Before | After |
| --- | --- | --- |
| EVERYDAY OBJECTS | 47, locked | **59, free** |
| TELUGU CULTURE & SLANG | 129 | 117 |
| SPACE | 42, free | 42, **locked** |
| Free pairs | 194 (9.8%) | **211 (10.7%)** |
| Locked pairs | 1,782 | 1,765 |

Total pairs are still 1,976 and the pair count in every other category is
unchanged. `build_undercover.js` confirms no duplicate, no blank word, exactly
three free categories, and that the generated HTML equals the JSON.

### 12.5 Re-validation

- `node Tools/build_undercover.js --check` → 22 categories, 1,976 pairs,
  3 free / 19 locked, HTML identical to JSON.
- `node Tools/_integrate_games.js undercover` → 171 KB asset; JSON, source and
  asset identical.
- Selection suite: 2,200 draws across 22/22 categories, 500 free-tier draws with
  no repeat inside 12, tiny and single-pair pools safe, 41/41 legacy ids mapped.
- Saved-state suite: merged expiry, free-category expiry skipped, expired
  unlock rejected, fallback to the new free trio, recent history capped at 12.
- Browser suite (headless Chrome, CDP): no runtime errors; 3 free / 19 locked;
  failed ad never unlocks; successful ad unlocks ~30 min and survives reload;
  legacy id migration; category-first draws; 3p/1i and 5p/2i flow.
- UI suite: BACK flash 0 frames, all 10 screen transitions correct, header
  padding 20px (+32px inset applied once), centre delta 0px at 0 and 32px
  insets, `EVERYDAY OBJECTS` free with all 12 moved pairs present and removed
  from their old category, no duplicates.
- `shell-debug.apk` rebuilt (19,964,394 bytes); the APK's embedded asset is
  byte-identical (SHA-256) to the integrated file.

No on-device testing was performed in this pass.
