import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GAME_DEFINITIONS } from '../src/engine';
import type { GameDefinition, GameState, Move } from '../src/engine';

const definitions = Object.values(GAME_DEFINITIONS) as GameDefinition[];

type SmokeCase = {
  definition: GameDefinition;
  expected: GameState;
  initial: GameState;
  move: Move;
  seed: string;
};

function movePriority(move: Move): number {
  if (move.type === 'transfer' && move.cardIds.length === 1) return 0;
  if (move.type === 'remove' && move.cardIds.length <= 2) return 1;
  if (move.type === 'draw' || move.type === 'recycle') return 2;
  return 3;
}

function isBrowserOperable(move: Move): boolean {
  if (move.type === 'draw' || move.type === 'recycle') return true;
  if (move.type === 'transfer') return move.cardIds.length === 1;
  return move.cardIds.length <= 2;
}

function smokeCase(definition: GameDefinition, definitionIndex: number): SmokeCase {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const seed = String(1_700_000_000_000 + definitionIndex * 100 + attempt);
    const initial = definition.create(seed);
    const move = definition
      .legalMoves(initial)
      .filter(isBrowserOperable)
      .sort((left, right) => movePriority(left) - movePriority(right))[0];
    if (!move) continue;
    const result = definition.applyMove(initial, move);
    if (!result.error) return { definition, expected: result.state, initial, move, seed };
  }
  throw new Error(`${definition.id} has no browser-operable legal move in 100 deterministic deals`);
}

const smokeCases = definitions.map(smokeCase);

function boardSignature(state: GameState): string[] {
  return Object.values(state.piles)
    .map((pile) => `${pile.id}:${pile.cards.map((card) => card.id).join(',')}`)
    .sort();
}

async function browserBoardSignature(page: Page) {
  return page
    .locator('[data-pile-id]')
    .evaluateAll((piles: HTMLElement[]) =>
      piles
        .map(
          (pile) =>
            `${pile.dataset.pileId}:${[...pile.querySelectorAll<HTMLElement>('[data-card-id]')]
              .map((card) => card.dataset.cardId)
              .join(',')}`,
        )
        .sort(),
    );
}

async function expectBrowserBoard(page: Page, state: GameState) {
  await expect
    .poll(() => browserBoardSignature(page), { timeout: 2_000 })
    .toEqual(boardSignature(state));
  await expect(page.locator('[data-move-count]')).toHaveText(String(state.moveCount));
}

function pileSelector(pileId: string): string {
  return `[data-pile-id="${pileId}"]`;
}

function cardSelector(cardId: string): string {
  return `.playing-card[data-card-id="${cardId}"]`;
}

async function cardIsInPile(page: Page, pileId: string, cardId: string): Promise<boolean> {
  return (await page.locator(`${pileSelector(pileId)} ${cardSelector(cardId)}`).count()) === 1;
}

async function dispatchMove(page: Page, move: Move) {
  if (move.type === 'draw') {
    await page.locator(pileSelector(move.from)).click();
    return;
  }
  if (move.type === 'recycle') {
    await page.locator(pileSelector(move.to)).click();
    return;
  }

  const firstCard = move.cardIds[0];
  await page.locator(cardSelector(firstCard)).click();

  if (move.type === 'remove') {
    if (!(await cardIsInPile(page, move.to, firstCard)))
      await page.locator(cardSelector(firstCard)).click();
    for (const cardId of move.cardIds.slice(1)) await page.locator(cardSelector(cardId)).click();
    return;
  }

  if (await cardIsInPile(page, move.to, firstCard)) return;
  const destinationCards = page.locator(`${pileSelector(move.to)} .playing-card`);
  if (await destinationCards.count()) await destinationCards.last().click();
  else await page.locator(pileSelector(move.to)).click();
}

async function expectControlsInViewport(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  for (const control of ['hint', 'auto', 'undo', 'retry', 'new-game']) {
    const box = await page.locator(`[data-control="${control}"]`).boundingBox();
    expect(box, `${control} control must be visible`).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  }
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(horizontalOverflow).toBe(false);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'solitaire-collections:v1',
      JSON.stringify({ preferences: { language: 'en' } }),
    );
    const originalNow = Date.now;
    Date.now = () => {
      const seed = new URL(location.href).searchParams.get('smokeSeed');
      return seed ? Number(seed) : originalNow();
    };
  });
});

test('all 100 games complete the deterministic UI smoke contract', async ({ page }, testInfo) => {
  test.setTimeout(10 * 60_000);
  if (testInfo.project.name === 'mobile-chrome')
    await page.setViewportSize({ width: 844, height: 390 });
  else await page.setViewportSize({ width: 1920, height: 1080 });

  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  for (const item of smokeCases) {
    await test.step(
      item.definition.id,
      async () => {
        await page.goto(`/?smokeSeed=${item.seed}`);
        await page.locator(`[data-game-id="${item.definition.id}"]`).click();
        await expect(page.locator('.game-title h1')).toHaveText(item.definition.name);
        await expectBrowserBoard(page, item.initial);
        await expectControlsInViewport(page);

        await page.locator('[data-control="help"]').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: 'Close' }).click();

        await page.locator('[data-control="hint"]').click();
        await page.locator('[data-control="retry"]').click();
        await expectBrowserBoard(page, item.initial);

        await dispatchMove(page, item.move);
        await expectBrowserBoard(page, item.expected);
        await expect(page.locator('[data-control="undo"]')).toBeEnabled();
        await page.locator('[data-control="undo"]').click();
        await expectBrowserBoard(page, item.initial);

        await dispatchMove(page, item.move);
        await expectBrowserBoard(page, item.expected);
        await page.locator('[data-control="retry"]').click();
        await expectBrowserBoard(page, item.initial);
      },
      { timeout: 15_000 },
    );
  }

  expect(pageErrors.map((error) => error.message)).toEqual([]);
});
