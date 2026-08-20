# Release and game audit — 2026-08-20

## Scope and result

| Area                        | Result                              | Evidence                                                                                                                                                                                 |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine contract             | Pass                                | `src/engine/gameContract.test.ts` enumerates all 100 registered games, validates deterministic deals, full unique decks, a legal opening move, and legal-move application.               |
| Existing browser regression | Pass with one expected desktop skip | 51 Playwright checks passed; the compact-touch test is intentionally skipped in the desktop project and passes in `mobile-chrome`.                                                       |
| UI evidence                 | Remediated boards verified          | Reviewed Poker Squares and the dedicated Tri-Peaks / Black Hole boards in the running app; Tri-Peaks direct card-to-waste interaction was exercised.                                     |
| iOS static target           | Pass                                | Generated iOS project is versioned; `scripts/verify-tauri-ios.mjs` validates the landscape-only plist.                                                                                   |
| macOS release artifact      | Blocked on release credentials      | Configuration and manual release workflow are present, but a signed/notarized DMG and App Store PKG cannot be produced without the Apple Developer credentials and provisioning profile. |

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

## High-priority game-rule findings

| Severity | Games                                                                              | Finding                                                                                                                                                                                         | Required next step                                                                                  |
| -------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| P1       | Cheops                                                                             | It is still represented as seven ordinary stacks rather than its two-pyramid, replenishing-stock layout.                                                                                        | Implement both pyramids, exposure rules, stock replenishment, and redeals before claiming support.  |
| P1       | Monte Carlo, Royal Marriage, Gay Gordons, Beehive, Block Ten, Fourteen Out, Nestor | Each uses generic pile stacks and pair predicates, while the catalog promises named layouts, adjacency, compression, or game-specific deals that are not represented by the engine or renderer. | Audit and implement each named game separately; do not market these entries as complete until done. |
| P1       | Cribbage Solitaire                                                                 | The only action removes a single exposed card and adds one point; no cribbage combination is evaluated.                                                                                         | Define the deal/hand lifecycle and add complete cribbage scoring tests.                             |
| P1       | Bowling Solitaire                                                                  | It removes one exposed card at a time and derives a score from total removed cards; frames, rolls, strikes, and spares are absent.                                                              | Model frame state and standard bowling scoring.                                                     |
| P1       | Accordion                                                                          | The transfer rule exists, but 52 ordinary piles are rendered through the generic dense layout rather than an accordion sequence.                                                                | Add an accordion layout and test one/three-pile positioning after compression.                      |

## UI and accessibility findings

| Severity | Finding                                                                 | Evidence and recommendation                                                                                                                                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Named layouts are largely ignored                                       | `pileLayout` now handles Clock, Pyramid, scoring grids, Tri-Peaks, and Black Hole, but fans, crescents, quilts, windmills, royal marriage, beehive, and accordion still render as generic rows. Give each layout a renderer before presenting its game as implemented.                       |
| P2       | Scoring grids require vertical table scrolling on short desktop windows | The repaired desktop Poker Squares board has no horizontal overflow, but its fifth row may be below the initial table viewport at short heights. Test and tune the compact card scale for this distinct board before calling the layout fully responsive.                                    |
| P1       | Score and phase are only integrated for grid scoring games              | `GameSnapshot` and the shared screen now expose metadata, score, and draw/place guidance for Poker/Cribbage Squares. Other scoring games still lack their own score breakdown and phase presentation.                                                                                        |
| P1       | Current tests prove contracts, not playable rules                       | Poker/Cribbage and Tri-Peaks/Black Hole now have named-rule fixtures, but most games still only have deterministic-deal and first-legal-move coverage. Add per-game acceptance fixtures and interaction tests before upgrading a game from incomplete.                                       |
| P2       | Board piles contain card buttons                                        | The generic pile is keyboard-focusable while cards inside it are also buttons, producing nested interactive controls and duplicate focus stops. Split pile targets from card controls or make empty targets independently focusable.                                                         |
| P2       | Duplicate family filters                                                | The home filter contains duplicate visible family names because base catalog and expansion metadata use differing family labels. Normalize family IDs independently from localized labels.                                                                                                   |
| P2       | iPhone-width review needs hardware confirmation                         | An iPhone-landscape-width browser with a fine pointer permits vertical scrolling; actual iOS uses a coarse pointer and follows the existing compact-layout branch. The Playwright coarse-pointer test passes, but a connected iPhone must still be checked for safe-area and touch behavior. |
| Resolved | External font dependency                                                | Removed the Google Fonts `@import`; the app now uses local system font stacks and remains offline-first.                                                                                                                                                                                     |

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

| Status                                                                              | Games                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract verified; rule implementation still requires per-game acceptance scenarios | Klondike, FreeCell, Spider, Calculation, Pyramid, Baker’s Game, Eight Off, Seahaven Towers, Spiderette, Yukon, Forty Thieves, Forty and Eight, Josephine, Congress, Diplomat, Canfield, Agnes Bernauer, King Albert, Scorpion, Wasp, Black Widow, Easthaven, Westcliff, Aunt Mary, Golf, Clock, Agnes Sorel, Australian Patience, Whitehead, Thumb and Pouch, Blind Alleys, Batsford, Harp, Lady Jane, Bureau, Athena, Pas Seul, Chameleon, Superior Canfield, Penguin, Beleaguered Castle, Citadel, Fortress, Chessboard, Streets and Alleys, Baker’s Dozen, Castles in Spain, Bisley, Flower Garden, La Belle Lucie, Shamrocks, Trefoil, Bear River, Cruel, Canister, Beetle, Curds and Whey, Mrs Mop, Russian Solitaire, Alaska, Brisbane, Applegate, Miss Milligan, Interchange, Busy Aces, Deuces, Aces and Kings, Tournament, Colorado, Crescent, Crazy Quilt, Windmill, Sultan, Algerian Patience, Indian, Gypsy, Carthage, Carpet, Bristol, Sir Tommy, Auld Lang Syne, Osmosis, Four Seasons. |
| Known incomplete / do not release as implemented                                    | Cheops, Accordion, Monte Carlo, Block Ten, Fourteen Out, Royal Marriage, Gay Gordons, Beehive, Nestor, Cribbage Solitaire, Bowling Solitaire.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

The next remediation release should replace the remaining generic removal/scoring games one at a time with rule fixtures and layout-specific UI tests, beginning with Cheops.
