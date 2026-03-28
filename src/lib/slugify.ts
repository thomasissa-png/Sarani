/**
 * Convert a string into a URL-safe slug.
 * 1. Lowercase
 * 2. NFD normalize + strip combining marks (accents)
 * 3. Replace & with "and"
 * 4. Replace non-alphanumeric sequences with single hyphen
 * 5. Strip leading/trailing hyphens
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
