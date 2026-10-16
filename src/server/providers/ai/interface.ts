export interface GenerationItemPayload {
  slot: string;
  referenceImageUrl: string;
  paintHexColor?: string | undefined;
  finishStyle?: string | undefined;
  tintVltPercent?: string | undefined;
}

export interface InpaintJobParams {
  generationId: string;
  originalImageUrl: string;
  angleId: number;
  items: GenerationItemPayload[];
  isNightMode?: boolean | undefined;
  webhookUrl: string;
}

export interface InpaintJobResult {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING';
  estimatedWaitSeconds: number;
}

export interface ImageEditProvider {
  name: string;
  queueInpainting(params: InpaintJobParams): Promise<InpaintJobResult>;
}
