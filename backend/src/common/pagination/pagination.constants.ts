export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
// Dropdowns request up to 1000 rows; anything above is clamped
export const MAX_LIMIT = 1000;
// Keeps (page - 1) * limit inside a 32-bit int
export const MAX_PAGE = 1_000_000;
