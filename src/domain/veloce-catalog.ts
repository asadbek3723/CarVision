export interface VeloceProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  spec: string;
  swatch?: string | undefined;
  rating: number;
  stock: number;
  image: string;
  angleImage?: string | undefined;
  targetCar?: string | undefined;
  compatibility?: Array<{ id: string; name: string; yearFrom?: number | null | undefined; yearTo?: number | null | undefined }> | undefined;
  isUniversal?: boolean | undefined;
  images?: string[] | undefined;
  attributes?: Record<string, unknown> | undefined;
  installAvailable?: boolean | undefined;
  installPrice?: number | undefined;
  categoryLabel?: string | undefined;
  sellerName?: string | undefined;
}

