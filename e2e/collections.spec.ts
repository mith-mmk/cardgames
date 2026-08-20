import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'solitaire-collections:v1',
      JSON.stringify({ preferences: { language: 'en' } }),
    );
  });
});

test('shows every currently implemented game', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.game-tile')).toHaveCount(100);
  for (const name of [
    'Klondike',
    'FreeCell',
    'Spider',
    'Calculation',
    'Pyramid',
    "Baker's Game",
    'Eight Off',
    'Seahaven Towers',
    'Spiderette',
    'Yukon',
    'Forty Thieves',
    'Forty and Eight',
    'Josephine',
    'Congress',
    'Diplomat',
    'Canfield',
    'Agnes Bernauer',
    'King Albert',
    'Easthaven',
    'Westcliff',
    'Aunt Mary',
    'Scorpion',
    'Wasp',
    'Black Widow',
    'Golf',
    'Clock',
    'Agnes Sorel',
    'Australian Patience',
    'Whitehead',
    'Thumb and Pouch',
    'Blind Alleys',
    'Batsford',
    'Harp',
    'Lady Jane',
    'Bureau',
    'Athena',
    'Pas Seul',
    'Chameleon',
    'Superior Canfield',
    'Penguin',
    'Beleaguered Castle',
    'Citadel',
    'Fortress',
    'Chessboard',
    'Streets and Alleys',
    "Baker's Dozen",
    'Castles in Spain',
    'Bisley',
    'Flower Garden',
    'La Belle Lucie',
    'Shamrocks',
    'Trefoil',
    'Bear River',
    'Cruel',
    'Canister',
    'Beetle',
    'Curds and Whey',
    'Mrs Mop',
    'Russian Solitaire',
    'Alaska',
    'Brisbane',
    'Applegate',
    'Miss Milligan',
    'Interchange',
    'Busy Aces',
    'Deuces',
    'Aces and Kings',
    'Tournament',
    'Colorado',
    'Crescent',
    'Crazy Quilt',
    'Windmill',
    'Sultan',
    'Algerian Patience',
    'Indian',
    'Gypsy',
    'Carthage',
    'Carpet',
    'Bristol',
    'Sir Tommy',
    'Auld Lang Syne',
    'Osmosis',
    'Four Seasons',
    'Giza',
    'Cheops',
    'Tri-Peaks',
    'Black Hole',
    'Accordion',
    'Aces Up',
    'Monte Carlo',
    'Block Ten',
    'Fourteen Out',
    'Royal Marriage',
    'Gay Gordons',
    'Beehive',
    'Nestor',
    'Poker Squares',
    'Cribbage Squares',
    'Cribbage Solitaire',
    'Bowling Solitaire',
  ]) {
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(1);
  }
});

test('starts each added game from its menu tile', async ({ page }) => {
  for (const name of [
    "Baker's Game",
    'Eight Off',
    'Seahaven Towers',
    'Spiderette',
    'Yukon',
    'Forty Thieves',
    'Forty and Eight',
    'Josephine',
    'Congress',
    'Diplomat',
    'Canfield',
    'Agnes Bernauer',
    'King Albert',
    'Easthaven',
    'Westcliff',
    'Aunt Mary',
    'Scorpion',
    'Wasp',
    'Black Widow',
    'Golf',
    'Clock',
    'Agnes Sorel',
    'Australian Patience',
    'Whitehead',
    'Thumb and Pouch',
    'Blind Alleys',
    'Batsford',
    'Harp',
    'Lady Jane',
    'Bureau',
    'Athena',
    'Pas Seul',
    'Chameleon',
    'Superior Canfield',
    'Penguin',
    'Beleaguered Castle',
    'Citadel',
    'Fortress',
    'Chessboard',
    'Streets and Alleys',
    "Baker's Dozen",
    'Castles in Spain',
    'Bisley',
    'Flower Garden',
    'La Belle Lucie',
    'Shamrocks',
    'Trefoil',
    'Bear River',
    'Cruel',
    'Canister',
    'Beetle',
    'Curds and Whey',
    'Mrs Mop',
    'Russian Solitaire',
    'Alaska',
    'Brisbane',
    'Applegate',
    'Miss Milligan',
    'Interchange',
    'Busy Aces',
    'Deuces',
    'Aces and Kings',
    'Tournament',
    'Colorado',
    'Crescent',
    'Crazy Quilt',
    'Windmill',
    'Sultan',
    'Algerian Patience',
    'Indian',
    'Gypsy',
    'Carthage',
    'Carpet',
    'Bristol',
    'Sir Tommy',
    'Auld Lang Syne',
    'Osmosis',
    'Four Seasons',
    'Giza',
    'Cheops',
    'Tri-Peaks',
    'Black Hole',
    'Accordion',
    'Aces Up',
    'Monte Carlo',
    'Block Ten',
    'Fourteen Out',
    'Royal Marriage',
    'Gay Gordons',
    'Beehive',
    'Nestor',
    'Poker Squares',
    'Cribbage Squares',
    'Cribbage Solitaire',
    'Bowling Solitaire',
  ]) {
    await page.goto('/');
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.game-title h1')).toHaveText(name);
  }
});

test('starts a game from the whole tile and keyboard activation', async ({ page }) => {
  await page.goto('/');
  const tile = page.getByRole('button', { name: 'Klondike', exact: true });
  await tile.click();
  await expect(page.locator('.game-title h1')).toHaveText('Klondike');
  await page.locator('.back-button').click();
  await tile.focus();
  await tile.press('Enter');
  await expect(page.locator('.game-title h1')).toHaveText('Klondike');
});

test('keeps the Clock layout centred without an internal scrollbar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clock', exact: true }).click();
  const table = page.locator('.game-layout-clock .table-area');
  const board = page.locator('.game-layout-clock .board');
  const [one, four, seven, centre] = await Promise.all(
    ['clock1', 'clock4', 'clock7', 'clock13'].map((pileId) =>
      page.locator(`[data-pile-id="${pileId}"]`).boundingBox(),
    ),
  );
  expect(one).not.toBeNull();
  expect(four).not.toBeNull();
  expect(seven).not.toBeNull();
  expect(centre).not.toBeNull();

  const centreX = centre!.x + centre!.width / 2;
  const centreY = centre!.y + centre!.height / 2;
  expect(Math.abs(one!.x + one!.width / 2 - centreX)).toBeLessThan(2);
  expect(one!.y + one!.height / 2).toBeLessThan(centreY);
  expect(four!.x + four!.width / 2).toBeGreaterThan(centreX);
  expect(seven!.y + seven!.height / 2).toBeGreaterThan(centreY);

  const dimensions = await table.evaluate((element) => ({
    clientHeight: element.clientHeight,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight);
  await expect(board).toBeVisible();
});

test('keeps Poker Squares placement under player control and shows score state', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Poker Squares', exact: true }).click();
  const board = page.locator('.grid-board');
  await expect(board).toBeVisible();
  await expect(page.locator('.table-stats')).toContainText('Score 0');
  await expect(page.locator('.table-stats')).toContainText('Draw the next card');

  await page.locator('.pile-stock').click();
  await expect(page.locator('.pile-waste .playing-card.face-up')).toHaveCount(1);
  await expect(page.locator('.table-stats')).toContainText('Place the drawn card');

  const selectedCell = page.locator('[data-pile-id="g24"]');
  await selectedCell.click();
  await expect(selectedCell.locator('.playing-card.face-up')).toHaveCount(1);
  await expect(page.locator('.pile-waste .playing-card')).toHaveCount(0);
  await expect(page.locator('.table-stats')).toContainText('Draw the next card');
});

test('renders Tri-Peaks with its initial waste card, three peaks, and stock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tri-Peaks', exact: true }).click();
  await expect(page.locator('.tri-peaks-board')).toBeVisible();
  await expect(page.locator('[data-pile-id^="tri"]')).toHaveCount(28);
  await expect(page.locator('.pile-waste .playing-card.face-up')).toHaveCount(1);
  await expect(page.locator('.pile-stock .playing-card.face-down')).toHaveCount(23);

  await page.locator('.pile-stock').click();
  await expect(page.locator('.pile-waste .playing-card.face-up')).toHaveCount(2);
});

test('renders Black Hole around its central ace foundation without a stock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Black Hole', exact: true }).click();
  await expect(page.locator('.black-hole-board')).toBeVisible();
  await expect(page.locator('[data-pile-id^="black"]')).toHaveCount(17);
  await expect(page.locator('[data-pile-id="hole"]')).toContainText('A');
  await expect(page.locator('.pile-stock')).toHaveCount(0);
});

test('renders Giza as an open pyramid with eight three-card reserve piles', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Giza', exact: true }).click();
  await expect(
    page.locator('.game-giza [data-pile-id^="giza"]:not([data-pile-id^="gizaReserve"])'),
  ).toHaveCount(28);
  await expect(page.locator('.game-giza .is-covered-pyramid-pile')).toHaveCount(21);
  await expect(
    page.locator('.game-giza .pile-tableau:not(.is-covered-pyramid-pile) .playing-card'),
  ).toHaveCount(7);
  await expect(page.locator('[data-pile-id^="gizaReserve"]')).toHaveCount(8);
  await expect(page.locator('[data-pile-id="gizaReserve0"] .playing-card.face-up')).toHaveCount(3);
  const reserveCards = page.locator('[data-pile-id="gizaReserve0"] .playing-card.face-up');
  const firstReserveCard = await reserveCards.nth(0).boundingBox();
  const secondReserveCard = await reserveCards.nth(1).boundingBox();
  expect(firstReserveCard?.y).not.toBe(secondReserveCard?.y);
  await expect(page.locator('.pile-stock')).toHaveCount(0);
});

test('deals Aces Up as a four-column round and keeps empty columns as move targets', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Date.now = () => 1;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Aces Up', exact: true }).click();
  for (const pileId of ['aces0', 'aces1', 'aces2', 'aces3'])
    await expect(page.locator(`[data-pile-id="${pileId}"] .playing-card.face-up`)).toHaveCount(1);
  await expect(page.locator('.pile-stock .playing-card.face-down')).toHaveCount(48);

  await page.locator('.pile-stock').click();
  for (const pileId of ['aces0', 'aces1', 'aces2', 'aces3'])
    await expect(page.locator(`[data-pile-id="${pileId}"] .playing-card.face-up`)).toHaveCount(2);
  await expect(page.locator('.pile-stock .playing-card.face-down')).toHaveCount(44);
});

test('keeps representative games usable in compact mobile landscape', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'requires a coarse-pointer mobile viewport');
  for (const viewport of [
    { width: 568, height: 320 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    for (const game of ['Klondike', 'Spider', 'Pyramid', 'Clock', 'Aces Up', 'Giza']) {
      await page.goto('/');
      await page.getByRole('button', { name: game, exact: true }).click();
      const viewportBounds = await page.evaluate(() => ({
        height: window.innerHeight,
        width: window.innerWidth,
      }));
      const table = await page.locator('.table-area').boundingBox();
      const controls = await page.locator('.game-controls').boundingBox();
      expect(table).not.toBeNull();
      expect(controls).not.toBeNull();
      expect(table!.x + table!.width).toBeLessThanOrEqual(viewportBounds.width + 1);
      expect(controls!.x + controls!.width).toBeLessThanOrEqual(viewportBounds.width + 1);
      expect(controls!.y + controls!.height).toBeLessThanOrEqual(viewportBounds.height + 2);
      await expect(page.locator('.game-controls button')).toHaveCount(5);
      if (game === 'Aces Up') {
        const card = await page.locator('[data-pile-id="aces0"] .playing-card').boundingBox();
        expect(card).not.toBeNull();
        expect(card!.y + card!.height).toBeLessThanOrEqual(table!.y + table!.height + 1);
      }
    }
  }
});

test('starts Klondike and draws from the stock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Klondike', exact: true }).click();
  await expect(page.locator('.game-title h1')).toHaveText('Klondike');
  await expect(page.locator('.pile-stock')).toBeVisible();
  await page.locator('.pile-stock').click();
  await expect(page.locator('.table-stats')).toContainText('1');
});

test('draws when the face-down stock card itself is clicked', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Klondike', exact: true }).click();
  await page.locator('.pile-stock .playing-card.face-down').last().click();
  await expect(page.locator('.table-stats')).toContainText('1');
  await page.locator('.pile-stock .playing-card.face-down').last().click();
  await expect(page.locator('.table-stats')).toContainText('2');
});

test('draws from stock even when a card is selected', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Klondike', exact: true }).click();
  const selectedCard = page
    .locator('.pile-tableau .card-slot:last-child .playing-card.face-up')
    .first();
  await selectedCard.click();
  await expect(selectedCard).toHaveClass(/is-selected/);
  await page.locator('.pile-stock').click();
  await expect(page.locator('.table-stats')).toContainText('1');
  await expect(page.locator('.playing-card.is-selected')).toHaveCount(0);
});

test('prevents text selection on cards while retaining card controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Klondike', exact: true }).click();
  const card = page.locator('.playing-card').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('user-select', 'none');
  expect(await card.locator('img').evaluate((image) => image.draggable)).toBe(false);
  const hint = page.getByRole('button', { name: /ヒント|Hint/ });
  await expect(hint).toBeEnabled();
  await expect(hint).toHaveCSS('min-height', '44px');
});

test('changes the theme and card back in settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Klondike', exact: true }).click();
  await page.getByRole('button', { name: /設定|Settings/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .locator('.theme-swatch')
    .filter({ hasText: /アニメ調|Anime/ })
    .click();
  await page.locator('.back-picker button').nth(1).click();
  await page.getByRole('button', { name: /閉じる|Close/ }).click();
  await expect(page.locator('.playing-card.face-down .card-back').first()).toHaveAttribute(
    'src',
    /\/themes\/anime\/back-02\.svg$/,
  );
});

test('opens localized how-to-play help for the active game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await page.getByRole('button', { name: 'Klondike', exact: true }).click();
  await page.getByRole('button', { name: '遊び方' }).click();
  const japaneseDialog = page.getByRole('dialog');
  await expect(japaneseDialog).toContainText('クロンダイク の遊び方');
  await expect(japaneseDialog).toContainText('4つの完成札を、各スートのAからKまで完成させます。');
  await page.getByRole('button', { name: '閉じる' }).click();
  await page.getByRole('button', { name: '一覧へ戻る' }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Klondike', exact: true }).click();
  await page.getByRole('button', { name: 'How to play' }).click();
  const englishDialog = page.getByRole('dialog');
  await expect(englishDialog).toContainText('How to play Klondike');
  await expect(englishDialog).toContainText(
    'Build all four suit foundations from Ace through King.',
  );
});

test('moves the exact pointer-dragged card without leaving a stale selection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FreeCell', exact: true }).click();
  const source = page.locator('.pile-tableau .card-slot:last-child .playing-card').first();
  const emptyCell = page.locator('.pile-cell').first();
  await emptyCell.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await emptyCell.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(emptyCell.locator('.playing-card')).toHaveCount(1);
  await expect(page.locator('.playing-card.is-selected')).toHaveCount(0);
  await expect(page.locator('.table-stats')).toContainText('1');
});

test('moves a FreeCell card with pointer drag', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FreeCell', exact: true }).click();
  const source = page.locator('.pile-tableau .card-slot:last-child .playing-card.face-up').first();
  const target = page.locator('.pile-cell').first();
  await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator('.pile-cell .playing-card')).toHaveCount(1);
  await expect(page.locator('.playing-card.is-selected')).toHaveCount(0);
});

test('shows a pointer-following ghost for the legal moving card only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FreeCell', exact: true }).click();
  const source = page.locator('.pile-tableau .card-slot:last-child .playing-card.face-up').first();
  const sourceBox = await source.boundingBox();
  expect(sourceBox).not.toBeNull();

  const startX = sourceBox!.x + sourceBox!.width / 2;
  const startY = sourceBox!.y + sourceBox!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 24, startY + 24, { steps: 2 });
  await expect(page.locator('.drag-ghost')).toBeVisible();
  await expect(page.locator('.drag-ghost-card')).toHaveCount(1);
  await expect(source).toHaveCSS('opacity', '0');
  const firstGhostBox = await page.locator('.drag-ghost').boundingBox();
  expect(firstGhostBox).not.toBeNull();

  await page.mouse.move(startX + 64, startY + 48, { steps: 2 });
  await expect
    .poll(async () => (await page.locator('.drag-ghost').boundingBox())?.x ?? -Infinity)
    .toBeGreaterThan(firstGhostBox!.x + 20);
  await page.mouse.up();
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
});

test('recovers from an interrupted drag and accepts the next card move', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FreeCell', exact: true }).click();
  const source = page.locator('.pile-tableau .card-slot:last-child .playing-card.face-up').first();
  const target = page.locator('.pile-cell').first();
  await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  expect(sourceBox).not.toBeNull();

  const startX = sourceBox!.x + sourceBox!.width / 2;
  const startY = sourceBox!.y + sourceBox!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 24, startY + 24, { steps: 2 });
  await expect(page.locator('.drag-ghost')).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.up();
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await expect(source).toHaveCSS('opacity', '1');

  const retrySourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(retrySourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(
    retrySourceBox!.x + retrySourceBox!.width / 2,
    retrySourceBox!.y + retrySourceBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(target.locator('.playing-card')).toHaveCount(1);
});

test('ignores a non-primary pointer drag', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FreeCell', exact: true }).click();
  const source = page.locator('.pile-tableau .card-slot:last-child .playing-card.face-up').first();
  const sourceBox = await source.boundingBox();
  expect(sourceBox).not.toBeNull();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.click(
    sourceBox!.x + sourceBox!.width / 2,
    sourceBox!.y + sourceBox!.height / 2,
    { button: 'right' },
  );
  await expect(page.locator('.playing-card.is-selected')).toHaveCount(0);
});

test('moves a selected FreeCell card to a highlighted empty cell by click', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FreeCell', exact: true }).click();
  const source = page.locator('.pile-tableau .card-slot:last-child .playing-card.face-up').first();
  await source.click();
  await expect(source).toHaveClass(/is-selected/);
  const target = page.locator('.pile-cell.is-legal-target').first();
  await expect(target).toBeVisible();
  await target.click();
  await expect(page.locator('.pile-cell .playing-card')).toHaveCount(1);
  await expect(page.locator('.playing-card.is-selected')).toHaveCount(0);
});

test('supports Enter on a face-up card and Space on an empty pile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FreeCell', exact: true }).click();
  const source = page.locator('.pile-tableau .card-slot:last-child .playing-card.face-up').first();
  await source.focus();
  await source.press('Enter');
  await expect(source).toHaveClass(/is-selected/);
  const target = page.locator('.pile-cell.is-legal-target').first();
  await target.focus();
  await target.press('Space');
  await expect(page.locator('.pile-cell .playing-card')).toHaveCount(1);
  await expect(page.locator('.playing-card.is-selected')).toHaveCount(0);
});

test('supports keyboard draw on the stock pile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Klondike', exact: true }).click();
  const stock = page.locator('.pile-stock');
  await stock.focus();
  await stock.press('Enter');
  await expect(page.locator('.table-stats')).toContainText('1');
});

test('double-clicks an exposed ace to its foundation exactly once', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FreeCell', exact: true }).click();
  let ace = page
    .locator('.pile-tableau .card-slot:last-child .playing-card[data-rank="A"]')
    .first();
  for (let attempt = 0; attempt < 80 && (await ace.count()) === 0; attempt += 1) {
    await page.getByRole('button', { name: /新しいゲーム|New game/ }).click();
    ace = page.locator('.pile-tableau .card-slot:last-child .playing-card[data-rank="A"]').first();
  }
  await expect(ace).toBeVisible();
  const foundationsBefore = await page.locator('.pile-foundation .playing-card').count();
  await ace.dispatchEvent('dblclick');
  await expect(page.locator('.action-status')).toContainText(
    /自動で移動しました|Moved automatically/,
    { timeout: 1000 },
  );
  await expect(page.locator('.pile-foundation .playing-card')).toHaveCount(foundationsBefore + 1);
});

test('keeps pyramid interaction on exposed cards and removes an exposed king in one tap', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pyramid', exact: true }).click();
  await expect(page.locator('.game-pyramid .pile-tableau.is-covered-pyramid-pile')).toHaveCount(21);
  await expect(
    page.locator('.game-pyramid .pile-tableau:not(.is-covered-pyramid-pile) .playing-card'),
  ).toHaveCount(7);

  let king = page
    .locator(
      '.game-pyramid .pile-tableau:not(.is-covered-pyramid-pile) .playing-card[data-rank="K"]',
    )
    .first();
  for (let attempt = 0; attempt < 80 && (await king.count()) === 0; attempt += 1) {
    await page.getByRole('button', { name: /新しいゲーム|New game/ }).click();
    king = page
      .locator(
        '.game-pyramid .pile-tableau:not(.is-covered-pyramid-pile) .playing-card[data-rank="K"]',
      )
      .first();
  }
  await expect(king).toBeVisible();
  const removedBefore = await page.locator('.pile-removed .playing-card').count();
  await king.click();
  await expect(page.locator('.pile-removed .playing-card')).toHaveCount(removedBefore + 1);
  await expect(page.locator('.pile-tableau.is-empty-pyramid-pile')).toHaveCount(1);
});

test('pairs an exposed pyramid card with the drawn waste card', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pyramid', exact: true }).click();
  const rank = (value: string) => {
    return ({ A: 1, J: 11, Q: 12, K: 13 } as Record<string, number>)[value] ?? Number(value);
  };
  const newGame = page.getByRole('button', { name: /新しいゲーム|New game/ });
  let paired = false;

  for (let attempt = 0; attempt < 80 && !paired; attempt += 1) {
    if (attempt > 0) await newGame.click();
    await page.locator('.pile-stock').click();
    const waste = page.locator('.pile-waste .playing-card').last();
    if ((await waste.count()) === 0) continue;
    const wasteRank = await waste.getAttribute('data-rank');
    if (!wasteRank || rank(wasteRank) === 13) continue;
    const exposed = page.locator(
      '.game-pyramid .pile-tableau:not(.is-covered-pyramid-pile) .playing-card',
    );
    const targetRank = 13 - rank(wasteRank);
    let target = -1;
    for (let index = 0; index < (await exposed.count()); index += 1) {
      const exposedRank = await exposed.nth(index).getAttribute('data-rank');
      if (exposedRank && rank(exposedRank) === targetRank) {
        target = index;
        break;
      }
    }
    if (target < 0) continue;

    const removedBefore = await page.locator('.pile-removed .playing-card').count();
    await waste.click();
    await expect(waste).toHaveClass(/is-selected/);
    await exposed.nth(target).click();
    await expect(page.locator('.pile-removed .playing-card')).toHaveCount(removedBefore + 2);
    paired = true;
  }

  expect(paired).toBe(true);
});

test('does not begin a drag ghost for a pyramid removal card', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pyramid', exact: true }).click();
  const card = page
    .locator('.game-pyramid .pile-tableau:not(.is-covered-pyramid-pile) .playing-card')
    .first();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 24, box!.y + box!.height / 2 + 24, { steps: 2 });
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await page.mouse.up();
});
