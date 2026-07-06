import type { CanonicalProduct } from '../types/sap/canonical.types';
import {
  getItemCode,
  getStringField,
  parseSapActivo,
  parseSapImagenes,
  parseSapPrecio,
  parseSapStock,
  type SapImagenBlock,
} from '../utils/sapNormalize';

export function mapItemsIcoltexRawToCanonical(
  item: Record<string, unknown>
): CanonicalProduct | null {
  const codigo = getItemCode(item);
  if (!codigo) return null;

  const nombre =
    getStringField(item, 'ItemName', 'Item Name', 'itemName', 'Nombre', 'nombre') || codigo;

  const imagenesRaw = item.Imagenes ?? item.imagenes;
  const imageUrls = parseSapImagenes(imagenesRaw as SapImagenBlock[] | SapImagenBlock | undefined);

  return {
    codigo,
    nombre,
    claseFamilia:
      getStringField(item, 'Clase/Familia', 'Clase Familia', 'claseFamilia') || undefined,
    categoria: getStringField(item, 'Categoría', 'Categoria', 'categoria') || undefined,
    stock: parseSapStock(item.Stock as string | number | undefined),
    colores: getStringField(item, 'Colores', 'colores') || undefined,
    unidadMedida:
      getStringField(item, 'Unidad de Medida', 'UnidadMedida', 'unidadMedida') || undefined,
    caracteristica:
      getStringField(item, 'Característica', 'Caracteristica', 'caracteristica') || undefined,
    recomendacionesCuidados:
      getStringField(item, 'Recomendaciones_Cuidados', 'RecomendacionesCuidados') || undefined,
    recomendacionesUsos:
      getStringField(item, 'Recomendaciones_Usos', 'RecomendacionesUsos') || undefined,
    precioMetro: parseSapPrecio(item['Precio Metro'] as string | number | undefined),
    precioKilos: parseSapPrecio(item['Precio Kilos'] as string | number | undefined),
    activo: parseSapActivo(item.Estado),
    imageUrls: imageUrls.length ? imageUrls : undefined,
  };
}
