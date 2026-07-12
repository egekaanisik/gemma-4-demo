import { Engine, Message } from '@litert-lm/core';

// Global Console Interceptor: Redirects noisy WASM/LiteRT initialization log messages and non-critical warnings to console.info
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const msg = args.join(' ');
    const isLiteRtLog = 
      msg.toLowerCase().includes('info') || 
      msg.toLowerCase().includes('warning') ||
      msg.toLowerCase().includes('lite') || 
      msg.toLowerCase().includes('xnnpack') ||
      msg.toLowerCase().includes('npu_registry') ||
      msg.toLowerCase().includes('mel_filterbank') ||
      msg.toLowerCase().includes('klitert') ||
      msg.toLowerCase().includes('cancel') ||
      /^[IWE]\d{4}\s\d{2}:\d{2}:\d{2}/.test(msg.trim());

    if (isLiteRtLog) {
      console.info('[LiteRT Log]', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    const msg = args.join(' ');
    const isLiteRtLog = 
      msg.toLowerCase().includes('info') || 
      msg.toLowerCase().includes('warning') ||
      msg.toLowerCase().includes('lite') || 
      msg.toLowerCase().includes('xnnpack') ||
      msg.toLowerCase().includes('npu_registry') ||
      msg.toLowerCase().includes('mel_filterbank') ||
      msg.toLowerCase().includes('klitert') ||
      msg.toLowerCase().includes('cancel') ||
      /^[IWE]\d{4}\s\d{2}:\d{2}:\d{2}/.test(msg.trim());

    if (isLiteRtLog) {
      console.info('[LiteRT Log]', ...args);
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

// ==========================================
// Standalone Helper Functions
// ==========================================

/**
 * Verifies that a local blob URL is readable (helps capture OOM early).
 */
async function verifyBlobUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const reader = response.body?.getReader();
    if (reader) {
      await reader.cancel();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Extracts plain text content from a Message returned by LiteRT-LM.
 */
function extractTextContent(msg: any): string {
  if (!msg) return "";
  if (typeof msg.content === 'string') {
    return msg.content;
  }
  if (Array.isArray(msg.content)) {
    let text = "";
    for (const part of msg.content) {
      if (part && part.type === 'text' && typeof part.text === 'string') {
        text += part.text;
      }
    }
    return text;
  }
  return "";
}

// ==========================================
// LLM Service Wrapper
// ==========================================

export class LLMService {
  private static instance: Engine | null = null;
  private static isInitializing = false;
  private static CACHE_NAME = 'gemma-model-cache';
  private static activeConversation: any | null = null;

  /**
   * Retrieves and caches the model file locally using the Cache Storage API.
   */
  static async getCachedModel(modelUrl: string, onProgress?: (progress: number, status: string) => void): Promise<string> {
    const isCacheSupported = typeof window !== 'undefined' && 'caches' in window;

    if (isCacheSupported) {
      try {
        if (onProgress) onProgress(0, 'Checking cache');
        const cache = await caches.open(this.CACHE_NAME);
        const cachedResponse = await cache.match(modelUrl);

        if (cachedResponse) {
          console.log(`Found model in cache (length: ${cachedResponse.headers.get('Content-Length')})`);
          try {
            const blob = await cachedResponse.blob();
            if (blob.size > 0) {
              const url = URL.createObjectURL(blob);
              if (await verifyBlobUrl(url)) {
                if (onProgress) onProgress(100, 'Model ready');
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
    if (onProgress) onProgress(1, 'Downloading');
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
            if (onProgress) onProgress(99, 'Caching model');
            await cache.put(modelUrl, responseToCache);
          } catch (e) {
            console.warn('Caching failed, skipping cache');
          }
        }
        if (onProgress) onProgress(100, 'Model ready');
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
            onProgress(Math.min(99, Math.round((loaded / total) * 100)), 'Downloading');
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
          if (onProgress) onProgress(99, 'Caching model');
          await cache.put(modelUrl, responseToCache);
          console.log('Model cached successfully with Content-Length:', blob.size);
        } catch (e) {
          console.warn('Caching failed (likely quota exceeded or OOM), using direct URL');
          return modelUrl;
        }
      }

      if (onProgress) onProgress(100, 'Model ready');
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

  /**
   * Initializes and compiles the model engine.
   */
  static async getInstance(modelUrl: string, onProgress?: (progress: number, status: string) => void): Promise<Engine> {
    if (this.instance) {
      if (onProgress) onProgress(100, 'Model ready');
      return this.instance;
    }

    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.instance) {
        if (onProgress) onProgress(100, 'Model ready');
        return this.instance;
      }
    }

    this.isInitializing = true;
    try {
      const localModelUrl = await this.getCachedModel(modelUrl, onProgress);
      if (onProgress) onProgress(100, 'Preparing GPU');

      this.instance = await Engine.create({
        model: localModelUrl,
        mainExecutorSettings: {
          maxNumTokens: 8192,
        }
      });

      if (onProgress) onProgress(100, 'Model ready');
      return this.instance;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generates text response using structured prefaces and streaming APIs.
   */
  static async generateResponse(
    modelUrl: string,
    messages: Message[],
    onPartialResult?: (partial: string, done: boolean) => void
  ): Promise<string> {
    const engine = await this.getInstance(modelUrl);

    if (messages.length === 0) {
      throw new Error("No messages provided for generation.");
    }

    const lastMessage = messages[messages.length - 1];
    const lastPromptStr = typeof lastMessage.content === 'string' ? lastMessage.content : '';
    const prefaceMessages = messages.slice(0, messages.length - 1);

    const conversation = await engine.createConversation({
      preface: {
        messages: prefaceMessages,
      },
      sessionConfig: {
        samplerParams: {
          temperature: 0.8,
          seed: Math.floor(Math.random() * 2147483647),
        }
      }
    });
    this.activeConversation = conversation;

    if (onPartialResult) {
      return new Promise(async (resolve, reject) => {
        let currentChannel: string | null = null;
        let fullText = "";
        let reader: any = null;
        try {
          const stream = conversation.sendMessageStreaming(lastPromptStr);
          reader = stream.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              let text = "";
              let hasThought = false;

              if (value.channels && typeof value.channels === 'object' && value.channels.thought) {
                hasThought = true;
                text = value.channels.thought;
              } else {
                text = extractTextContent(value);
              }

              if (hasThought) {
                if (currentChannel !== 'thought') {
                  if (currentChannel !== null) {
                    fullText += `\n<channel|>\n`;
                  }
                  fullText += `<|channel>thought\n`;
                  currentChannel = 'thought';
                }
                fullText += text;
              } else {
                if (currentChannel === 'thought') {
                  fullText += `\n<channel|>\n`;
                  currentChannel = null;
                }
                fullText += text;
              }

              onPartialResult(fullText, false);
            }
          }

          if (currentChannel === 'thought') {
            fullText += `\n<channel|>\n`;
          }

          onPartialResult(fullText, true);
          resolve(fullText);
        } catch (err) {
          reject(err);
        } finally {
          if (reader) {
            try {
              reader.releaseLock();
            } catch (e) {
              console.warn('Error releasing stream reader lock:', e);
            }
          }
          try {
            await conversation.delete();
          } catch (e) {
            console.warn('Error deleting conversation:', e);
          }
          if (this.activeConversation === conversation) {
            this.activeConversation = null;
          }
        }
      });
    } else {
      try {
        const message = await conversation.sendMessage(lastPromptStr);
        let text = "";
        if (message.channels && typeof message.channels === 'object' && message.channels.thought) {
          const thought = message.channels.thought;
          const mainContent = extractTextContent(message);
          text = `<|channel>thought\n${thought}\n<channel|>\n${mainContent}`;
        } else {
          text = extractTextContent(message);
        }
        return text;
      } finally {
        try {
          await conversation.delete();
        } catch (e) {
          console.warn('Error deleting conversation:', e);
        }
        if (this.activeConversation === conversation) {
          this.activeConversation = null;
        }
      }
    }
  }

  /**
   * Cancels any active generation on the conversation instance.
   */
  static cancel() {
    if (this.activeConversation) {
      try {
        this.activeConversation.cancel();
      } catch (e) {
        console.warn('Error cancelling active conversation:', e);
      }
      this.activeConversation = null;
    }
  }

  /**
   * Deletes and releases the initialized Engine instance.
   */
  static async close() {
    if (this.instance) {
      try {
        await this.instance.delete();
      } catch (e) {
        console.warn('Error deleting engine instance:', e);
      }
      this.instance = null;
    }
  }
}
