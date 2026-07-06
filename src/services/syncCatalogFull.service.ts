import {
  collectVitrinaCodigos,
  syncCatalogVitrinaFromWebhook,
  type SyncCatalogVitrinaResult,
} from './syncCatalogVitrina.service';
import {
  collectProductCodigosWithPrice,
  syncProductsFromIcoltex,
  type SyncProductsResult,
} from './syncProducts.service';

export type SyncCatalogFullResult = {
  message: string;
  vitrina: SyncCatalogVitrinaResult;
  products: SyncProductsResult;
  crossRef: {
    vitrinaVariantCount: number;
    variantsWithoutPrice: number;
    productsNotInVitrina: number;
    sampleVariantsWithoutPrice: string[];
    sampleProductsNotInVitrina: string[];
  };
};

export async function syncCatalogFullFromSap(): Promise<SyncCatalogFullResult> {
  const vitrina = await syncCatalogVitrinaFromWebhook();
  const products = await syncProductsFromIcoltex();

  const vitrinaCodigos = await collectVitrinaCodigos();
  const pricedCodigos = await collectProductCodigosWithPrice();

  const variantsWithoutPrice: string[] = [];
  for (const codigo of vitrinaCodigos) {
    if (!pricedCodigos.has(codigo)) variantsWithoutPrice.push(codigo);
  }

  const productsNotInVitrina: string[] = [];
  for (const codigo of pricedCodigos) {
    if (!vitrinaCodigos.has(codigo)) productsNotInVitrina.push(codigo);
  }

  return {
    message: 'Sincronización de catálogo completa (info-items-x-ref + items_icoltex)',
    vitrina,
    products,
    crossRef: {
      vitrinaVariantCount: vitrinaCodigos.size,
      variantsWithoutPrice: variantsWithoutPrice.length,
      productsNotInVitrina: productsNotInVitrina.length,
      sampleVariantsWithoutPrice: variantsWithoutPrice.slice(0, 20),
      sampleProductsNotInVitrina: productsNotInVitrina.slice(0, 20),
    },
  };
}
