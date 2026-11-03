import type { Card } from './cards.ts';
import { teamOf } from './shared.ts';

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

function reachesTarget(items: TableItem[], mask: number, target: number): boolean {
  let sums = new Set<number>([0]);
  items.forEach((item, i) => {
    if (!(mask & (1 << i))) return;
    const next = new Set<number>();
    for (const sum of sums) {
      for (const value of item.values) if (sum + value <= target) next.add(sum + value);
    }
    sums = next;
  });
  return sums.has(target);
}

/** Cuántos grupos que suman `target` forman exactamente las cartas de `mask` (-1 si no se puede). */
function bestSplit(items: TableItem[], mask: number, target: number, memo: Map<number, number>): number {
  if (mask === 0) return 0;
  const known = memo.get(mask);
  if (known !== undefined) return known;
  const first = mask & -mask;
  const rest = mask ^ first;
  let best = -1;
  for (let sub = rest; ; sub = (sub - 1) & rest) {
    const group = sub | first;
    if (reachesTarget(items, group, target)) {
      const remaining = bestSplit(items, mask ^ group, target, memo);
      if (remaining >= 0) best = Math.max(best, remaining + 1);
    }
    if (sub === 0) break;
  }
  memo.set(mask, best);
  return best;
}

function canSplitIntoTargets(items: TableItem[], target: number, minGroups: number): boolean {
  const full = (1 << items.length) - 1;
  return bestSplit(items, full, target, new Map()) >= minGroups;
}

export function isValidCapture(card: Card, items: TableItem[]): boolean {
  if (items.length === 0) return false;
  return captureValues(card).some((value) => canSplitIntoTargets(items, value, 1));
}

export function pairsRankOf(card: Card, items: TableItem[]): number | null {
  return captureValues(card).find((value) => canSplitIntoTargets(items, value, 2)) ?? null;
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
  const options: TableItem[][] = [];
  const walk = (start: number, chosen: TableItem[], minSum: number) => {
    if (chosen.length > 0 && isLegalCapture(card, chosen, seat)) options.push([...chosen]);
    for (let i = start; i < items.length; i++) {
      const next = minSum + Math.min(...items[i].values);
      if (next <= MAX_TABLE_SUM) walk(i + 1, [...chosen, items[i]], next);
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
  if (build.kind === 'pairs') return null;
  const value = build.value + card.rank;
  return value <= MAX_CAPTURE_VALUE && handCanCapture(handAfter, value) ? value : null;
}

export function expansionValue(
  card: Card,
  build: Build,
  looseCards: Card[],
  handAfter: Card[],
): number | null {
  if (build.kind === 'pairs' || looseCards.length === 0) return null;
  const value = build.value + card.rank + sumRanks(looseCards);
  return value <= MAX_CAPTURE_VALUE && handCanCapture(handAfter, value) ? value : null;
}

export function convertValue(card: Card, build: Build, handAfter: Card[]): number | null {
  if (card.rank !== build.value) return null;
  return handCanCapture(handAfter, build.value) ? build.value : null;
}
