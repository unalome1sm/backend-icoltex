import { CatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
import { fetchCatalogVitrinaFromWebhook } from './catalogVitrinaWebhook.service';

export type SyncCatalogVitrinaResult = {
  totalFetched: number;
  upserted: number;
  removed: number;
  variantCount: number;
  groupsWithImages: number;
  syncedAt: string;
};

export async function syncCatalogVitrinaFromWebhook(): Promise<SyncCatalogVitrinaResult> {
  const groups = await fetchCatalogVitrinaFromWebhook();
  const syncedAt = new Date();
  const incomingKeys = new Set<string>();
  let variantCount = 0;
  let groupsWithImages = 0;

  for (const group of groups) {
    incomingKeys.add(group.groupKey);
    variantCount += group.variantes.length;
    if (group.imageUrls?.length) groupsWithImages++;

    await CatalogVitrinaGroup.findOneAndUpdate(
      { groupKey: group.groupKey },
      {
        groupKey: group.groupKey,
        nombreVitrina: group.nombreVitrina,
        claseFamilia: group.claseFamilia,
        categoria: group.categoria,
        filtros: group.filtros,
        imageUrls: group.imageUrls,
        variantes: group.variantes,
        syncedAt,
      },
      { upsert: true, new: true }
    );
  }

  const removed = await CatalogVitrinaGroup.deleteMany({
    groupKey: { $nin: [...incomingKeys] },
  });

  return {
    totalFetched: groups.length,
    upserted: groups.length,
    removed: removed.deletedCount ?? 0,
    variantCount,
    groupsWithImages,
    syncedAt: syncedAt.toISOString(),
  };
}

export async function getCatalogVitrinaSyncMeta(): Promise<{
  groupCount: number;
  lastSyncedAt: string | null;
}> {
  const groupCount = await CatalogVitrinaGroup.countDocuments();
  const latest = await CatalogVitrinaGroup.findOne()
    .sort({ syncedAt: -1 })
    .select('syncedAt')
    .lean();

  return {
    groupCount,
    lastSyncedAt: latest?.syncedAt ? new Date(latest.syncedAt).toISOString() : null,
  };
}

export async function collectVitrinaCodigos(): Promise<Set<string>> {
  const groups = await CatalogVitrinaGroup.find({}).select('variantes.codigo').lean();
  const codes = new Set<string>();
  for (const group of groups) {
    for (const v of group.variantes ?? []) {
      if (v.codigo) codes.add(v.codigo);
    }
  }
  return codes;
}
