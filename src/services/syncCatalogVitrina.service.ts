import { CatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
import { fetchCatalogVitrinaFromWebhook } from './catalogVitrinaWebhook.service';

export type SyncCatalogVitrinaResult = {
  totalFetched: number;
  upserted: number;
  removed: number;
  variantCount: number;
  syncedAt: string;
};

export async function syncCatalogVitrinaFromWebhook(): Promise<SyncCatalogVitrinaResult> {
  const groups = await fetchCatalogVitrinaFromWebhook();
  const syncedAt = new Date();
  const incomingKeys = new Set<string>();
  let variantCount = 0;

  for (const group of groups) {
    incomingKeys.add(group.groupKey);
    variantCount += group.variantes.length;

    await CatalogVitrinaGroup.findOneAndUpdate(
      { groupKey: group.groupKey },
      {
        groupKey: group.groupKey,
        nombreVitrina: group.nombreVitrina,
        claseFamilia: group.claseFamilia,
        categoria: group.categoria,
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
