import type { ImageEditProvider, InpaintJobParams, InpaintJobResult } from './interface';
import { FalCircuitBreaker } from './circuit-breaker';

export class FalImageEditProvider implements ImageEditProvider {
  public name = 'fal-ai';
  private circuitBreaker = FalCircuitBreaker.getInstance();

  async queueInpainting(params: InpaintJobParams): Promise<InpaintJobResult> {
    if (!this.circuitBreaker.canExecute()) {
      throw new Error('Circuit breaker is OPEN. External AI service is temporarily paused.');
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      throw new Error('FAL_KEY environment variable is missing');
    }

    try {
      // Fal queue submission endpoint
      const response = await fetch('https://queue.fal.run/fal-ai/flux/dev/image-to-image', {
        method: 'POST',
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: params.originalImageUrl,
          webhook_url: params.webhookUrl,
          // Map parts to IP-Adapter reference images and prompts
          prompt: `High-end realistic automotive tuning, fitted with ${params.items
            .map((i) => i.slot)
            .join(', ')}, photorealistic 8k octane render studio lighting`,
        }),
      });

      if (!response.ok) {
        this.circuitBreaker.recordFailure();
        throw new Error(`Fal.ai queue error: ${response.statusText}`);
      }

      const data = (await response.json()) as { request_id: string };
      this.circuitBreaker.recordSuccess();

      return {
        jobId: data.request_id || params.generationId,
        status: 'QUEUED',
        estimatedWaitSeconds: 3.8,
      };
    } catch (error) {
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }
}
