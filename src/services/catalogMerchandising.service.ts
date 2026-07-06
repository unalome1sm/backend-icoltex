import { CatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
import { decodeGroupId } from './catalogVitrinaWebhook.service';
import { fetchMergedProductByGroupId } from './mergedCatalog.service';
import type { GroupedCatalogFilter } from './groupedCatalog.service';
import type { MergedProductRow } from './mergedCatalog.service';

export type MerchandisingUpdate = {
  esDestacado?: boolean;
  esNovedad?: boolean;
};

export async function updateGroupMerchandising(
  groupId: string,
  input: MerchandisingUpdate
): Promise<MergedProductRow | null> {
  const groupKey = decodeGroupId(groupId);
  if (!groupKey) {
    throw new Error('groupId inválido');
  }

  const update: Record<string, unknown> = { merchandisingUpdatedAt: new Date() };
  if (typeof input.esDestacado === 'boolean') {
    update.esDestacado = input.esDestacado;
  }
  if (typeof input.esNovedad === 'boolean') {
    update.esNovedad = input.esNovedad;
  }

  if (Object.keys(update).length <= 1) {
    throw new Error('Debes enviar esDestacado y/o esNovedad');
  }

  const doc = await CatalogVitrinaGroup.findOneAndUpdate({ groupKey }, { $set: update }, { new: true });
  if (!doc) {
    throw new Error('Grupo no encontrado');
  }

  const filter: GroupedCatalogFilter = {};
  return fetchMergedProductByGroupId(groupId, filter);
}
