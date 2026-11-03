import type { ImageEditProvider, InpaintJobParams, InpaintJobResult } from './interface';

export class MockImageEditProvider implements ImageEditProvider {
  public name = 'mock-provider';

  async queueInpainting(params: InpaintJobParams): Promise<InpaintJobResult> {
    // Simulates fast server response for testing and local development
    return {
      jobId: `mock-job-${params.generationId}`,
      status: 'QUEUED',
      estimatedWaitSeconds: 1.5,
    };
  }
}
