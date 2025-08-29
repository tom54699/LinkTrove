import type { LegacyStores } from '../../background/migration/types';
import type { ExportImportService } from '../data/exportImport';

export async function buildLegacyStores(ei: ExportImportService): Promise<LegacyStores> {
  const json = await ei.exportJson();
  let parsed: any;
  try { parsed = JSON.parse(json); } catch { parsed = {}; }
  const pages = Array.isArray(parsed.webpages) ? parsed.webpages : [];
  const cats = Array.isArray(parsed.categories) ? parsed.categories : [];
  return {
    async loadWebpages() { return pages as any; },
    async loadCategories() { return cats as any; },
  };
}

