import type { CategorySlot } from '@/domain/angle-validator';

export interface StudioPartItem {
  id: string;
  partName: string;
  category: CategorySlot;
  brand: string;
  priceCents: number;
  laborCostCents: number;
  imageUrl: string;
  inStock: boolean;
}

export interface SelectedPartBuild {
  inventoryId: string;
  slot: CategorySlot;
  item: StudioPartItem;
  options?: {
    paintHexColor?: string | undefined;
    finishStyle?: 'GLOSS' | 'SATIN' | 'MATTE' | 'METALLIC' | undefined;
    tintVltPercent?: '5' | '15' | '35' | '70' | undefined;
    rimDiameterInches?: number | undefined;
  } | undefined;
}

export interface AngleRenderState {
  angleId: number;
  originalUrl: string;
  previewUrl?: string | undefined;
  output4kUrl?: string | undefined;
  isGenerating: boolean;
}
