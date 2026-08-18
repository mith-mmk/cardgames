# Solitaire rule source registry

This registry records the public references used to define the first five game
implementations. The engine's rule definitions and tests are the executable
specification; when a source has optional variations, the selected variation is
called out explicitly below. URLs are retained so a later rules review can
compare changes without silently changing an existing saved game.

| Game        | Family                  | Selected baseline                                                                                                     | Primary reference                                                     | Accessed   |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------- |
| Klondike    | Klondike/Canfield       | One 52-card deck, seven tableau piles, draw-one stock, four suit foundations, alternating-color descending tableau    | [Pagat: Klondike](https://www.pagat.com/patience/klondike.html)       | 2026-08-17 |
| FreeCell    | Open tableau/free cells | One 52-card deck, eight tableau columns, four free cells, four suit foundations, alternating-color descending tableau | [Pagat: Freecell](https://www.pagat.com/patience/freecell.html)       | 2026-08-17 |
| Spider      | Spider family           | Two 52-card decks, ten tableau columns, eight same-suit sequences, deal ten cards to the tableau per stock round      | [Pagat: Spider](https://www.pagat.com/patience/spider.html)           | 2026-08-17 |
| Calculation | Special foundations     | One 52-card deck, four foundations beginning at A/2/3/4, each foundation advances by its fixed increment (1/2/3/4)    | [Pagat: Calculation](https://www.pagat.com/patience/calculation.html) | 2026-08-17 |
| Pyramid     | Removal/compression     | One 52-card deck, pyramid tableau, remove exposed pairs totaling 13; kings are removed alone                          | [Pagat: Pyramid](https://www.pagat.com/patience/pyramid.html)         | 2026-08-17 |

## Compatibility notes

- Rules in this first release are deterministic for a given seed. A variation
  such as Klondike draw-three is a game option, not a separate collection item.
- Rule text shown in the UI must be kept concise and localizable. The source
  URLs are references, not remote runtime dependencies, so the application
  remains fully offline.
- Any future rule correction must add a versioned definition and regression
  fixtures rather than changing the meaning of an existing saved game.
