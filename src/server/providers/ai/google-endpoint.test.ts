import { describe, expect, it } from 'vitest';
import { geminiGenerateUrls, isVertexKey } from './google-endpoint';

describe('google endpoint by key type', () => {
  it('recognises Vertex AI express keys', () => {
    expect(isVertexKey('AQ.Ab8RN6exampleexample')).toBe(true);
    expect(isVertexKey('AIzaSyExampleExampleExample')).toBe(false);
  });

  it('sends Vertex keys to aiplatform first', () => {
    const [first, second] = geminiGenerateUrls('AQ.Ab8RN6exampleexample', 'gemini-2.5-flash-image');
    expect(first).toBe('https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-image:generateContent');
    expect(second).toContain('generativelanguage.googleapis.com');
  });

  it('sends AI Studio keys to generativelanguage first', () => {
    const [first, second] = geminiGenerateUrls('AIzaSyExampleExampleExample', 'gemini-2.5-flash-image');
    expect(first).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent');
    expect(second).toContain('aiplatform.googleapis.com');
  });
});
