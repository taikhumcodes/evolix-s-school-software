/**
 * EVOLIX SCHOOL ERP — REUSABLE SEARCH ENGINE UTILITY
 * 
 * Provides:
 * - Unicode-normalized, case-insensitive, whitespace-collapsed normalization
 * - Separator normalization (hyphens, underscores, slashes -> spaces)
 * - Compact representation for queries like "grade9" matching "Grade-9"
 * - Bidirectional terminology aliasing (class <-> grade)
 * - Strict token-based AND matching (prevents "Grade 9" from returning all grades)
 * - Multi-tier relevance scoring and ranking
 * - Text match highlighting utility
 */

export interface SearchableFields {
  name: string;
  code?: string | null;
  related?: (string | null | undefined)[];
}

/**
 * Normalizes text for search comparison:
 * 1. String conversion
 * 2. NFKD Unicode normalization (decomposing accents)
 * 3. Lowercase
 * 4. Replace separators (-, _, /) with spaces
 * 5. Collapse repeated whitespace and trim
 */
export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns alphanumeric-only lowercase string without spaces or symbols.
 * E.g. "Grade-9" -> "grade9", "Class 10" -> "class10"
 */
export function toCompactText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Expands a token with supported educational domain aliases.
 * Specifically: "class" <-> "grade"
 */
export function expandTokenAliases(token: string): string[] {
  if (token === 'class') return ['class', 'grade'];
  if (token === 'grade') return ['grade', 'class'];
  return [token];
}

/**
 * Tokenizes a search query into meaningful lowercase tokens.
 */
export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(' ').filter((t) => t.length > 0);
}

/**
 * Determines whether a record matches a query using token-based AND logic
 * with alias expansion and compact matching.
 */
export function matchesSearch(
  recordFields: (string | null | undefined)[],
  query: string
): boolean {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;

  const queryCompact = toCompactText(query);
  const queryTokens = tokenizeSearchQuery(query);
  if (queryTokens.length === 0) return true;

  // Combine and normalize record text
  const validFields = recordFields.filter(Boolean) as string[];
  const normalizedRecord = validFields.map(normalizeSearchText).join(' ');
  const compactRecord = validFields.map(toCompactText).join(' ');

  // Direct full normalized string or compact substring match
  if (normalizedRecord.includes(normQuery)) return true;
  if (queryCompact && compactRecord.includes(queryCompact)) return true;

  // Multi-token query: Every token (or its alias) must match
  const recordWords = normalizedRecord.split(' ').filter(Boolean);

  return queryTokens.every((token) => {
    const tokenAliases = expandTokenAliases(token);
    return tokenAliases.some((alias) => {
      // Check as substring in normalized record text
      if (normalizedRecord.includes(alias)) return true;

      // Check if any word starts with or matches this token
      if (recordWords.some((w) => w === alias || w.startsWith(alias))) return true;

      // Compact match for single token
      const aliasCompact = toCompactText(alias);
      if (aliasCompact && compactRecord.includes(aliasCompact)) return true;

      return false;
    });
  });
}

/**
 * Calculates a numerical relevance score for a record against a query.
 * Higher scores indicate stronger relevance.
 */
export function calculateSearchScore(
  primaryName: string,
  code: string | null | undefined,
  relatedFields: (string | null | undefined)[],
  query: string
): number {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return 0;

  const queryCompact = toCompactText(query);
  const queryTokens = tokenizeSearchQuery(query);

  const normName = normalizeSearchText(primaryName);
  const compactName = toCompactText(primaryName);
  const normCode = normalizeSearchText(code);
  const compactCode = toCompactText(code);

  const combinedRelated = relatedFields.filter(Boolean).map(normalizeSearchText).join(' ');

  let score = 0;

  // 1. Exact normalized name match
  if (normName === normQuery) {
    score += 1000;
  }
  // 2. Exact compact name match (e.g. "grade9" matching "Grade-9")
  else if (compactName === queryCompact && queryCompact.length > 0) {
    score += 950;
  }
  // 3. Exact code match
  else if (normCode && (normCode === normQuery || compactCode === queryCompact)) {
    score += 900;
  }
  // 4. Prefix name match (name starts with query)
  else if (normName.startsWith(normQuery)) {
    score += 750;
  }
  // 5. Prefix code match
  else if (normCode && normCode.startsWith(normQuery)) {
    score += 700;
  }
  // 6. Word boundary prefix match in name
  else if (normName.split(' ').some((w) => w.startsWith(normQuery))) {
    score += 650;
  }

  // Check query tokens in primary name
  if (queryTokens.length > 1) {
    const allTokensInName = queryTokens.every((t) => {
      const aliases = expandTokenAliases(t);
      return aliases.some((a) => normName.includes(a) || compactName.includes(toCompactText(a)));
    });
    if (allTokensInName) {
      score += 500;
    }
  }

  // Match in code
  if (normCode && queryTokens.every((t) => normCode.includes(t) || compactCode.includes(toCompactText(t)))) {
    score += 400;
  }

  // Match in related fields (e.g. sections, subjects, categories)
  if (combinedRelated && queryTokens.every((t) => {
    const aliases = expandTokenAliases(t);
    return aliases.some((a) => combinedRelated.includes(a));
  })) {
    score += 300;
  }

  // Length difference penalty to favor concise exact matches over sprawling text
  const lengthDiff = Math.abs(normName.length - normQuery.length);
  score -= Math.min(50, lengthDiff);

  return Math.max(1, score);
}

/**
 * Filters and ranks a list of records using deep search scoring.
 */
export function filterAndRankRecords<T>(
  items: T[],
  query: string,
  extractFields: (item: T) => SearchableFields
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return items;

  const scoredItems: { item: T; score: number }[] = [];

  for (const item of items) {
    const fields = extractFields(item);
    const allFields = [fields.name, fields.code, ...(fields.related || [])];

    if (matchesSearch(allFields, trimmed)) {
      const score = calculateSearchScore(
        fields.name,
        fields.code,
        fields.related || [],
        trimmed
      );
      scoredItems.push({ item, score });
    }
  }

  // Sort descending by score
  scoredItems.sort((a, b) => b.score - a.score);

  return scoredItems.map((entry) => entry.item);
}

/**
 * Splits text into highlighted chunks according to matching query tokens.
 */
export interface HighlightChunk {
  text: string;
  isMatch: boolean;
}

export function highlightMatches(text: string, query: string): HighlightChunk[] {
  if (!text || !query.trim()) {
    return [{ text: text || '', isMatch: false }];
  }

  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return [{ text, isMatch: false }];
  }

  const allPatterns = new Set<string>();
  for (const t of tokens) {
    for (const alias of expandTokenAliases(t)) {
      if (alias.length > 0) {
        allPatterns.add(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      }
    }
  }

  if (allPatterns.size === 0) {
    return [{ text, isMatch: false }];
  }

  const regex = new RegExp(`(${Array.from(allPatterns).join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.filter(Boolean).map((part) => ({
    text: part,
    isMatch: Array.from(allPatterns).some((p) => p.toLowerCase() === part.toLowerCase()),
  }));
}
