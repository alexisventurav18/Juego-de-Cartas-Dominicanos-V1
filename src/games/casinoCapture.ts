import type { Card } from './cards';
import { teamOf } from './shared';

export const MAX_CAPTURE_VALUE = 14;

export const MAX_TABLE_SUM = MAX_CAPTURE_VALUE * 3;

export type FormationKind = 'sum' | 'pairs';

export interface Build {
  id: string;
  kind: FormationKind;
  value: number;
  cards: Card[];
  owner: number;
}

export interface TableItem {
  id: string;
  cards: Card[];
  values: number[];
  owner: number | null;
}

export function captureValues(card: Card): number[] {
  return card.rank === 1 ? [1, 14] : [card.rank];
}

export function tableItems(loose: Card[], builds: Build[]): TableItem[] {
  const looseItems = loose.map(
    (card): TableItem => ({ id: card.id, cards: [card], values: captureValues(card), owner: null }),
  );
  const buildItems = builds.map(
    (build): TableItem => ({ id: build.id, cards: build.cards, values: [build.value], owner: build.owner }),
  );
  return [...looseItems, ...buildItems];
}

function isSameRankCard(card: Card, item: TableItem): boolean {
  return item.cards.length === 1 && item.cards[0].rank === card.rank;
}

function canSplitIntoTargets(items: TableItem[], target: number): boolean {
  const memo = new Map<string, boolean>();
  const place = (i: number, filled: number): boolean => {
    if (i === items.length) return filled === 0;
    const key = `${i}:${filled}`;
    const known = memo.get(key);
    if (known !== undefined) return known;
    let ok = false;
    for (const value of items[i].values) {
      const next = filled + value;
      if (next <= target && place(i + 1, next === target ? 0 : next)) {
        ok = true;
        break;
      }
    }
    memo.set(key, ok);
    return ok;
  };
  return place(0, 0);
}

export function isValidCapture(card: Card, items: TableItem[]): boolean {
  if (items.length === 0) return false;
  return captureValues(card).some((value) => canSplitIntoTargets(items, value));
}

export function mixesRivalBuild(items: TableItem[], seat: number): boolean {
  return (
    items.length > 1 &&
    items.some((item) => item.owner !== null && teamOf(item.owner) !== teamOf(seat))
  );
}

export function isLegalCapture(card: Card, items: TableItem[], seat: number): boolean {
  return isValidCapture(card, items) && !mixesRivalBuild(items, seat);
}

export function captureOptions(card: Card, items: TableItem[], seat: number): TableItem[][] {
  const sameRank = items.filter((item) => isSameRankCard(card, item));
  const others = items.filter((item) => !isSameRankCard(card, item));
  const options: TableItem[][] = [];
  for (let mask = 1; mask < 1 << sameRank.length; mask++) {
    options.push(sameRank.filter((_, i) => mask & (1 << i)));
  }
  const walk = (start: number, chosen: TableItem[], minSum: number) => {
    if (chosen.length > 0 && isLegalCapture(card, chosen, seat)) options.push([...chosen]);
    for (let i = start; i < others.length; i++) {
      const next = minSum + Math.min(...others[i].values);
      if (next <= MAX_TABLE_SUM) walk(i + 1, [...chosen, others[i]], next);
    }
  };
  walk(0, [], 0);
  return options;
}

export function canCapture(card: Card, items: TableItem[], seat: number): boolean {
  return captureOptions(card, items, seat).length > 0;
}

export function handCanCapture(hand: Card[], value: number): boolean {
  return hand.some((card) => captureValues(card).includes(value));
}

function sumRanks(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + c.rank, 0);
}

function sumValue(card: Card, looseCards: Card[]): number | null {
  if (looseCards.length === 0) return null;
  const total = card.rank + sumRanks(looseCards);
  return total <= MAX_CAPTURE_VALUE ? total : null;
}

function canSplitIntoGroups(ranks: number[], target: number, groups: number): boolean {
  const sorted = [...ranks].sort((a, b) => b - a);
  const fill = new Array<number>(groups).fill(0);
  const place = (i: number): boolean => {
    if (i === sorted.length) return fill.every((total) => total === target);
    const tried = new Set<number>();
    for (let g = 0; g < groups; g++) {
      if (tried.has(fill[g]) || fill[g] + sorted[i] > target) continue;
      tried.add(fill[g]);
      fill[g] += sorted[i];
      if (place(i + 1)) return true;
      fill[g] -= sorted[i];
    }
    return false;
  };
  return place(0);
}

function pairsValue(card: Card, looseCards: Card[]): number | null {
  if (looseCards.length === 0) return null;
  const ranks = [card.rank, ...looseCards.map((c) => c.rank)];
  const total = sumRanks([card, ...looseCards]);
  for (let value = 2; value <= MAX_CAPTURE_VALUE; value++) {
    if (total % value !== 0) continue;
    const groups = total / value;
    if (groups >= 2 && canSplitIntoGroups(ranks, value, groups)) return value;
  }
  return null;
}

export function formationValue(
  kind: FormationKind,
  card: Card,
  looseCards: Card[],
  handAfter: Card[],
): number | null {
  const value = kind === 'sum' ? sumValue(card, looseCards) : pairsValue(card, looseCards);
  return value !== null && handCanCapture(handAfter, value) ? value : null;
}

export function raiseValue(card: Card, build: Build, handAfter: Card[]): number | null {
  const value = build.value + card.rank;
  return value <= MAX_CAPTURE_VALUE && handCanCapture(handAfter, value) ? value : null;
}

export function expansionValue(
  card: Card,
  build: Build,
  looseCards: Card[],
  handAfter: Card[],
): number | null {
  if (looseCards.length === 0) return null;
  const added = card.rank + sumRanks(looseCards);
  let value: number;
  if (build.kind === 'pairs') {
    if (added !== build.value) return null;
    value = build.value;
  } else {
    value = build.value + added;
  }
  return value <= MAX_CAPTURE_VALUE && handCanCapture(handAfter, value) ? value : null;
}
