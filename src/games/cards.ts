export type AmericanSuit = 'corazones' | 'diamantes' | 'treboles' | 'picas';
export type Suit = AmericanSuit | 'comodin';

export interface Card {
  id: string;
  suit: Suit;
  rank: number;
}

export const AMERICAN_SUITS: AmericanSuit[] = ['corazones', 'diamantes', 'treboles', 'picas'];
export const AMERICAN_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export const SUIT_LABEL: Record<AmericanSuit, string> = {
  corazones: 'Corazones',
  diamantes: 'Diamantes',
  treboles: 'Tréboles',
  picas: 'Picas',
};

const SUIT_SYMBOL: Record<AmericanSuit, string> = {
  corazones: '\u2665',
  diamantes: '\u2666',
  treboles: '\u2663',
  picas: '\u2660',
};

const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

export function isAmericanSuit(suit: Suit): suit is AmericanSuit {
  return (AMERICAN_SUITS as string[]).includes(suit);
}

export function suitSymbol(suit: AmericanSuit): string {
  return SUIT_SYMBOL[suit];
}

export function isRedSuit(suit: AmericanSuit): boolean {
  return suit === 'corazones' || suit === 'diamantes';
}

export function rankName(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

export function rankLabel(card: Card): string {
  if (card.suit === 'comodin') return 'JOKER';
  return rankName(card.rank);
}

function randomIndex(max: number): number {
  const range = 0x100000000;
  const limit = range - (range % max);
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function americanDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of AMERICAN_SUITS) {
    for (const rank of AMERICAN_RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

export function americanDoubleDeck(): Card[] {
  const deck: Card[] = [];
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of AMERICAN_SUITS) {
      for (const rank of AMERICAN_RANKS) {
        deck.push({ id: `${suit}-${rank}-${copy}`, suit, rank });
      }
    }
  }
  for (let j = 0; j < 4; j++) {
    deck.push({ id: `comodin-${j}`, suit: 'comodin', rank: 0 });
  }
  return deck;
}
