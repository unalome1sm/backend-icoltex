/**
 * @deprecated Importar desde catalogVitrinaWebhook.service.ts
 * Re-export para compatibilidad con imports existentes.
 */
export {
  fetchCatalogVitrinaFromWebhook as fetchItemCharacteristicsFromWebhook,
  flattenCatalogCharacteristics,
  buildVitrinaGroupKey,
  encodeGroupId,
  normalizeKeyPart,
} from './catalogVitrinaWebhook.service';

export type { CatalogCharacteristicRow as ItemCharacteristicRow } from '../types/catalogVitrina.types';
