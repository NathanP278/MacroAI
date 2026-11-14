import type { FoodItem } from '@/types/nutrition';

let cachedStaples: FoodItem[] | null = null;

/**
 * Pure in-memory ranking and filtering for whole-food staples.
 * Ranks exact matches first, followed by prefix matches and token-prefix matches,
 * while ensuring all query tokens match.
 */
export function filterStaples(
  items: FoodItem[],
  query: string,
  limit: number = 25
): FoodItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return items.slice(0, limit);
  }

  const queryTokens = trimmed.split(/[\s,/-]+/).filter(Boolean);
  const scored: Array<{ item: FoodItem; score: number }> = [];

  for (const item of items) {
    const nameLower = (item.name || '').toLowerCase();
    let matchesAllTokens = true;
    let score = 0;

    if (nameLower === trimmed) {
      score += 1000;
    } else if (nameLower.startsWith(trimmed)) {
      score += 800;
    }

    const nameTokens = nameLower.split(/[\s,/-]+/).filter(Boolean);

    for (const qToken of queryTokens) {
      let tokenMatched = false;
      for (let i = 0; i < nameTokens.length; i++) {
        const nToken = nameTokens[i];
        if (nToken === qToken) {
          score += 150 - Math.min(i * 10, 50);
          tokenMatched = true;
        } else if (nToken.startsWith(qToken)) {
          score += 100 - Math.min(i * 10, 50);
          tokenMatched = true;
        }
      }

      if (!tokenMatched && nameLower.includes(qToken)) {
        score += 20;
        tokenMatched = true;
      }

      if (!tokenMatched) {
        matchesAllTokens = false;
        break;
      }
    }

    if (matchesAllTokens && score > 0) {
      // Preference shorter names (closer match, less noise)
      score += Math.max(0, 40 - nameLower.length * 0.2);
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Loads the static staples dataset from /data/staples-2500.json
 * (or from filesystem in Node.js test environment) and caches it in memory.
 */
export async function loadStaples(): Promise<FoodItem[]> {
  if (cachedStaples && cachedStaples.length > 0) {
    return cachedStaples;
  }

  // Attempt fetch if running in a real browser environment
  if (
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string' &&
    window.location.origin.startsWith('http')
  ) {
    try {
      const res = await fetch('/data/staples-2500.json');
      if (res.ok) {
        const data = await res.json();
        cachedStaples = Array.isArray(data) ? data : [];
        return cachedStaples;
      }
    } catch {
      // Fallback to filesystem read below (e.g. In jsdom / test environment)
    }
  }

  // Node.js / jsdom / test environment
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'public/data/staples-2500.json');
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    cachedStaples = Array.isArray(data) ? data : [];
    return cachedStaples;
  } catch (err) {
    console.warn('Could not read staples file:', err);
    return [];
  }
}

/**
 * Allows pre-seeding or clearing memory cache (especially useful for tests).
 */
export function setStaplesCache(staples: FoodItem[] | null): void {
  cachedStaples = staples;
}

/**
 * Searches offline staples dataset with query string and optional limit.
 */
export async function searchStaples(query: string, limit: number = 25): Promise<FoodItem[]> {
  const staples = await loadStaples();
  return filterStaples(staples, query, limit);
}
