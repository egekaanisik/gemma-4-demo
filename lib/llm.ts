import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';

export class LLMService {
  private static instance: LlmInference | null = null;
  private static isInitializing = false;
  private static CACHE_NAME = 'gemma-model-cache';

  static async getCachedModel(modelUrl: string, onProgress?: (progress: number) => void): Promise<string> {
    const isCacheSupported = typeof window !== 'undefined' && 'caches' in window;

    // Helper to verify a blob URL is actually readable (catches ERR_BLOB_OUT_OF_MEMORY Early)
    const verifyBlobUrl = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(url);
        if (!response.ok) return false;
        // Probe the first chunk only to verify readable stream
        const reader = response.body?.getReader();
        if (reader) {
          await reader.cancel();
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    };

    if (isCacheSupported) {
      try {
        const cache = await caches.open(this.CACHE_NAME);
        const cachedResponse = await cache.match(modelUrl);

        if (cachedResponse) {
          console.log(`Found model in cache (length: ${cachedResponse.headers.get('Content-Length')})`);
          try {
            const blob = await cachedResponse.blob();
            if (blob.size > 0) {
              const url = URL.createObjectURL(blob);
              if (await verifyBlobUrl(url)) {
                if (onProgress) onProgress(100);
                return url;
              } else {
                console.warn('Cached blob is not readable (likely OOM). Falling back to direct URL.');
                URL.revokeObjectURL(url);
              }
            } else {
              console.warn('Cached response is empty. Re-downloading.');
              try { await cache.delete(modelUrl); } catch (err) { }
            }
          } catch (e) {
            console.warn('Failed to read blob from cached response', e);
            try { await cache.delete(modelUrl); } catch (err) { }
          }
        }
      } catch (e) {
        console.warn('Cache access error:', e);
      }
    }

    console.log('Downloading model...');
    try {
      const response = await fetch(modelUrl, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) throw new Error(`Failed to download model: ${response.statusText}`);

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        const blob = await response.blob();
        if (isCacheSupported) {
          try {
            const cache = await caches.open(this.CACHE_NAME);
            const responseToCache = new Response(blob, {
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': blob.size.toString()
              }
            });
            await cache.put(modelUrl, responseToCache);
          } catch (e) {
            console.warn('Caching failed, skipping cache');
          }
        }
        if (onProgress) onProgress(100);
        try {
          const url = URL.createObjectURL(blob);
          if (await verifyBlobUrl(url)) return url;
          return modelUrl;
        } catch (e) {
          return modelUrl;
        }
      }

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          if (onProgress && total) {
            onProgress(Math.min(99, Math.round((loaded / total) * 100)));
          }
        }
      }

      let blob: Blob;
      try {
        blob = new Blob(chunks as any, { type: 'application/octet-stream' });
        console.log(`Blob created (size: ${blob.size} bytes)`);
      } catch (e) {
        console.warn('Blob creation failed, using direct URL');
        return modelUrl;
      }

      if (isCacheSupported && blob.size > 0) {
        try {
          const cache = await caches.open(this.CACHE_NAME);
          const responseToCache = new Response(blob, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': blob.size.toString()
            }
          });
          await cache.put(modelUrl, responseToCache);
          console.log('Model cached successfully with Content-Length:', blob.size);
        } catch (e) {
          console.warn('Caching failed (likely quota exceeded or OOM), using direct URL');
          return modelUrl;
        }
      }

      if (onProgress) onProgress(100);
      try {
        const url = URL.createObjectURL(blob);
        if (await verifyBlobUrl(url)) {
          return url;
        } else {
          console.warn('Generated blob is not readable. Using direct URL.');
          URL.revokeObjectURL(url);
          return modelUrl;
        }
      } catch (e) {
        return modelUrl;
      }
    } catch (err) {
      console.error('Download error:', err);
      return modelUrl;
    }
  }

  static async getInstance(modelUrl: string, onProgress?: (progress: number) => void): Promise<LlmInference> {
    if (this.instance) {
      if (onProgress) onProgress(100);
      return this.instance;
    }

    if (this.isInitializing) {
      // Wait for existing initialization
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.instance) {
        if (onProgress) onProgress(100);
        return this.instance;
      }
    }

    this.isInitializing = true;
    try {
      const fileset = await FilesetResolver.forGenAiTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm"
      );

      const localModelUrl = await this.getCachedModel(modelUrl, onProgress);
      this.instance = await LlmInference.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: localModelUrl,
        },
        maxTokens: 1024,
      });

      return this.instance;
    } finally {
      this.isInitializing = false;
    }
  }

  static async generateResponse(
    modelUrl: string,
    prompt: string,
    onPartialResult?: (partial: string, done: boolean) => void
  ): Promise<string> {
    const llm = await this.getInstance(modelUrl);

    if (onPartialResult) {
      return new Promise((resolve, reject) => {
        let fullText = "";
        try {
          llm.generateResponse(prompt, (partial, done) => {
            fullText += partial;
            onPartialResult(fullText, done);
            if (done) {
              resolve(fullText);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    } else {
      return llm.generateResponse(prompt);
    }
  }

  static close() {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}
