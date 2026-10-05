const MAX_SEARCH_LENGTH = 100;

/**
 * Case-insensitive "every word matches some field" filter, so "john smith"
 * still finds a row whose firstName is John and lastName is Smith.
 * Returns undefined for a blank search so callers can spread it safely.
 */
export function wordSearch<W>(
  search: string | undefined,
  fields: string[],
): W | undefined {
  const words = (search ?? '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return undefined;

  return {
    AND: words.map((word) => ({
      OR: fields.map((field) => ({
        [field]: { contains: word, mode: 'insensitive' },
      })),
    })),
  } as W;
}
