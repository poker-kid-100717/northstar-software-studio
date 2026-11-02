/** Catalog problem types, in display order. The first entry means "no filter". */
export const CATALOG_CATEGORIES = ['All', 'Websites & forms', 'APIs & integrations', 'Data & spreadsheets', 'Code & .NET', 'Automation & deployment'] as const;
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export type FixiqCategory = 'integration' | 'automation' | 'data' | 'application' | 'unsure';

const MAP: Record<FixiqCategory, CatalogCategory> = {
  integration: 'APIs & integrations',
  automation: 'Automation & deployment',
  data: 'Data & spreadsheets',
  application: 'Websites & forms',
  unsure: 'All'
};

/** Catalog category that best matches a FixIQ assessment. Rules-based, not a diagnosis. */
export function catalogCategoryFor(category: FixiqCategory): CatalogCategory {
  return MAP[category] ?? 'All';
}

/** Validate an untrusted query-string value; unknown values fall back to no filter. */
export function parseCatalogCategory(value: unknown): CatalogCategory {
  return typeof value === 'string' && (CATALOG_CATEGORIES as readonly string[]).includes(value) ? (value as CatalogCategory) : 'All';
}
