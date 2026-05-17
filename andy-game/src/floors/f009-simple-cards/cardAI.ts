// Simple card game (简化斗地主) logic
// 40 cards (no jokers, 2 decks of 2-10 + JQKA stripped to simpler set)
// Actually: simplified to single deck, player vs AI, play cards to beat opponent

export type Suit = '♠' | '♥' | '♣' | '♦';

export interface Card {
  suit: Suit;
  rank: number; // 3-15 (3=3, ..., 10=10, J=11, Q=12, K=13, A=14, 2=15)
  display: string;
}

export type HandType = 'single' | 'pair' | 'triple' | 'bomb' | null;

export interface Play {
  cards: Card[];
  type: HandType;
  rank: number; // primary rank for comparison
}

const RANK_DISPLAY: Record<number, string> = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Suit[] = ['♠', '♥', '♣', '♦'];
  for (const suit of suits) {
    for (let rank = 3; rank <= 15; rank++) {
      deck.push({ suit, rank, display: RANK_DISPLAY[rank] });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
}

// Identify what play a set of cards makes
export function identifyPlay(cards: Card[]): Play | null {
  if (cards.length === 0) return null;

  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);

  if (cards.length === 1) {
    return { cards, type: 'single', rank: ranks[0] };
  }

  if (cards.length === 2 && ranks[0] === ranks[1]) {
    return { cards, type: 'pair', rank: ranks[0] };
  }

  if (cards.length === 3 && ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
    return { cards, type: 'triple', rank: ranks[0] };
  }

  if (cards.length === 4 && ranks[0] === ranks[1] && ranks[1] === ranks[2] && ranks[2] === ranks[3]) {
    return { cards, type: 'bomb', rank: ranks[0] };
  }

  return null;
}

// Can newPlay beat lastPlay?
export function canBeat(newPlay: Play, lastPlay: Play | null): boolean {
  if (!lastPlay) return true; // Free play

  // Bomb beats everything except higher bomb
  if (newPlay.type === 'bomb' && lastPlay.type !== 'bomb') return true;
  if (newPlay.type !== 'bomb' && lastPlay.type === 'bomb') return false;

  // Same type, higher rank
  if (newPlay.type === lastPlay.type && newPlay.cards.length === lastPlay.cards.length) {
    return newPlay.rank > lastPlay.rank;
  }

  return false;
}

// Find all possible plays from a hand that beat the lastPlay
export function findValidPlays(hand: Card[], lastPlay: Play | null): Card[][] {
  const results: Card[][] = [];

  // Group by rank
  const byRank = new Map<number, Card[]>();
  for (const c of hand) {
    if (!byRank.has(c.rank)) byRank.set(c.rank, []);
    byRank.get(c.rank)!.push(c);
  }

  for (const [rank, cards] of byRank) {
    // Singles
    const singlePlay: Play = { cards: [cards[0]], type: 'single', rank };
    if (!lastPlay || canBeat(singlePlay, lastPlay)) {
      results.push([cards[0]]);
    }

    // Pairs
    if (cards.length >= 2) {
      const pairPlay: Play = { cards: cards.slice(0, 2), type: 'pair', rank };
      if (!lastPlay || canBeat(pairPlay, lastPlay)) {
        results.push(cards.slice(0, 2));
      }
    }

    // Triples
    if (cards.length >= 3) {
      const triplePlay: Play = { cards: cards.slice(0, 3), type: 'triple', rank };
      if (!lastPlay || canBeat(triplePlay, lastPlay)) {
        results.push(cards.slice(0, 3));
      }
    }

    // Bombs
    if (cards.length >= 4) {
      const bombPlay: Play = { cards: cards.slice(0, 4), type: 'bomb', rank };
      if (!lastPlay || canBeat(bombPlay, lastPlay)) {
        results.push(cards.slice(0, 4));
      }
    }
  }

  return results;
}

// AI: play the lowest valid play, or pass
export function findAIPlay(hand: Card[], lastPlay: Play | null): Card[] | null {
  const validPlays = findValidPlays(hand, lastPlay);
  if (validPlays.length === 0) return null; // Pass

  // Pick lowest play (first = lowest rank since hand is sorted)
  return validPlays[0];
}

export function isSuitRed(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}
