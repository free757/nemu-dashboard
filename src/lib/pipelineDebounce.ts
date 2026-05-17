import { ProcessSpeechParams } from './realtimePipeline';

// Helper to generate a fingerprint hash of a transcript string
export function getTranscriptHash(text: string): string {
  let hash = 5381;
  const clean = text.replace(/\s+/g, '').toLowerCase();
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 33) ^ clean.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Debounce controller to manage incoming voice recognition transcript chunks.
 * Enforces stabilization delay, filters out duplicates, and checks length.
 */
export class PipelineDebounce {
  private timeoutId: NodeJS.Timeout | null = null;
  private lastProcessedHash = '';

  /**
   * Debounces speech processing to guarantee stabilization before invoking the central pipeline.
   */
  public debounceSpeech(
    params: ProcessSpeechParams,
    onApproved: (params: ProcessSpeechParams) => void
  ): void {
    const text = params.chunk.trim();

    // 1. Meaningful Length Check (Ignore empty or tiny noisy fragments)
    const words = text.split(/\s+/).filter(Boolean);
    if (text.length < 5 || words.length < 2) {
      return;
    }

    // 2. Duplicate Transcript Check (Fingerprint hash check)
    const currentHash = getTranscriptHash(text);
    if (currentHash === this.lastProcessedHash) {
      console.log('[Debounce] duplicate transcript ignored');
      return;
    }

    // 3. Stabilization Delay (300ms–500ms golden ratio debounce)
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    console.log('[Debounce] waiting for stabilization');
    this.timeoutId = setTimeout(() => {
      this.lastProcessedHash = currentHash;
      console.log('[Debounce] processing approved');
      onApproved(params);
    }, 350); // 350ms debounce delay
  }

  /**
   * Clears any active debounce timers and resets the state.
   */
  public reset(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.lastProcessedHash = '';
  }
}

// Global throttler tracking state
let lastAIRequestTimestamp = 0;
const inFlightRequests: Record<string, { controller: AbortController; hash: string }> = {};
const lastProcessedAIHash: Record<string, string> = {};

/**
 * Throttles AI requests to prevent double semantic checking, duplicate draft answer prep,
 * and duplicate final answer generation. Cancels in-flight requests and respects minimum intervals.
 */
export async function throttleAIRequest<T>(
  type: 'semantic' | 'draft' | 'final',
  transcript: string,
  execute: (signal: AbortSignal) => Promise<T>
): Promise<T | null> {
  const hash = getTranscriptHash(transcript);

  // 1. Duplicate AI request fingerprint protection
  if (lastProcessedAIHash[type] === hash) {
    console.log('[Debounce] duplicate transcript ignored');
    return null;
  }

  // 2. Minimum interval protection (Minimum 2 seconds between AI requests)
  const now = Date.now();
  const timeSinceLast = now - lastAIRequestTimestamp;
  if (timeSinceLast < 2000) {
    console.log('[Debounce] throttled AI request');
    return null;
  }

  // 3. In-flight request protection (Abort older running requests of the same type)
  if (inFlightRequests[type]) {
    console.log(`[Debounce] Cancelling older in-flight ${type} request`);
    inFlightRequests[type].controller.abort();
    delete inFlightRequests[type];
  }

  // Prepare abort controller for the new request
  const controller = new AbortController();
  inFlightRequests[type] = {
    controller,
    hash
  };

  lastAIRequestTimestamp = now;
  lastProcessedAIHash[type] = hash;

  try {
    const result = await execute(controller.signal);
    return result;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`[Debounce] ${type} request aborted successfully`);
      return null;
    }
    throw error;
  } finally {
    // Cleanup in-flight reference if it matches the current request
    if (inFlightRequests[type]?.hash === hash) {
      delete inFlightRequests[type];
    }
  }
}

/**
 * Resets the global AI Request throttler states.
 */
export function resetThrottler(): void {
  lastAIRequestTimestamp = 0;
  Object.keys(inFlightRequests).forEach((key) => {
    inFlightRequests[key].controller.abort();
    delete inFlightRequests[key];
  });
  Object.keys(lastProcessedAIHash).forEach((key) => {
    delete lastProcessedAIHash[key];
  });
}
