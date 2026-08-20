import type { GameDefinition } from './types';

/** A localized string used by the catalog and the in-game help. */
export type LocalizedText = Readonly<{ ja: string; en: string }>;

/** The three small, actionable steps shown in the help dialog. */
export type HelpGuide = Readonly<{
  goal: string;
  steps: readonly [string, string, string];
}>;

export type LocalizedHelp = Readonly<{
  ja: HelpGuide;
  en: HelpGuide;
}>;

export type ExpansionCatalogEntry = Omit<GameDefinition, 'id'> & {
  help: LocalizedHelp;
};

export type ExpansionGameId =
  | 'agnes-sorel'
  | 'australian-patience'
  | 'whitehead'
  | 'thumb-and-pouch'
  | 'blind-alleys'
  | 'batsford'
  | 'harp'
  | 'lady-jane'
  | 'bureau'
  | 'athena'
  | 'pas-seul'
  | 'chameleon'
  | 'superior-canfield'
  | 'penguin'
  | 'beleaguered-castle'
  | 'citadel'
  | 'fortress'
  | 'chessboard'
  | 'streets-and-alleys'
  | 'bakers-dozen'
  | 'castles-in-spain'
  | 'bisley'
  | 'flower-garden'
  | 'la-belle-lucie'
  | 'shamrocks'
  | 'trefoil'
  | 'bear-river'
  | 'cruel'
  | 'canister'
  | 'beetle'
  | 'curds-and-whey'
  | 'mrs-mop'
  | 'russian-solitaire'
  | 'alaska'
  | 'brisbane'
  | 'applegate'
  | 'miss-milligan'
  | 'interchange'
  | 'busy-aces'
  | 'deuces'
  | 'aces-and-kings'
  | 'tournament'
  | 'colorado'
  | 'crescent'
  | 'crazy-quilt'
  | 'windmill'
  | 'sultan'
  | 'algerian-patience'
  | 'indian'
  | 'gypsy'
  | 'carthage'
  | 'carpet'
  | 'bristol'
  | 'sir-tommy'
  | 'auld-lang-syne'
  | 'osmosis'
  | 'four-seasons'
  | 'giza'
  | 'cheops'
  | 'tri-peaks'
  | 'black-hole'
  | 'accordion'
  | 'aces-up'
  | 'monte-carlo'
  | 'block-ten'
  | 'fourteen-out'
  | 'royal-marriage'
  | 'gay-gordons'
  | 'beehive'
  | 'nestor'
  | 'poker-squares'
  | 'cribbage-squares'
  | 'cribbage-solitaire'
  | 'bowling-solitaire';

const families = {
  klondike: { ja: 'クロンダイク系', en: 'Klondike family' },
  openCell: { ja: '全面公開・空きセル系', en: 'Open-cell family' },
  longRun: { ja: 'スパイダー・ユーコン系', en: 'Long-run family' },
  special: { ja: '特殊完成札・配置系', en: 'Special foundations and layouts' },
  removal: { ja: 'カード除去・得点系', en: 'Removal and scoring games' },
} as const;

function entry(
  name: LocalizedText,
  family: LocalizedText,
  description: LocalizedText,
  difficulty: 1 | 2 | 3 | 4 | 5,
  decks: 1 | 2,
  accent: string,
  jaGoal: string,
  jaSteps: readonly [string, string, string],
  enGoal: string,
  enSteps: readonly [string, string, string],
): ExpansionCatalogEntry {
  return {
    name,
    family,
    description,
    difficulty,
    decks,
    accent,
    help: {
      ja: { goal: jaGoal, steps: jaSteps },
      en: { goal: enGoal, steps: enSteps },
    },
  };
}

/**
 * Localized catalog metadata for the 74 games added by waves 0.2 through 0.6.
 *
 * The keys intentionally use the engine IDs. Keeping this record independent
 * from the engine lets the catalog be loaded before a native platform bundle
 * has initialized its game registry.
 */
export const EXPANSION_CATALOG = {
  'agnes-sorel': entry(
    { ja: 'アグネス・ソレル', en: 'Agnes Sorel' },
    families.klondike,
    {
      ja: '場へ追加配札されるクロンダイク派生です。',
      en: 'A Klondike variant with extra deals to the tableau.',
    },
    4,
    1,
    '#cf7d9f',
    '追加配札を使いながら、4つの完成札を作ります。',
    [
      '表向きのカードを交互色の降順に重ねる。',
      '空いた列を活用して裏向きのカードをめくる。',
      '同じスートの完成札へAから順に送る。',
    ],
    'Build four foundations while managing extra tableau deals.',
    [
      'Build descending alternating-color runs.',
      'Use empty columns to reveal hidden cards.',
      'Send each suit to its foundation from Ace upward.',
    ],
  ),
  'australian-patience': entry(
    { ja: 'オーストラリアン・ペイシェンス', en: 'Australian Patience' },
    families.klondike,
    {
      ja: '同じスートの降順列を作るクロンダイク派生です。',
      en: 'A Klondike variant built with same-suit descending runs.',
    },
    5,
    1,
    '#d29465',
    '同じスートの列を整理して全カードを完成札へ送ります。',
    [
      '場札では同じスートの降順に重ねる。',
      '空列にはKを置いて列を再編成する。',
      '表向きのAから完成札を育てる。',
    ],
    'Arrange same-suit runs and move every card to the foundations.',
    [
      'Build descending same-suit tableau runs.',
      'Use Kings to restart empty columns.',
      'Build foundations upward from exposed Aces.',
    ],
  ),
  whitehead: entry(
    { ja: 'ホワイトヘッド', en: 'Whitehead' },
    families.klondike,
    {
      ja: '表向きのカードを同じスートで整理します。',
      en: 'An open tableau arranged into same-suit runs.',
    },
    4,
    1,
    '#b5a56e',
    '公開された場札を同じスートの完成列へまとめます。',
    [
      '同じスートの降順列を作る。',
      '空列と山札を使ってカードを公開する。',
      '完成した列を同じスートの基礎へ移す。',
    ],
    'Move the open tableau into complete same-suit foundations.',
    [
      'Build descending runs by suit.',
      'Use empty columns and the stock to expose cards.',
      'Move completed sequences to the foundations.',
    ],
  ),
  'thumb-and-pouch': entry(
    { ja: 'サム・アンド・ポーチ', en: 'Thumb and Pouch' },
    families.klondike,
    {
      ja: '予備札を計画的に使うクロンダイク派生です。',
      en: 'A Klondike variant with a strategic reserve.',
    },
    4,
    1,
    '#b77b5f',
    '予備札と場札を組み替えて完成札を育てます。',
    [
      '予備札から使えるカードを見つける。',
      '場札を交互色の降順に重ねる。',
      'Aから同じスートの完成札を作る。',
    ],
    'Coordinate the reserve and tableau to build the foundations.',
    [
      'Choose useful cards from the reserve.',
      'Build descending alternating-color runs.',
      'Build same-suit foundations from the Aces.',
    ],
  ),
  'blind-alleys': entry(
    { ja: 'ブラインド・アレイズ', en: 'Blind Alleys' },
    families.klondike,
    {
      ja: '予備札と山札の順序管理が重要な派生です。',
      en: 'A reserve and stock-order management variant.',
    },
    4,
    1,
    '#ad7793',
    '行き止まりを避けながら、すべてのカードを完成札へ送ります。',
    [
      '先に裏向きカードをめくる手順を考える。',
      '予備札を空けて移動先を作る。',
      '山札の順番を活かして完成札を伸ばす。',
    ],
    'Avoid dead ends while moving the entire deal to the foundations.',
    [
      'Plan which moves reveal facedown cards.',
      'Clear reserve spaces to create destinations.',
      'Use the stock order to extend foundations.',
    ],
  ),
  batsford: entry(
    { ja: 'バッツフォード', en: 'Batsford' },
    families.klondike,
    {
      ja: '2組のカードを使う広いクロンダイクです。',
      en: 'A wide Klondike layout using two decks.',
    },
    5,
    2,
    '#c77872',
    '2組104枚を整理し、8つの完成札を完成させます。',
    [
      '場札を交互色の降順に積む。',
      '空列にはKを置いて長い列を動かす。',
      '8つの同じスートの完成札へ送る。',
    ],
    'Arrange two decks and complete eight foundations.',
    [
      'Build alternating-color descending tableau runs.',
      'Use Kings to fill empty columns and move long runs.',
      'Build eight same-suit foundations.',
    ],
  ),
  harp: entry(
    { ja: 'ハープ', en: 'Harp' },
    families.klondike,
    {
      ja: '2組の長い列を整理するクロンダイク派生です。',
      en: 'A two-deck Klondike variant with long tableau runs.',
    },
    5,
    2,
    '#cf9c5e',
    '長い場札を崩さずに8つの完成札を作ります。',
    [
      '交互色の降順列をできるだけ長く保つ。',
      '裏向きカードの下の列を優先して開く。',
      '完成札へ安全にAから送る。',
    ],
    'Build eight foundations without losing access to long tableau runs.',
    [
      'Keep descending alternating-color runs intact.',
      'Prioritize columns hiding facedown cards.',
      'Send safe cards to foundations from the Aces.',
    ],
  ),
  'lady-jane': entry(
    { ja: 'レディ・ジェーン', en: 'Lady Jane' },
    families.klondike,
    {
      ja: '2組・9列で遊ぶクロンダイク系ゲームです。',
      en: 'A two-deck, nine-column Klondike family game.',
    },
    5,
    2,
    '#a86b9c',
    '9列の場札を整理して8つの完成札へ送ります。',
    [
      '9列に交互色の降順列を作る。',
      '空列と山札で裏向きカードを公開する。',
      '各スートをAからKまで完成させる。',
    ],
    'Arrange nine tableau columns and complete eight foundations.',
    [
      'Build alternating-color descending runs in nine columns.',
      'Reveal facedown cards using empty columns and the stock.',
      'Complete every suit from Ace through King.',
    ],
  ),
  bureau: entry(
    { ja: 'ビューロー', en: 'Bureau' },
    families.klondike,
    {
      ja: '大きな予備札を使う2組のクロンダイク派生です。',
      en: 'A two-deck variant with a large reserve.',
    },
    5,
    2,
    '#a9775c',
    '予備札を整理しながら、8つの完成札を作ります。',
    [
      '予備札の上から順に使えるカードを探す。',
      '場札を交互色の降順に並べる。',
      '完成したカードを8つの基礎へ移す。',
    ],
    'Clear the large reserve while building eight foundations.',
    [
      'Find playable cards from the top of the reserve.',
      'Arrange alternating-color descending tableau runs.',
      'Move completed cards to the eight foundations.',
    ],
  ),
  athena: entry(
    { ja: 'アテナ', en: 'Athena' },
    families.klondike,
    {
      ja: '予備札を併用する2組のクロンダイク派生です。',
      en: 'A two-deck Klondike variant with reserve cards.',
    },
    5,
    2,
    '#688db3',
    '場札と予備札を切り替え、8つの完成札へ送ります。',
    [
      '場札では交互色の降順に重ねる。',
      '予備札のカードを詰まらせない。',
      '8つの完成札をAから育てる。',
    ],
    'Balance tableau and reserve cards while completing eight foundations.',
    [
      'Build descending alternating-color tableau runs.',
      'Keep reserve cards from becoming blocked.',
      'Build all eight foundations from the Aces.',
    ],
  ),
  'pas-seul': entry(
    { ja: 'パ・スール', en: 'Pas Seul' },
    families.klondike,
    {
      ja: '6列で遊ぶコンパクトなクロンダイク派生です。',
      en: 'A compact six-column Klondike variant.',
    },
    3,
    1,
    '#8d9e6a',
    '少ない場札を効率よく動かして完成札を作ります。',
    ['6列を交互色の降順に整える。', '空いた列で裏向きカードをめくる。', 'Aから4つの完成札へ送る。'],
    'Use the small tableau efficiently to complete four foundations.',
    [
      'Arrange six columns in descending alternating colors.',
      'Use empty columns to reveal facedown cards.',
      'Build four foundations from the Aces.',
    ],
  ),
  chameleon: entry(
    { ja: 'カメレオン', en: 'Chameleon' },
    families.klondike,
    {
      ja: '2組と予備札を組み合わせた変則クロンダイクです。',
      en: 'A flexible two-deck Klondike game with a reserve.',
    },
    5,
    2,
    '#6d9f86',
    '変化する移動先を見極め、8つの完成札を作ります。',
    [
      '予備札と場札の両方から候補を選ぶ。',
      '交互色の降順列を崩しすぎない。',
      'Aから同じスートの完成札を伸ばす。',
    ],
    'Choose flexible destinations and complete eight foundations.',
    [
      'Look for candidates in both reserve and tableau.',
      'Avoid breaking useful alternating-color runs.',
      'Extend same-suit foundations from the Aces.',
    ],
  ),
  'superior-canfield': entry(
    { ja: 'スペリア・キャンフィールド', en: 'Superior Canfield' },
    families.klondike,
    {
      ja: '13枚の予備札を使うキャンフィールド派生です。',
      en: 'A Canfield variant with a thirteen-card reserve.',
    },
    4,
    1,
    '#bd8155',
    '13枚の予備札を使い切り、循環する完成札を作ります。',
    [
      '予備札の上から動かせるカードを使う。',
      '場札を交互色の降順に重ねる。',
      '完成札は開始ランクから循環させる。',
    ],
    'Empty the thirteen-card reserve and build cyclic foundations.',
    [
      'Play available cards from the top of the reserve.',
      'Build descending alternating-color tableau runs.',
      'Build each foundation cyclically from its starting rank.',
    ],
  ),

  penguin: entry(
    { ja: 'ペンギン', en: 'Penguin' },
    families.openCell,
    {
      ja: '空きセルを使い、同じスートの列を作ります。',
      en: 'Use open cells while building same-suit columns.',
    },
    4,
    1,
    '#5fa8c8',
    '空きセルを管理して4つの同じスート完成札を作ります。',
    [
      '空きセルへカードを一時退避する。',
      '場札を同じスートの降順に重ねる。',
      'Aから完成札を順番に埋める。',
    ],
    'Manage open cells to complete four same-suit foundations.',
    [
      'Park cards temporarily in the open cells.',
      'Build descending same-suit tableau runs.',
      'Fill foundations upward from the Aces.',
    ],
  ),
  'beleaguered-castle': entry(
    { ja: 'ビリジャード・キャッスル', en: 'Beleaguered Castle' },
    families.openCell,
    {
      ja: '全公開の8列を空きセルで整理します。',
      en: 'Arrange eight fully exposed columns with open cells.',
    },
    4,
    1,
    '#688bc4',
    '全公開された8列から、4つの完成札を作ります。',
    [
      '空きセルへカードを退避する。',
      '場札の列を交互色の降順に作る。',
      '空いた列を使って完成札を進める。',
    ],
    'Turn the eight open columns into four foundations.',
    [
      'Use open cells as temporary parking.',
      'Build descending alternating-color columns.',
      'Use empty columns to advance the foundations.',
    ],
  ),
  citadel: entry(
    { ja: 'シタデル', en: 'Citadel' },
    families.openCell,
    {
      ja: '公開列を整理し、空きセルから完成札へ送ります。',
      en: 'Rearrange open columns and build the foundations.',
    },
    4,
    1,
    '#6f9ebc',
    '公開されたカードを動かし、4つの完成札を埋めます。',
    [
      '空きセルを一時置き場として使う。',
      '交互色の降順で列を整理する。',
      'Aから同じスートの基礎を伸ばす。',
    ],
    'Rearrange the open cards and fill four foundations.',
    [
      'Use cells as temporary holding spaces.',
      'Arrange columns in descending alternating colors.',
      'Extend same-suit foundations from the Aces.',
    ],
  ),
  fortress: entry(
    { ja: 'フォートレス', en: 'Fortress' },
    families.openCell,
    {
      ja: '8列の長い公開カードを移動する空きセル系です。',
      en: 'An open-cell game with long, exposed columns.',
    },
    5,
    1,
    '#557fa8',
    '長い8列を整理して、4つの完成札を完成させます。',
    [
      '動かす列の先頭を空きセルで調整する。',
      '同じスートの降順列を保つ。',
      '空列へ移して新しい組み合わせを作る。',
    ],
    'Organize eight long columns and complete four foundations.',
    [
      'Use cells to adjust the head of a moving run.',
      'Preserve descending same-suit sequences.',
      'Use empty columns to create new combinations.',
    ],
  ),
  chessboard: entry(
    { ja: 'チェスボード', en: 'Chessboard' },
    families.openCell,
    {
      ja: '王を空列へ置くルールの空きセル系です。',
      en: 'An open-cell game where Kings open empty columns.',
    },
    5,
    1,
    '#8299d1',
    '空列を王で再利用しながら、4つの完成札を作ります。',
    [
      '空きセルにカードを退避する。',
      '空列にはKを置いて列を再開する。',
      '同じスートの完成札をAから伸ばす。',
    ],
    'Reuse empty columns with Kings while completing four foundations.',
    [
      'Park cards in the open cells.',
      'Restart empty columns with Kings.',
      'Build same-suit foundations upward from Aces.',
    ],
  ),
  'streets-and-alleys': entry(
    { ja: 'ストリーツ・アンド・アレイズ', en: 'Streets and Alleys' },
    families.openCell,
    {
      ja: '8列を同じスートの降順に並べるゲームです。',
      en: 'Build descending same-suit runs across eight columns.',
    },
    5,
    1,
    '#4f9e8c',
    '8列を整理し、すべてのカードを完成札へ送ります。',
    ['同じスートの降順列を作る。', '空きセルで一時的に列を分ける。', 'Aから完成札を順に進める。'],
    'Arrange eight columns and move every card to the foundations.',
    [
      'Build descending same-suit runs.',
      'Split runs temporarily through open cells.',
      'Advance foundations from the Aces.',
    ],
  ),
  'bakers-dozen': entry(
    { ja: 'ベーカーズ・ダズン', en: "Baker's Dozen" },
    families.openCell,
    {
      ja: '13列の公開カードを整理する空きセル系です。',
      en: 'Arrange thirteen fully exposed columns.',
    },
    4,
    1,
    '#8ba36b',
    '13列のカードを整理し、4つの完成札を作ります。',
    [
      '列の上から動かせるカードを選ぶ。',
      '空き列へカードを移して組み替える。',
      '同じスートの完成札を育てる。',
    ],
    'Rearrange thirteen columns and complete four foundations.',
    [
      'Choose playable cards from the column tops.',
      'Move cards to empty columns to reorganize.',
      'Build same-suit foundations.',
    ],
  ),
  'castles-in-spain': entry(
    { ja: 'キャッスルズ・イン・スペイン', en: 'Castles in Spain' },
    families.openCell,
    {
      ja: '王だけが空列へ入れる空きセル派生です。',
      en: 'An open-cell variant where only Kings enter empty columns.',
    },
    5,
    1,
    '#6f7fb8',
    '王で空列を開き、公開カードを4つの完成札へ送ります。',
    ['空きセルへカードを退避する。', '空列にはKだけを置く。', '交互色の列と完成札を同時に進める。'],
    'Open columns with Kings and build four foundations.',
    [
      'Use open cells as temporary storage.',
      'Place only Kings in empty columns.',
      'Advance alternating-color columns and foundations together.',
    ],
  ),
  bisley: entry(
    { ja: 'ビズリー', en: 'Bisley' },
    families.openCell,
    {
      ja: '全公開カードを同じスートで積み上げます。',
      en: 'Build same-suit stacks from a fully exposed deal.',
    },
    5,
    1,
    '#859c68',
    '公開されたカードを動かし、4つの基礎を完成させます。',
    [
      '同じスートの降順列を作る。',
      '空き列を使ってカードの順番を整える。',
      'AからKまで完成札を伸ばす。',
    ],
    'Reorder the exposed cards and complete four foundations.',
    [
      'Build descending same-suit runs.',
      'Use empty columns to repair card order.',
      'Build each foundation from Ace to King.',
    ],
  ),
  'flower-garden': entry(
    { ja: 'フラワー・ガーデン', en: 'Flower Garden' },
    families.openCell,
    {
      ja: '16枚の予備札と花束状の場札を使います。',
      en: 'Use sixteen reserve cards and flower-like tableau piles.',
    },
    4,
    1,
    '#d59b68',
    '16枚の予備札を活用して4つの完成札を作ります。',
    ['予備札の上からカードを選ぶ。', '場札を交互色の降順に重ねる。', '同じスートの完成札へ送る。'],
    'Use the sixteen-card reserve to complete four foundations.',
    [
      'Play cards from the top of the reserve.',
      'Build descending alternating-color tableau runs.',
      'Send cards to same-suit foundations.',
    ],
  ),
  'la-belle-lucie': entry(
    { ja: 'ラ・ベル・ルーシー', en: 'La Belle Lucie' },
    families.openCell,
    {
      ja: '16個の扇形の場札を整理し、再配札します。',
      en: 'Arrange sixteen fan-shaped piles with redeals.',
    },
    5,
    1,
    '#bb83a4',
    '扇形の場札を整理し、再配札を使い切る前に完成札を作ります。',
    [
      '各扇の先頭カードだけを動かす。',
      '再配札で詰まった扇を組み替える。',
      '同じスートの完成札をAから伸ばす。',
    ],
    'Clear the fan-shaped tableau before exhausting redeals.',
    [
      'Move only the exposed card of each fan.',
      'Redeal to rearrange blocked fans.',
      'Build same-suit foundations from the Aces.',
    ],
  ),
  shamrocks: entry(
    { ja: 'シャムロックス', en: 'Shamrocks' },
    families.openCell,
    { ja: '扇形の場札を同じスートで整理します。', en: 'Arrange fan piles into same-suit runs.' },
    5,
    1,
    '#70a886',
    '16個の扇を整理して、4つの完成札を作ります。',
    [
      '扇の先頭カードを確認する。',
      '同じスートの降順で重ねる。',
      '再配札を使って隠れたカードを出す。',
    ],
    'Clear sixteen fans and complete four foundations.',
    [
      'Check the exposed card of each fan.',
      'Build descending same-suit runs.',
      'Redeal to expose blocked cards.',
    ],
  ),
  trefoil: entry(
    { ja: 'トレフォイル', en: 'Trefoil' },
    families.openCell,
    {
      ja: '4つの予備札と16個の扇を使うゲームです。',
      en: 'Use four reserve cards with sixteen fan piles.',
    },
    5,
    1,
    '#6d9f86',
    '予備札と扇を管理して4つの完成札を作ります。',
    [
      '予備札を必要なカードのために空ける。',
      '扇の先頭を同じスートの降順に移す。',
      'Aから完成札を伸ばす。',
    ],
    'Manage four reserves and sixteen fans to build the foundations.',
    [
      'Keep reserve spaces for critical cards.',
      'Move fan tops into descending same-suit runs.',
      'Build foundations upward from Aces.',
    ],
  ),
  'bear-river': entry(
    { ja: 'ベア・リバー', en: 'Bear River' },
    families.openCell,
    {
      ja: '空きセルと王のみの空列を使う公開系ゲームです。',
      en: 'An open tableau game with cells and King-only empty columns.',
    },
    5,
    1,
    '#5a967f',
    '空きセルを使いながら公開列を完成札へ送ります。',
    ['セルへカードを一時退避する。', '空列にはKから列を作る。', '交互色の列と完成札を進める。'],
    'Use cells while moving the open columns to the foundations.',
    [
      'Park cards in the cells.',
      'Start empty columns with Kings.',
      'Advance alternating-color runs and foundations.',
    ],
  ),
  cruel: entry(
    { ja: 'クルーエル', en: 'Cruel' },
    families.openCell,
    {
      ja: '12列を再配札しながら同じスートで整理します。',
      en: 'Re-deal twelve piles while building same-suit runs.',
    },
    5,
    1,
    '#7c9c72',
    '列をまとめて再配札し、すべてのカードを完成札へ送ります。',
    [
      '各列の先頭カードを動かす。',
      '再配札で列の順序を組み替える。',
      '同じスートの完成札をAから伸ばす。',
    ],
    'Re-deal the piles and move every card to the foundations.',
    [
      'Play the exposed card of each pile.',
      'Redeal to change the pile order.',
      'Build same-suit foundations from the Aces.',
    ],
  ),
  canister: entry(
    { ja: 'キャニスター', en: 'Canister' },
    families.openCell,
    {
      ja: '10列・2予備札で公開列を整理します。',
      en: 'Arrange ten open columns with two reserve cells.',
    },
    5,
    1,
    '#849f65',
    '10列と2つの予備札を使い、4つの完成札を作ります。',
    [
      '予備札を空けて移動先を確保する。',
      '交互色の列を組み替える。',
      '空列には王を置き、完成札を進める。',
    ],
    'Use ten columns and two reserves to complete four foundations.',
    [
      'Clear reserves to create destinations.',
      'Rearrange alternating-color columns.',
      'Use Kings in empty columns and advance foundations.',
    ],
  ),

  beetle: entry(
    { ja: 'ビートル', en: 'Beetle' },
    families.longRun,
    {
      ja: '長い同じスート列を作って取り除きます。',
      en: 'Build and remove long same-suit sequences.',
    },
    4,
    2,
    '#b47f9c',
    '同じスートのKからAまでの列を完成させて除去します。',
    [
      '場札で同じスートの降順列を作る。',
      '空列へ任意のカードを置く。',
      'KからAの完成列を自動的に取り除く。',
    ],
    'Complete and remove same-suit King-to-Ace sequences.',
    [
      'Build descending same-suit runs in the tableau.',
      'Use empty columns for any card.',
      'Remove completed King-to-Ace sequences.',
    ],
  ),
  'curds-and-whey': entry(
    { ja: 'カード・アンド・ホエイ', en: 'Curds and Whey' },
    families.longRun,
    {
      ja: '長い列と追加配札を組み合わせたゲームです。',
      en: 'Combine long runs with additional tableau deals.',
    },
    5,
    2,
    '#a87893',
    '追加配札を受けながら、完成列をすべて取り除きます。',
    [
      '場札を同じスートの降順に整える。',
      '列の一部をまとめて移動する。',
      '配札後も完成列を優先して除去する。',
    ],
    'Remove every completed run while managing extra deals.',
    [
      'Arrange tableau cards in descending same-suit runs.',
      'Move valid suffixes as groups.',
      'Prioritize completed runs after each deal.',
    ],
  ),
  'mrs-mop': entry(
    { ja: 'ミセス・モップ', en: 'Mrs Mop' },
    families.longRun,
    {
      ja: 'スパイダー型の列を整理して完成させます。',
      en: 'A Spider-style game of organizing long columns.',
    },
    5,
    2,
    '#bd7693',
    '長い場札を同じスートに揃え、完成列を除去します。',
    [
      '同じスートの降順列を作る。',
      '空列へKを置いて列を再編成する。',
      'KからAの列を完成させて除去する。',
    ],
    'Align long tableau runs by suit and remove completed sequences.',
    [
      'Build descending same-suit runs.',
      'Use Kings to restart empty columns.',
      'Complete and remove King-to-Ace sequences.',
    ],
  ),
  'russian-solitaire': entry(
    { ja: 'ロシアン・ソリティア', en: 'Russian Solitaire' },
    families.longRun,
    {
      ja: 'ユーコン型に同じスートの列を重ねます。',
      en: 'A Yukon-style game with same-suit tableau runs.',
    },
    5,
    1,
    '#8d759e',
    '表向きの列をまとめて移動し、4つの完成札を作ります。',
    [
      '表向きのカード列をそのまま選ぶ。',
      '移動先では降順・同じスートにする。',
      '裏向きカードをめくって完成札へ送る。',
    ],
    'Move face-up groups and complete four foundations.',
    [
      'Select a valid face-up suffix as a group.',
      'Build descending same-suit destinations.',
      'Reveal facedown cards and send them to foundations.',
    ],
  ),
  alaska: entry(
    { ja: 'アラスカ', en: 'Alaska' },
    families.longRun,
    {
      ja: 'ユーコン型の列移動と特殊な降順ルールを使います。',
      en: 'A Yukon-style game with a distinctive descending rule.',
    },
    5,
    1,
    '#7f8db0',
    '列をまとめて動かし、すべてのカードを完成札へ送ります。',
    [
      '表向きの列をまとめて選択する。',
      '移動先のルールに合う順序で重ねる。',
      '空いた場所を使って裏向きカードを開く。',
    ],
    'Move face-up groups and send the entire deal to the foundations.',
    [
      'Select face-up groups as a unit.',
      'Build in the variant’s permitted order.',
      'Use cleared spaces to reveal facedown cards.',
    ],
  ),
  brisbane: entry(
    { ja: 'ブリスベン', en: 'Brisbane' },
    families.longRun,
    {
      ja: '列の移動と山札の配札を組み合わせます。',
      en: 'Combine tableau-group moves with stock deals.',
    },
    4,
    1,
    '#7c9aaf',
    '山札を使いながら列を整理し、完成札を作ります。',
    [
      '表向きの列をまとめて移動する。',
      '山札からのカードで列を延ばす。',
      'Aから同じスートの完成札を進める。',
    ],
    'Use the stock while organizing groups into foundations.',
    [
      'Move face-up tableau groups together.',
      'Extend columns with stock cards.',
      'Build same-suit foundations from the Aces.',
    ],
  ),
  applegate: entry(
    { ja: 'アップルゲート', en: 'Applegate' },
    families.longRun,
    {
      ja: '長い列を組み替えて完成列を作ります。',
      en: 'Rearrange long columns into completed runs.',
    },
    5,
    1,
    '#8e779c',
    '列を組み替え、同じスートの完成列を取り除きます。',
    [
      '移動できる表向き列を見極める。',
      '降順の同じスート列を作る。',
      '完成したKからAの列を除去する。',
    ],
    'Rearrange the tableau and remove completed same-suit runs.',
    [
      'Identify movable face-up suffixes.',
      'Build descending same-suit runs.',
      'Remove completed King-to-Ace sequences.',
    ],
  ),
  'miss-milligan': entry(
    { ja: 'ミス・ミリガン', en: 'Miss Milligan' },
    families.longRun,
    {
      ja: 'スパイダー型の列へ段階的に追加配札します。',
      en: 'A Spider-style game with staged tableau deals.',
    },
    5,
    2,
    '#aa7194',
    '追加配札で増える列を整理し、完成列を除去します。',
    [
      '同じスートの降順列をできるだけ保つ。',
      '一斉配札前に空列を準備する。',
      '完成した列をKからAまで除去する。',
    ],
    'Manage staged deals and remove every completed sequence.',
    [
      'Preserve descending same-suit runs.',
      'Prepare empty columns before each deal.',
      'Remove completed King-to-Ace sequences.',
    ],
  ),
  interchange: entry(
    { ja: 'インターチェンジ', en: 'Interchange' },
    families.longRun,
    {
      ja: '列同士を交換しながら完成札を目指します。',
      en: 'Build foundations while exchanging tableau groups.',
    },
    5,
    2,
    '#9c7f9a',
    '列を交換して順序を整え、8つの完成列を除去します。',
    [
      '移動する列の先頭を確認する。',
      '同じスートの降順に組み替える。',
      '完成列を除去して空間を作る。',
    ],
    'Exchange tableau groups, then remove eight completed runs.',
    [
      'Check the head of each moving group.',
      'Rebuild descending same-suit sequences.',
      'Remove completed runs to create space.',
    ],
  ),

  'busy-aces': entry(
    { ja: 'ビジー・エーシズ', en: 'Busy Aces' },
    families.special,
    {
      ja: '複数の完成札へカードを振り分けるゲームです。',
      en: 'Distribute cards across multiple foundations.',
    },
    4,
    1,
    '#d09261',
    '場札と山札を整理して、4つの完成札を作ります。',
    [
      '場札のカードを合法な列へ移す。',
      'Aを見つけたら対応する完成札へ置く。',
      '山札を使い切る前に全基礎を完成させる。',
    ],
    'Organize the tableau and complete four foundations.',
    [
      'Move tableau cards to legal destinations.',
      'Place Aces on their foundations as soon as possible.',
      'Finish every foundation before the stock runs out.',
    ],
  ),
  deuces: entry(
    { ja: 'デューシズ', en: 'Deuces' },
    families.special,
    {
      ja: '2を起点にする特殊完成札ゲームです。',
      en: 'A special-foundation game that starts from Twos.',
    },
    4,
    1,
    '#b58368',
    '2を起点に4つの特殊完成札を作ります。',
    [
      '2を対応する完成札へ置く。',
      '場札を交互色の降順に整理する。',
      '各完成札をルールの順序で伸ばす。',
    ],
    'Build four special foundations beginning with Twos.',
    [
      'Place Twos on their foundations.',
      'Arrange the tableau in descending alternating colors.',
      'Extend each foundation in its prescribed order.',
    ],
  ),
  'aces-and-kings': entry(
    { ja: 'エーシズ・アンド・キングス', en: 'Aces and Kings' },
    families.special,
    {
      ja: 'エース側は昇順、キング側は降順に作ります。',
      en: 'Build one set upward from Aces and one downward from Kings.',
    },
    5,
    1,
    '#c17868',
    'A側とK側、両方向の完成札をすべて完成させます。',
    ['Aを昇順の完成札へ置く。', 'Kを降順の完成札へ置く。', '場札を整理して両側へカードを送る。'],
    'Complete both the Ace-up and King-down foundations.',
    [
      'Start the ascending foundations with Aces.',
      'Start the descending foundations with Kings.',
      'Rearrange the tableau to feed both sides.',
    ],
  ),
  tournament: entry(
    { ja: 'トーナメント', en: 'Tournament' },
    families.special,
    { ja: '2組のカードで8つの完成札を作ります。', en: 'Build eight foundations from two decks.' },
    5,
    2,
    '#b67561',
    '広い場札を整理し、8つの同じスート完成札を作ります。',
    [
      '場札を同じスートの降順に整える。',
      '山札から出たカードの置き場を確保する。',
      'Aから8つの完成札を伸ばす。',
    ],
    'Organize the wide tableau and complete eight same-suit foundations.',
    [
      'Build descending same-suit tableau runs.',
      'Keep destinations ready for stock cards.',
      'Build eight foundations from the Aces.',
    ],
  ),
  colorado: entry(
    { ja: 'コロラド', en: 'Colorado' },
    families.special,
    {
      ja: '三角形の配札から標準完成札を作ります。',
      en: 'Build standard foundations from a triangular deal.',
    },
    4,
    1,
    '#bd8c61',
    '三角形の場札を崩し、4つの完成札を作ります。',
    ['場札の端から使えるカードを選ぶ。', '交互色の降順に列を組む。', 'Aから完成札を進める。'],
    'Clear the triangular tableau and complete four foundations.',
    [
      'Choose playable cards from tableau edges.',
      'Build descending alternating-color runs.',
      'Advance the foundations from the Aces.',
    ],
  ),
  crescent: entry(
    { ja: 'クレセント', en: 'Crescent' },
    families.special,
    {
      ja: '三日月状の16列を2組のカードで整理します。',
      en: 'Arrange sixteen crescent piles from two decks.',
    },
    5,
    2,
    '#a87872',
    '三日月状の場札を整理し、8つの完成札を作ります。',
    [
      '各列の表向きカードを確認する。',
      '同じスートの列を優先して伸ばす。',
      '空いた列を使い完成札へ送る。',
    ],
    'Clear the crescent tableau and complete eight foundations.',
    [
      'Check the exposed card of each pile.',
      'Prioritize same-suit sequences.',
      'Use cleared spaces to feed the foundations.',
    ],
  ),
  'crazy-quilt': entry(
    { ja: 'クレイジー・キルト', en: 'Crazy Quilt' },
    families.special,
    { ja: '全面公開の格子状盤面を整理します。', en: 'Rearrange a fully exposed quilt-like grid.' },
    5,
    2,
    '#9c7e75',
    '格子状の公開カードを組み替え、8つの完成札を作ります。',
    ['隣接するカードの順序を読む。', '交互色の降順列を作る。', '空いた場所から完成札へ送る。'],
    'Rearrange the open grid and complete eight foundations.',
    [
      'Read the order of neighboring cards.',
      'Build descending alternating-color runs.',
      'Feed the foundations from newly opened spaces.',
    ],
  ),
  windmill: entry(
    { ja: 'ウィンドミル', en: 'Windmill' },
    families.special,
    {
      ja: '風車状の盤面と山札を使う2組ゲームです。',
      en: 'A two-deck game with a windmill layout and stock.',
    },
    5,
    2,
    '#c48c5b',
    '風車状の場札を整理し、8つの完成札を作ります。',
    [
      '風車の各列からカードを選ぶ。',
      '同じスートの降順で列を作る。',
      '山札を使って完成札をAから伸ばす。',
    ],
    'Clear the windmill tableau and complete eight foundations.',
    [
      'Choose cards from the windmill arms.',
      'Build descending same-suit runs.',
      'Use the stock to grow foundations from Aces.',
    ],
  ),
  sultan: entry(
    { ja: 'スルタン', en: 'Sultan' },
    families.special,
    {
      ja: '予備札を持つ2組の特殊完成札ゲームです。',
      en: 'A two-deck special-foundation game with reserves.',
    },
    5,
    2,
    '#bc8661',
    '予備札を使いながら8つの完成札を完成させます。',
    [
      '予備札から安全なカードを選ぶ。',
      '場札を交互色の降順に整理する。',
      'Kを起点に降順の完成札を伸ばす。',
    ],
    'Use the reserve while completing eight foundations.',
    [
      'Choose safe cards from the reserve.',
      'Arrange descending alternating-color tableau runs.',
      'Build descending foundations from the Kings.',
    ],
  ),
  'algerian-patience': entry(
    { ja: 'アルジェリアン・ペイシェンス', en: 'Algerian Patience' },
    families.special,
    {
      ja: '2組・予備札・長い列を組み合わせます。',
      en: 'Combine two decks, reserves, and long tableau runs.',
    },
    5,
    2,
    '#ad7766',
    '予備札と列を整理して、両方向の完成札を作ります。',
    [
      '予備札の上からカードを使う。',
      '場札をルールに合う順序で重ねる。',
      'AまたはKから完成札を進める。',
    ],
    'Manage reserves and runs while building both foundation directions.',
    [
      'Play cards from the reserve top.',
      'Build tableau sequences in the permitted order.',
      'Advance foundations from their Ace or King starts.',
    ],
  ),
  indian: entry(
    { ja: 'インディアン', en: 'Indian' },
    families.special,
    {
      ja: '10列の2組盤面から完成札を作ります。',
      en: 'Build foundations from a ten-column two-deck tableau.',
    },
    5,
    2,
    '#bd795d',
    '10列の場札を整理し、8つの完成札へ送ります。',
    [
      '列の表向きカードを確認する。',
      '合法な降順列へまとめて移す。',
      '山札からAを見つけて完成札を始める。',
    ],
    'Arrange ten columns and feed eight foundations.',
    [
      'Check exposed cards in each column.',
      'Move valid descending groups together.',
      'Start foundations when Aces appear from the stock.',
    ],
  ),
  gypsy: entry(
    { ja: 'ジプシー', en: 'Gypsy' },
    families.special,
    { ja: '8列の長い場札と山札を使います。', en: 'Use eight long columns with a stock.' },
    4,
    2,
    '#b36f77',
    '長い場札を整理し、8つの完成札を完成させます。',
    ['交互色の降順列を作る。', '列をまとめて安全に移動する。', '完成札へAから送る。'],
    'Organize the long tableau and complete eight foundations.',
    [
      'Build descending alternating-color runs.',
      'Move safe groups together.',
      'Send cards to foundations from the Aces.',
    ],
  ),
  carthage: entry(
    { ja: 'カルタゴ', en: 'Carthage' },
    families.special,
    {
      ja: '8列の特殊配置から4つの完成札を作ります。',
      en: 'Build four foundations from a special eight-column layout.',
    },
    4,
    1,
    '#c58b6d',
    '特殊配置の場札を整理し、4つの完成札へ送ります。',
    ['場札の上からカードを選ぶ。', '交互色の降順列を作る。', '山札を使ってAから完成札を進める。'],
    'Clear the special layout and feed four foundations.',
    [
      'Choose cards from the tops of tableau piles.',
      'Build descending alternating-color runs.',
      'Use the stock to advance foundations from Aces.',
    ],
  ),
  carpet: entry(
    { ja: 'カーペット', en: 'Carpet' },
    families.special,
    {
      ja: '予備札と10列の盤面を使う配置ゲームです。',
      en: 'A layout game with reserves and ten tableau columns.',
    },
    4,
    1,
    '#bd9672',
    '予備札を活用し、4つの完成札を作ります。',
    [
      '予備札からカードを選ぶ。',
      '場札を交互色の降順に整理する。',
      '空いた場所へカードを移して完成札を伸ばす。',
    ],
    'Use the reserve to complete four foundations.',
    [
      'Choose playable cards from the reserve.',
      'Arrange descending alternating-color runs.',
      'Use cleared spaces to feed the foundations.',
    ],
  ),
  bristol: entry(
    { ja: 'ブリストル', en: 'Bristol' },
    families.special,
    {
      ja: 'スートを問わない列から完成札を作ります。',
      en: 'Build foundations from tableau columns with flexible building.',
    },
    4,
    1,
    '#a88971',
    '柔軟な場札の列を使って4つの完成札を作ります。',
    ['場札の上からカードを選ぶ。', '許可された順序で列を組む。', 'Aから同じスートの完成札へ送る。'],
    'Use flexible tableau building to complete four foundations.',
    [
      'Choose cards from the tableau tops.',
      'Build in the permitted order.',
      'Send cards to same-suit foundations from Aces.',
    ],
  ),
  'sir-tommy': entry(
    { ja: 'サー・トミー', en: 'Sir Tommy' },
    families.special,
    {
      ja: '7列の公開場札を使う古典的な配置ゲームです。',
      en: 'A classic seven-column layout game.',
    },
    3,
    1,
    '#9b8b70',
    '7列の場札を整理して4つの完成札を作ります。',
    [
      '列の先頭からカードを動かす。',
      '空いた列を新しい組み合わせに使う。',
      '完成札をAからKまで進める。',
    ],
    'Arrange seven columns and complete four foundations.',
    [
      'Move cards from the column tops.',
      'Use cleared columns for new combinations.',
      'Build foundations from Ace through King.',
    ],
  ),
  'auld-lang-syne': entry(
    { ja: 'オールド・ラング・サイン', en: 'Auld Lang Syne' },
    families.special,
    {
      ja: '4列から標準の完成札を作ります。',
      en: 'Build standard foundations from four tableau piles.',
    },
    3,
    1,
    '#aa936f',
    '4列を整理し、4つの同じスート完成札を作ります。',
    ['4列の表向きカードを確認する。', '同じスートの降順に重ねる。', 'Aから完成札を伸ばす。'],
    'Clear four piles and complete four same-suit foundations.',
    [
      'Check the exposed cards of four piles.',
      'Build descending same-suit runs.',
      'Grow foundations from the Aces.',
    ],
  ),
  osmosis: entry(
    { ja: 'オズモーシス', en: 'Osmosis' },
    families.special,
    {
      ja: '先行する完成札のランクが横へ浸透します。',
      en: 'Foundation ranks propagate sideways from earlier piles.',
    },
    5,
    1,
    '#8e86a7',
    '最初の完成札の配置を読み、横方向へランクを浸透させます。',
    [
      '最初の完成札へカードを置く。',
      '同じランクのカードを横の基礎へ送る。',
      '山札と場札を使い全基礎を完成する。',
    ],
    'Read the first foundation and propagate ranks across the others.',
    [
      'Place cards on the first foundation.',
      'Send matching ranks to the lateral foundations.',
      'Use stock and tableau cards to complete every foundation.',
    ],
  ),
  'four-seasons': entry(
    { ja: 'フォー・シーズンズ', en: 'Four Seasons' },
    families.special,
    {
      ja: '十字形の場札と四隅の完成札を使います。',
      en: 'Use a cross-shaped tableau and four corner foundations.',
    },
    4,
    1,
    '#7399a1',
    '十字形の場札を整理し、四隅の完成札を埋めます。',
    [
      '十字の各列から動かせるカードを選ぶ。',
      '交互色の降順に場札を組む。',
      '四隅の完成札をAから進める。',
    ],
    'Clear the cross-shaped tableau and fill the four corner foundations.',
    [
      'Choose playable cards from each arm of the cross.',
      'Build descending alternating-color tableau runs.',
      'Advance the corner foundations from Aces.',
    ],
  ),

  giza: entry(
    { ja: 'ギザ', en: 'Giza' },
    families.removal,
    {
      ja: '合計13の組とKで、公開ピラミッドを崩します。',
      en: 'Clear an open pyramid with pairs totalling 13 and single Kings.',
    },
    3,
    1,
    '#c7a165',
    '28枚のピラミッドと8本の予備札をすべて除去します。',
    [
      '表向きで遮られていないカードを選ぶ。',
      '合計13になる2枚、またはKを1枚で除去する。',
      '8本×3枚の公開予備札の一番上も組み合わせる。',
    ],
    'Clear the 28-card pyramid and eight open reserve piles.',
    [
      'Select cards that are not covered.',
      'Remove pairs totalling 13, or a single King.',
      'Use the top card from any of the eight three-card reserve piles.',
    ],
  ),
  cheops: entry(
    { ja: 'ケオプス', en: 'Cheops' },
    families.removal,
    {
      ja: '同ランクか連番の組で公開ピラミッドを除去します。',
      en: 'Clear an open pyramid with equal-rank or consecutive pairs.',
    },
    4,
    1,
    '#b89564',
    '公開されたピラミッド、山札、捨て札の全52枚を除去します。',
    [
      '遮られていないピラミッドのカードだけを選ぶ。',
      '同ランクまたは連番の2枚を除去する（AとKは連番ではない）。',
      '山札と捨て札の一番上も組み合わせ、山札は1周だけ使う。',
    ],
    'Clear all 52 cards from the open pyramid, stock, and waste.',
    [
      'Select only uncovered pyramid cards.',
      'Remove equal-rank or consecutive pairs; A and King do not connect.',
      'Pair with the top stock or waste card and use the stock only once.',
    ],
  ),
  'tri-peaks': entry(
    { ja: 'トライピークス', en: 'Tri-Peaks' },
    families.removal,
    {
      ja: '3つの峰から捨て札の前後1ランクを除去します。',
      en: 'Clear three peaks with cards one rank above or below the waste.',
    },
    2,
    1,
    '#70b79a',
    '3つの峰の28枚をすべて捨て札へ移します。',
    [
      '捨て札の上下1ランクを選ぶ。',
      '峰を支えるカードを優先して開ける。',
      '開始捨て札と23枚の山札を使い、連続除去を続ける。',
    ],
    'Clear all 28 cards from the three peaks onto the waste.',
    [
      'Play a card one rank above or below the waste.',
      'Prioritize cards supporting the peaks.',
      'Use the initial waste card and the 23-card stock to extend runs.',
    ],
  ),
  'black-hole': entry(
    { ja: 'ブラックホール', en: 'Black Hole' },
    families.removal,
    {
      ja: '中央のブラックホールへ条件に合うカードを送ります。',
      en: 'Feed the central black hole with eligible cards.',
    },
    3,
    1,
    '#667ba7',
    '17山の全カードを中央のブラックホールへ移します。',
    [
      '中央のスペードAから上下1ランクのカードを探す。',
      '使えるカードをブラックホールへ移す。',
      '17山の各トップカードだけを使い、全カードを移す。',
    ],
    'Move every card from 17 tableau piles into the central Black Hole.',
    [
      'Find a card one rank above or below the central Ace of Spades.',
      'Move eligible cards into the black hole.',
      'Use only each tableau pile’s top card until all cards are gone.',
    ],
  ),
  accordion: entry(
    { ja: 'アコーディオン', en: 'Accordion' },
    families.removal,
    {
      ja: '左右または3枚離れた同ランク・同スートを重ねます。',
      en: 'Stack cards matching by rank or suit one or three spaces away.',
    },
    4,
    1,
    '#a07c9e',
    '列を圧縮し、最後に1つの山へまとめます。',
    [
      '最後のカードと3枚前のカードを比較する。',
      'ランクまたはスートが合えば重ねる。',
      '動かせる山を選び、列を1つへ圧縮する。',
    ],
    'Compress the row until only one pile remains.',
    [
      'Compare the last card with the card three places back.',
      'Stack when rank or suit matches.',
      'Choose movable piles and compress the row.',
    ],
  ),
  'aces-up': entry(
    { ja: 'エーシズ・アップ', en: 'Aces Up' },
    families.removal,
    {
      ja: '同じスートの低いカードを除去してAを残します。',
      en: 'Remove lower cards of matching suits and leave the Aces.',
    },
    2,
    1,
    '#d28c69',
    '4列に1枚ずつ配り、A以外のカードをできるだけ除去します。',
    [
      '各列の一番上を確認する。',
      '同じスートで低い方のカードを除去する。',
      '手がなくなったら、空いた列へ移すか山札から4列へ1枚ずつ配る。',
    ],
    'Deal one card to each of four columns and remove as many non-Aces as possible.',
    [
      'Check the top card of each column.',
      'Remove the lower card when suits match.',
      'When no move remains, move a card to an empty column or deal one card to every column.',
    ],
  ),
  'monte-carlo': entry(
    { ja: 'モンテカルロ', en: 'Monte Carlo' },
    families.removal,
    {
      ja: '隣接する同ランクのペアを除去して盤面を詰めます。',
      en: 'Remove adjacent equal-rank pairs and compress the layout.',
    },
    3,
    1,
    '#b57c83',
    '5×5の盤面から同ランクの隣接ペアを除去し、山札を使い切ります。',
    [
      '縦・横・斜めに接する同ランクのペアを探す。',
      'ペアを除去して空白を作る。',
      '組がなくなったら左上へ詰め、山札から25枚まで補充する。',
    ],
    'Clear adjacent equal-rank pairs from a five-by-five grid and exhaust the stock.',
    [
      'Find equal-rank pairs touching horizontally, vertically, or diagonally.',
      'Remove pairs to create gaps.',
      'When no pair remains, compact top-left and refill to 25 from the stock.',
    ],
  ),
  'block-ten': entry(
    { ja: 'ブロック・テン', en: 'Block Ten' },
    families.removal,
    { ja: '合計10になるカードの組を除去します。', en: 'Remove pairs whose ranks total ten.' },
    2,
    1,
    '#7db19b',
    '合計10の組み合わせで盤面を空にします。',
    [
      '露出しているカードを確認する。',
      '合計10になる2枚を選んで除去する。',
      '空いた場所から次のカードを公開する。',
    ],
    'Clear the board using pairs that total ten.',
    [
      'Check the exposed cards.',
      'Remove two cards whose ranks total ten.',
      'Use the gaps to expose the next cards.',
    ],
  ),
  'fourteen-out': entry(
    { ja: 'フォーティーン・アウト', en: 'Fourteen Out' },
    families.removal,
    { ja: '合計14になるカードの組を除去します。', en: 'Remove pairs whose ranks total fourteen.' },
    3,
    1,
    '#729eab',
    '合計14のペアを使い、すべてのカードを除去します。',
    [
      '露出したカードから候補を探す。',
      '合計14になる2枚を除去する。',
      '山札をめくって盤面を更新する。',
    ],
    'Remove every card with pairs totaling fourteen.',
    [
      'Find candidates among exposed cards.',
      'Remove pairs totaling fourteen.',
      'Draw from the stock to refresh the board.',
    ],
  ),
  'royal-marriage': entry(
    { ja: 'ロイヤル・マリッジ', en: 'Royal Marriage' },
    families.removal,
    {
      ja: '王と女王を近づける特殊配置ゲームです。',
      en: 'A special layout game centered on the King and Queen.',
    },
    4,
    1,
    '#c58b70',
    '王と女王を出会わせ、盤面のカードを整理します。',
    [
      '王と女王の位置を確認する。',
      '間のカードを条件に従って移動する。',
      '王と女王を隣接させて局面を完成する。',
    ],
    'Bring the King and Queen together while clearing the layout.',
    [
      'Locate the King and Queen.',
      'Move intervening cards according to the rule.',
      'Place the royal pair together to finish the layout.',
    ],
  ),
  'gay-gordons': entry(
    { ja: 'ゲイ・ゴードンズ', en: 'Gay Gordons' },
    families.removal,
    {
      ja: '条件に合うカードを順に除去するゲームです。',
      en: 'Remove eligible cards in a planned sequence.',
    },
    3,
    1,
    '#9f8198',
    '定められた順序でカードを除去し、盤面を空にします。',
    [
      '現在除去できるカードを探す。',
      '順序を崩さずにカードを取り除く。',
      '空いた場所へ次の候補を展開する。',
    ],
    'Remove the entire layout in the prescribed order.',
    [
      'Find the cards currently eligible for removal.',
      'Remove cards without breaking the order.',
      'Use cleared spaces to expose the next candidates.',
    ],
  ),
  beehive: entry(
    { ja: 'ビーハイブ', en: 'Beehive' },
    families.removal,
    {
      ja: '蜂の巣状の盤面から同ランクの組を除去します。',
      en: 'Remove matching-rank groups from a beehive layout.',
    },
    3,
    1,
    '#d6a354',
    '蜂の巣状の盤面を圧縮し、すべてのカードを除去します。',
    [
      '露出した組み合わせを確認する。',
      '同じランクの条件に合うカードを除去する。',
      '詰まった盤面を圧縮して新しいカードを出す。',
    ],
    'Compress the beehive and remove every card.',
    [
      'Check the exposed combinations.',
      'Remove cards meeting the matching-rank rule.',
      'Compress blocked areas to expose new cards.',
    ],
  ),
  nestor: entry(
    { ja: 'ネスター', en: 'Nestor' },
    families.removal,
    {
      ja: '同ランクのカードを組にして除去します。',
      en: 'Pair cards of the same rank to clear the deal.',
    },
    3,
    1,
    '#7faaa0',
    '同ランクの組を作り、全カードを除去します。',
    [
      '場札から同ランクのカードを探す。',
      '合法な組を選んで除去する。',
      '山札を使って新しい組を公開する。',
    ],
    'Create same-rank pairs and remove the entire deal.',
    [
      'Find equal-rank cards in the tableau.',
      'Remove a legal pair.',
      'Use the stock to expose new pairing opportunities.',
    ],
  ),
  'poker-squares': entry(
    { ja: 'ポーカー・スクエア', en: 'Poker Squares' },
    families.removal,
    {
      ja: '5×5の盤面にカードを置き、ポーカー役を作ります。',
      en: 'Place cards on a 5×5 grid to score poker hands.',
    },
    4,
    1,
    '#789ab0',
    '5行5列のポーカー役で最高得点を目指します。',
    ['山札からカードを1枚めくる。', '5×5の空きマスを1つ選ぶ。', '各行列の役を確認して得点する。'],
    'Maximize the score from poker hands in the 5×5 grid.',
    [
      'Draw one card from the stock.',
      'Choose an empty square in the 5×5 grid.',
      'Score the poker hands in every row and column.',
    ],
  ),
  'cribbage-squares': entry(
    { ja: 'クリベッジ・スクエア', en: 'Cribbage Squares' },
    families.removal,
    {
      ja: '4×4の盤面にカードを置き、クリベッジの役を作ります。',
      en: 'Place cards on a 4×4 grid to build cribbage hands.',
    },
    4,
    1,
    '#8b9f9e',
    '4行4列にクリベッジの役を作り、合計得点を伸ばします。',
    [
      '山札からカードを1枚めくり、空きマスへ置く。',
      '各行列の15・ペア・ランを意識する。',
      '盤面完成後に役を集計する。',
    ],
    'Build high-scoring cribbage hands in the rows and columns of a 4×4 grid.',
    [
      'Draw one card, then place it in an empty square.',
      'Plan for fifteens, pairs, and runs.',
      'Count all hands after filling the grid.',
    ],
  ),
  'cribbage-solitaire': entry(
    { ja: 'クリベッジ・ソリティア', en: 'Cribbage Solitaire' },
    families.removal,
    {
      ja: 'クリベッジの組み合わせで得点するソリティアです。',
      en: 'Score points by forming cribbage combinations.',
    },
    4,
    1,
    '#849ca7',
    'カードを組み合わせてクリベッジの最高得点を目指します。',
    [
      '配られたカードから候補を選ぶ。',
      '15・ペア・ランを組み合わせる。',
      '全組み合わせの得点を確定する。',
    ],
    'Maximize the score from cribbage combinations.',
    [
      'Choose candidates from the dealt cards.',
      'Combine fifteens, pairs, and runs.',
      'Finalize the score for all combinations.',
    ],
  ),
  'bowling-solitaire': entry(
    { ja: 'ボウリング・ソリティア', en: 'Bowling Solitaire' },
    families.removal,
    {
      ja: 'カードをボウリングのピンに見立てて得点します。',
      en: 'Use cards as bowling pins and score each frame.',
    },
    3,
    1,
    '#d09a63',
    'カードを選んで10フレームの合計得点を伸ばします。',
    [
      '各フレームのカードを確認する。',
      '倒すピンの組み合わせを選ぶ。',
      'ストライクやスペアを狙い、得点を確定する。',
    ],
    'Maximize the total score across ten bowling frames.',
    [
      'Review the cards available in each frame.',
      'Choose a combination of pins to knock down.',
      'Aim for strikes and spares, then record the score.',
    ],
  ),
} satisfies Record<ExpansionGameId, ExpansionCatalogEntry>;

export default EXPANSION_CATALOG;
