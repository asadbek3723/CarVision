import { ITEM_LOCALES, localizedText, veloceCategory, type CatalogItemDTO } from '@/domain/catalog';

/**
 * The shop's public view of one catalog item: the same shape the /api/v1/products list returns.
 * Shared by the API and the product page, so the page can ship the part in its HTML and the
 * browser does not have to ask for it again. Workshop identity stays masked.
 */
export function toVeloceProduct(i: CatalogItemDTO, localeParam: string) {
  const locale = (ITEM_LOCALES as readonly string[]).includes(localeParam) ? localeParam : '';
  const text = localizedText(i, locale);
  return {
    id: i.id,
    name: text.name,
    brand: i.brand || 'CarVision',
    price: i.priceUSD,
    spec: text.description,
    category: veloceCategory(i.category, i.attributes),
    categoryLabel: i.categoryLabel,
    image: i.coverImageUrl ?? i.images[0]?.url ?? '',
    image_url: i.coverImageUrl ?? i.images[0]?.url ?? '',
    images: i.images.map((g) => g.url),
    angleImage: i.images.find((g) => g.kind === 'ANGLE')?.url,
    swatch: typeof i.attributes['swatch'] === 'string' ? i.attributes['swatch'] : undefined,
    inStock: i.stock > 0,
    stock: i.stock,
    installAvailable: i.installAvailable,
    installPrice: i.installPriceUSD,
    attributes: i.attributes,
    targetCar: i.isUniversal ? 'Barcha mashinalar' : i.fitment[0]?.label ?? '',
    compatibility: i.isUniversal ? [] : i.fitment.map((f) => ({ id: f.modelId ?? f.id, name: f.label, yearFrom: f.yearFrom, yearTo: f.yearTo })),
    isUniversal: i.isUniversal,
    sellerName: `Verified Partner #${i.shopId.slice(0, 4).toUpperCase()}`,
    seller: { id: i.shopId, business_name: `Verified Partner #${i.shopId.slice(0, 4).toUpperCase()}` },
    createdAt: i.createdAt,
  };
}
