# Release and game audit — 2026-08-20

## Scope and result

| Area                        | Result                         | Evidence                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine contract             | Pass                           | `src/engine/gameContract.test.ts` enumerates all 100 registered games, validates deterministic deals, full unique decks, a legal opening move, and legal-move application.                                                        |
| Existing browser regression | Needs follow-up                | The 2026-08-20 rerun found an iPhone-layout failure in Bowling Solitaire and a locale-assumption failure in the help E2E. The remaining 83 checks passed; the compact-touch test is intentionally skipped in the desktop project. |
| UI evidence                 | Needs touch follow-up          | Updated browser checks verify Poker/Cribbage Squares and the remediated boards, but Bowling Solitaire has the iPhone touch hit-target defect recorded in the 0.6.9 re-review below.                                               |
| iOS static target           | Pass                           | Generated iOS project is versioned; `scripts/verify-tauri-ios.mjs` validates the landscape-only plist.                                                                                                                            |
| macOS release artifact      | Blocked on release credentials | Configuration and manual release workflow are present, but a signed/notarized DMG and App Store PKG cannot be produced without the Apple Developer credentials and provisioning profile.                                          |

The engine contract is a necessary health check, not proof that a named game follows its published rules. The gameplay findings below take precedence for release readiness.

## Resolved in 0.6.1

### Poker Squares — playable grid, placement choice, and poker scoring

- The engine now deals exactly one card from stock to waste, then exposes transfers from that card to every empty 5×5 cell. The screen selects the dealt card and leaves the final cell to the player.
- `scorePokerHand` evaluates completed rows and columns using the published score schedule: royal flush, straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, and pair.
- `GameSnapshot` now includes safe copied engine metadata, so the shared screen renders score and the draw/place phase. `pileLayout` lays out `g*` piles as a centered square grid.
- **Verification:** fixed-choice engine tests cover choosing `g24`, Poker scoring fixtures cover royal flush and four of a kind, and the live desktop review confirmed stock → `g24` placement.

### Cribbage Squares — playable 4×4 grid and cribbage line scoring

- Cribbage Squares uses the same deliberate draw/place loop with a 4×4 board; its localized help now states that dimension and sequence.
- `scoreCribbageHand` counts fifteens, pairs, maximal runs, and flushes for every completed row and column. The four-fives fixture verifies a 20-point completed hand.
- **Verification:** targeted engine and contract suites pass for all legal opening moves, undo, and deterministic retry.

## Resolved in 0.6.2

### Tri-Peaks — three-peak tableau, waste sequence, and exposure rules

- The engine now deals 28 cards into the traditional three-peak dependency graph, starts the waste with one face-up card, and leaves 23 face-down cards in stock.
- Only a face-up exposed card one rank above or below the waste can move; A/K wrap. Newly exposed cards turn face-up after a move.
- The dedicated board renders the three peaks and disables covered or empty piles so they cannot intercept clicks.
- **Verification:** fixed layout/stock/exposure and legal-transfer tests, plus browser coverage of stock and the displayed three-peak board. A live review moved the exposed 4♥ onto 3♥ with one click.

### Black Hole — central foundation and 17-pile layout

- The Ace of Spades seeds the central Black Hole. The remaining cards deal to 17 three-card tableau piles; only each pile’s top card may be played one rank above/below the central foundation, with A/K wrap.
- A dedicated circular board replaces the previous generic dense row; no stock or waste pile is exposed for this game.
- **Verification:** deck/ace/17-pile, legal-transfer, undo/retry, and desktop/mobile browser layout checks.

## Resolved in 0.6.3

### Aces Up — four-column deal cycle and empty-column play

- Aces Up now starts with one face-up card in each of four tableau piles and retains 48 face-down stock cards. When no tableau action remains, activating the stock deals a complete four-card round, one card to every tableau pile, instead of incorrectly drawing a single card to a waste pile.
- Same-suit comparison now treats the Ace as the highest rank. A lower exposed card may be discarded, and any exposed top card may be moved to an empty tableau pile. An exhausted, non-winning position now becomes lost and has no legal moves.
- Hint now selects the suggested removal as well as transfers; double-click safely removes a suggested Aces Up card. The compact-landscape layout puts the four columns immediately below the stock rather than below a desktop-height gap.
- **Verification:** deterministic opening/deal/empty-column/dead-end tests, legal same-suit discard test, undo/retry contract coverage, and Chromium plus compact mobile E2E coverage of the four-card stock round.

## Resolved in 0.6.4

### Giza — all-open pyramid and reserve tableau

- Replaced the generic seven-stack approximation with the published 28-card, seven-row face-up pyramid and eight face-up three-card reserve piles. There is no stock or waste pile.
- Only uncovered pyramid cards and reserve tops participate in 13-pair removals; Kings remove singly. Reserve removals now use the same exposed-card guard as tableau removals.
- **Verification:** deterministic full-deal, open-pyramid/reserve, reserve-top removal, invalid move, undo/retry contract, and desktop/mobile board rendering checks.

## Resolved in 0.6.5

### Cheops — open pyramid with a playable face-up stock

- Replaced the generic seven-stack approximation with the selected published Cheops variant: a 28-card, seven-row face-up pyramid, plus a 24-card face-up stock and waste pile. There is one stock pass and no redeal.
- Only uncovered pyramid cards participate. Equal-rank and consecutive-rank pairs may be discarded; Ace and King do not wrap. The current top stock or waste card can be paired with an exposed pyramid card or each other.
- **Verification:** deterministic deal, exposure, equal-rank, consecutive/no-A-K, stock removal, draw, invalid move, undo/retry, desktop, and compact mobile E2E coverage.

## Resolved in 0.6.6

### Accordion — whole-pile moves and compressed sequence layout

- A legal Accordion move now transfers the complete source pile, not merely its exposed top card. The remaining piles automatically close the vacant sequence position.
- The board renders the live pile sequence in contiguous rows instead of 52 static generic cells; empty source piles leave no clickable gap. The drag ghost, selected targets, and click-to-move interaction recognize the top card of a multi-card source pile.
- **Verification:** deterministic whole-pile/closed-gap fixture and desktop plus compact mobile E2E that performs a matching one-/three-position move and checks the visible sequence compression.

## Resolved in 0.6.7

### Monte Carlo — 5×5 adjacency, compaction, and stock replenishment

- Replaced the generic stacked columns with a 25-card face-up 5×5 board and a 27-card stock. Equal-rank pairs now require horizontal, vertical, or diagonal contact.
- Once every current pair is removed, the board compacts toward the top-left while preserving order and refills from the stock to 25 cards. The stock never recycles; a fully blocked state is recorded as lost.
- **Verification:** deterministic deal, adjacency/non-adjacency, compaction/refill, invalid move, undo/retry, and desktop/mobile E2E pair-removal coverage.

## Resolved in 0.6.8

### Block Ten, Fourteen Out, Nestor, named removal boards, and scoring games — correct rules and layouts

- Block Ten now uses nine face-up cells and a one-pass stock refill. It removes rank-ten pairs and matching J/Q/K pairs, while tens remain as the required final four cards.
- Fourteen Out now uses twelve fully face-up columns (five cards in the first four, four in the other eight). Only top cards from different columns may form a 14-pair; no building, refill, or stock is present.
- Nestor now deals eight six-card open columns without duplicate ranks in a column, plus four independently playable open reserve cards. Matching exposed ranks are removed in pairs; it has no stock.
- Royal Marriage now uses its ♥Q-to-♥K continuous sequence, including both one-card and two-adjacent-card bracket removals. Gay Gordons now uses ten open five-card columns plus its stacked reserve and special K/Q/J pairing rules. Beehive now has its 10-card reserve, six hives, four-of-a-kind auto-completion, draw-three stock, and recycle loop.
- Cribbage Solitaire now plays four 13-card sets: choose two cards from each six-card hand for the crib, reveal the starter, and score the two hands plus crib as five-card shows.
- Bowling Solitaire now implements the selected Sid Sackson game: a 20-card A-to-10 two-suit rack, 4-3-2-1 pins, 5/3/2 ball piles, one-to-three adjacent-pin knocks, first-ball restrictions, two-ball frames, tenth-frame bonus balls, and standard strike/spare scoring.
- **Verification:** deterministic deals, legal and illegal fixtures, automatic completion/score lifecycle coverage, 495 unit tests, 75 Playwright checks plus one expected desktop skip, production/PWA builds, Android/iOS static checks, and Windows NSIS/MSI package builds.

## High-priority game-rule findings

No remaining named game is marked rule-incomplete. The broader acceptance-test and layout follow-ups below remain tracked separately.

## UI and accessibility findings

| Severity | Finding                                              | Resolution or required action                                                                                                                                                                                                                    |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Resolved | Named boards were rendered as generic columns        | Added dedicated fan, crescent, quilt, and windmill positions driven by the game layout metadata. Desktop and coarse-pointer mobile E2E now check all four shapes.                                                                                |
| Resolved | Short desktop scoring grids required table scrolling | Poker Squares and Cribbage Squares now reduce their card scale and board spacing below 801px height. The fifth cell row is asserted to fit inside the desktop table viewport with no internal vertical scroll.                                   |
| Resolved | Score detail presentation was partial                | Poker/Cribbage grids, Cribbage Solitaire, and Bowling now provide a localized, keyboard-native expandable score sheet with line, hand, frame rolls, and resolved frame totals. Card-hand labels and poker hands are localized in both languages. |
| Resolved | Board piles contained card buttons                   | Only empty usable targets expose pile-level button semantics. Card-containing piles rely on their native card buttons; only the top card in each pile is tab-focusable, removing nested controls and hidden-card duplicate tab stops.            |
| Resolved | Duplicate family filters                             | The Home filter preserves all nine catalog classifications without duplicate localized names, so related families remain independently selectable.                                                                                               |
| P2       | iPhone hardware confirmation                         | Automated coarse-pointer landscape checks pass at 568×320, 844×390, and 1024×768. A physical iPhone remains required only to confirm safe-area and touch behavior; this is a platform/device validation, not a known web-layout defect.          |
| Resolved | External font dependency                             | Removed the Google Fonts `@import`; the app now uses local system font stacks and remains offline-first.                                                                                                                                         |

## Code and platform review

| Severity | Finding                                                              | Resolution or required action                                                                                                                                                                                             |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | iOS had no versioned native project                                  | Generated `src-tauri/gen/apple`, configured it for landscape-only iPhone/iPad use, and added static plist validation.                                                                                                     |
| P1       | Generated Xcode script contained a machine-specific Node path        | Replaced it with `/usr/bin/env node` plus a repository-relative Tauri CLI path.                                                                                                                                           |
| P1       | Physical iOS deployment cannot be verified without a team and device | Set the Apple Developer team in Xcode or supply `APPLE_DEVELOPMENT_TEAM`; connect and trust an iPhone, then run `npm run tauri:ios:dev`. Do not record the Team ID, certificate, profile, or Apple ID in this repository. |
| P1       | macOS had no channel-specific release flow                           | Added a Universal DMG path, a separate App Store bundle/PKG path, sandbox entitlements, artifact validation, and a manually dispatched GitHub Actions workflow.                                                           |
| P1       | macOS signing and notarization remain externally blocked             | Provide the documented GitHub Secrets or local release environment values, then build, notarize, staple, and validate the DMG; provide the App Store provisioning profile and installer identity to create the PKG.       |

## Audit coverage

All 100 `GAME_DEFINITIONS` are covered by the engine contract test. Rule-complete status is grouped below so an engine-green result is not mistaken for game-complete status.

The remaining per-game playable-rule acceptance fixtures are tracked here rather than as a UI/accessibility issue. The current remediation adds interaction coverage for the changed boards and controls, but it does not misrepresent contract coverage as a full human playthrough for every game.

| Status                                                                              | Games                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract verified; rule implementation still requires per-game acceptance scenarios | Klondike, FreeCell, Spider, Calculation, Pyramid, Baker’s Game, Eight Off, Seahaven Towers, Spiderette, Yukon, Forty Thieves, Forty and Eight, Josephine, Congress, Diplomat, Canfield, Agnes Bernauer, King Albert, Scorpion, Wasp, Black Widow, Easthaven, Westcliff, Aunt Mary, Golf, Clock, Agnes Sorel, Australian Patience, Whitehead, Thumb and Pouch, Blind Alleys, Batsford, Harp, Lady Jane, Bureau, Athena, Pas Seul, Chameleon, Superior Canfield, Penguin, Beleaguered Castle, Citadel, Fortress, Chessboard, Streets and Alleys, Baker’s Dozen, Castles in Spain, Bisley, Flower Garden, La Belle Lucie, Shamrocks, Trefoil, Bear River, Cruel, Canister, Beetle, Curds and Whey, Mrs Mop, Russian Solitaire, Alaska, Brisbane, Applegate, Miss Milligan, Interchange, Busy Aces, Deuces, Aces and Kings, Tournament, Colorado, Crescent, Crazy Quilt, Windmill, Sultan, Algerian Patience, Indian, Gypsy, Carthage, Carpet, Bristol, Sir Tommy, Auld Lang Syne, Osmosis, Four Seasons. |
| Known incomplete / do not release as implemented                                    | None. Broad acceptance and platform review items below still apply.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

The 0.6.8 release gate passed: full regression, rendered-layout audit, PWA artifact validation, mobile static validation, and Windows package build are complete. The remaining entries above are future acceptance, presentation, and hardware-validation work rather than a known rule-incomplete game.

## Re-review — 0.6.9 (2026-08-20)

### Browser and iOS viewport evidence

- The in-app browser review confirmed the home screen and settings dialog at 1024×768, with no horizontal overflow. Poker Squares rendered its full 5×5 grid in that viewport; stock → `g24` increased the move count and placed the dealt card in the selected square.
- The browser's size-only 844×390 and 568×320 checks did not emulate a coarse touch pointer, so they are not treated as native-iOS proof. The Playwright `mobile-chrome` project does emulate that input mode and passes the representative compact-landscape suite at 568×320, 844×390, and 1024×768 for Klondike, Spider, Pyramid, Clock, Aces Up, Giza, Cribbage Solitaire, and Bowling Solitaire.
- `npm run tauri:ios:verify` passed: the generated iPhone/iPad plist is landscape-only and syntactically valid. This remains static verification; safe-area and actual touch behavior still need a signed build on a physical iPhone/iPad.

### New findings

| Severity | Finding                                                                                                          | Reproduction and evidence                                                                                                                                                                                                                                                                                                         | Recommended action                                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Bowling Solitaire's selected active ball is not the top hit target in touch emulation.                           | Run `node node_modules/@playwright/test/cli.js test --project=mobile-chrome --grep "Bowling ball" --workers=1`. It reproducibly fails at `e2e/collections.spec.ts:673`: `elementFromPoint()` at the active ball resolves to another card. This can make the selected ball visually or interactively obscured on iPhone landscape. | Give `bowlActive` an isolated stacking context above the rack in compact landscape, then retain the hit-target assertion at 568×320 and add 844×390 coverage for this board. |
| P3       | The localized help E2E assumes that the app initially renders English, while the current app starts in Japanese. | `opens localized how-to-play help for the active game` waits for a `日本語` language-switch button, but the initial screen exposes `English`; the test times out before exercising the dialog. This is a test-isolation/locale-assumption defect, not evidence that the dialog itself is unavailable.                             | Reset persisted preferences in test setup, or branch on the visible language switch before choosing the expected catalog title.                                              |
| P2       | Native iOS hardware confirmation remains outstanding.                                                            | No Apple development team or trusted physical device is available in this workspace.                                                                                                                                                                                                                                              | Run the generated iOS project on both an iPhone and iPad; verify safe-area insets, tap targets, and offline relaunch without committing Apple credentials or profiles.       |

### macOS build entry point

- Added `build-mac.sh`, mirroring `build-windows.sh`. It runs the Universal `.app`/DMG path (`tauri:mac:dmg`) and the web build. Producing a distributable signed/notarized DMG still requires the documented Apple release credentials.

## iOS native implementation — 2026-08-21

- **Resolved P1 — native Rust target:** Added the Tauri mobile library entry point (`staticlib`, `cdylib`, and `rlib`) and made the desktop binary delegate to it. iOS previously stopped at `cargo build --lib` because the package had only a desktop binary target.
- **Resolved P2 — version drift:** The generated iOS project and plist now use `0.6.9`, matching `src-tauri/tauri.conf.json` and `Cargo.toml`. `tauri:ios:verify` rejects future drift, portrait orientation, or a missing mobile Rust library.
- **Simulator verification:** `npm run tauri:ios:sim:build` produced an unsigned arm64 iOS Simulator archive. The archive was installed and launched on both an iPhone 17 Pro and iPad Air 11-inch simulator; the app entered its landscape-only UI in both cases.
- **Remaining device gate:** A signed physical-device build still requires selecting the intended Apple Development Team and a trusted device. Team IDs, certificates, provisioning profiles, and Apple IDs remain outside the repository.
