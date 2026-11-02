/** Stable, URL-safe service identifier derived from a catalog listing title. */
export function fixSlug(title: string): string {
  return title.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
