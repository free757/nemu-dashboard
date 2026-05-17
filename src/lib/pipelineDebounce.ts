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
let currentSessionId = '';
const lastProcessedAIHash: Record<string, string> = {};

// Global in-flight request registry to prevent ANY overlapping requests across: semantic, draft, and final generation
interface InFlightRequest {
  controller: AbortController;
  type: 'semantic' | 'draft' | 'final';
  hash: string;
  sessionId?: string;
}
const activeRequests = new Map<string, InFlightRequest>();

/**
 * Generates a new unique microphone session ID and invalidates all previous requests immediately.
 */
export function startNewSession(): string {
  currentSessionId = Math.random().toString(36).substring(7);
  console.log(`[Pipeline] New microphone session started: ${currentSessionId}`);
  // Invalidate all previous requests immediately
  abortAllActiveRequests('session_change');
  return currentSessionId;
}

/**
 * Gets the current active microphone session ID.
 */
export function getCurrentSessionId(): string {
  return currentSessionId;
}

/**
 * Aborts and cancels all active in-flight requests in the registry.
 */
export function abortAllActiveRequests(reason: string = 'manual'): void {
  if (activeRequests.size > 0) {
    for (const [key, req] of activeRequests.entries()) {
      console.log(`[Throttle] stale request cancelled (type: ${req.type}, reason: ${reason})`);
      req.controller.abort();
    }
    activeRequests.clear();
  }
}

/**
 * Throttles AI requests to prevent double semantic checking, duplicate draft answer prep,
 * and duplicate final answer generation. Cancels in-flight requests and respects minimum intervals.
 * Supports session ownership tracking to prevent orphan background responses.
 */
export async function throttleAIRequest<T>(
  type: 'semantic' | 'draft' | 'final',
  transcript: string,
  execute: (signal: AbortSignal) => Promise<T>,
  sessionId?: string
): Promise<T | null> {
  // 1. Session ownership validation
  if (sessionId && sessionId !== currentSessionId) {
    console.log('[Pipeline] orphan request prevented');
    return null;
  }

  const hash = getTranscriptHash(transcript);

  // 2. Duplicate AI request fingerprint protection
  if (lastProcessedAIHash[type] === hash) {
    console.log('[Debounce] duplicate transcript ignored');
    return null;
  }

  // 3. Global in-flight request registry protection:
  // If ANY other AI request is currently running, abort it to prevent overlapping requests!
  if (activeRequests.size > 0) {
    for (const [key, req] of activeRequests.entries()) {
      console.log(`[Throttle] stale request cancelled (overlapping ${type} started)`);
      req.controller.abort();
      activeRequests.delete(key);
    }
  }

  // 4. Minimum interval protection (Minimum 2 seconds between AI requests)
  const now = Date.now();
  const timeSinceLast = now - lastAIRequestTimestamp;
  if (timeSinceLast < 2000) {
    console.log('[Throttle] request blocked');
    return null;
  }

  // Prepare abort controller for the new request
  const controller = new AbortController();
  const reqKey = `${type}-${hash}`;
  activeRequests.set(reqKey, {
    controller,
    type,
    hash,
    sessionId
  });

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
    if (activeRequests.get(reqKey)?.hash === hash) {
      activeRequests.delete(reqKey);
    }
  }
}

/**
 * Resets the global AI Request throttler states.
 */
export function resetThrottler(): void {
  lastAIRequestTimestamp = 0;
  abortAllActiveRequests('reset');
  Object.keys(lastProcessedAIHash).forEach((key) => {
    delete lastProcessedAIHash[key];
  });
}
