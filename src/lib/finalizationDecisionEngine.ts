/**
 * FinalizationDecisionEngine — Single Source of Truth for all finalization approval logic.
 *
 * ALL systems (smart trigger, manual finalization, auto trigger, delayed trigger,
 * answer generation) MUST use this engine. No scattered word-count checks or
 * confidence thresholds anywhere else.
 */

// ---------------------------------------------------------------------------
// Centralized thresholds
// ---------------------------------------------------------------------------

export const MIN_WORDS = 4;            // Minimum meaningful word count
export const MIN_CONFIDENCE = 0.75;    // Minimum semantic confidence to approve
export const MIN_SILENCE_MS = 1200;    // Minimum silence before auto-trigger

export const FILLER_WORDS = new Set([
  'um', 'uh', 'like', 'you know', 'actually', 'امم', 'اه', 'يعني'
]);

export const CONTINUATION_WORDS = new Set([
  'and', 'but', 'or', 'so', 'because', 'with', 'for', 'to', 'at', 'in',
  'of', 'about', 'by', 'from', 'if', 'then', 'و', 'لكن', 'أو', 'في', 'من', 'إلى', 'عن', 'مع'
]);

const JUNK_PATTERN = /^[!@#$%^&*()_+=\-\[\]{};':",./<>?؟\s]+$/;

// ---------------------------------------------------------------------------
// Decision result
// ---------------------------------------------------------------------------

export interface FinalizationDecision {
  shouldGenerate: boolean;
  isComplete: boolean;
  confidence: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Input parameters
// ---------------------------------------------------------------------------

export interface DecisionParams {
  transcript: string;
  isComplete: boolean;          // From SemanticCompletion
  confidence: number;           // From SemanticCompletion (already threshold-adjusted)
  silenceDuration?: number;     // ms — optional for manual triggers
  isUserSpeaking?: boolean;     // optional — assumed false for manual triggers
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

/**
 * Evaluates whether a transcript is ready for final answer generation.
 * Used by ALL approval paths: smart trigger, auto trigger, delayed trigger,
 * manual finalization, and answer generation pre-flight validation.
 *
 * Key rule: if SemanticCompletion marks isComplete=true, word count alone
 * CANNOT reject the transcript. Only garbage/noise and confidence gates remain.
 */
export function evaluateFinalization({
  transcript,
  isComplete,
  confidence,
  silenceDuration,
  isUserSpeaking = false,
}: DecisionParams): FinalizationDecision {

  const cleanText = transcript.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);

  // --- Gate 1: Garbage / junk input protection (always enforced) ---
  if (JUNK_PATTERN.test(cleanText)) {
    console.log('[DecisionEngine] rejected by garbage input');
    return {
      shouldGenerate: false,
      isComplete: false,
      confidence: 0.0,
      reason: 'Rejected: transcript contains only symbols/noise',
    };
  }

  // --- Gate 2: Filler-word-only protection ---
  const nonFillerWords = words.filter(w => !FILLER_WORDS.has(w.toLowerCase()));
  if (nonFillerWords.length < 2) {
    console.log('[DecisionEngine] rejected by garbage input');
    return {
      shouldGenerate: false,
      isComplete: false,
      confidence: 0.0,
      reason: 'Rejected: transcript consists only of filler words',
    };
  }

  // --- Gate 3: Semantic incompleteness ---
  // If semantic layer says NOT complete, always reject regardless of word count.
  if (!isComplete) {
    // Special case: if word count < MIN_WORDS AND semantic says incomplete,
    // both layers agree — reject.
    if (words.length < MIN_WORDS) {
      console.log('[DecisionEngine] rejected by semantic incompleteness');
      return {
        shouldGenerate: false,
        isComplete: false,
        confidence,
        reason: `Rejected: transcript too short (${words.length} words) and semantically incomplete`,
      };
    }

    console.log('[DecisionEngine] rejected by semantic incompleteness');
    return {
      shouldGenerate: false,
      isComplete: false,
      confidence,
      reason: `Rejected: semantic evaluation indicates incomplete`,
    };
  }

  // --- Gate 4: Minimum word count (ONLY when semantic says incomplete) ---
  // KEY RULE: if isComplete=true, do NOT re-apply MIN_WORDS as a rejection gate.
  // The semantic engine already validated structure. Word count here is purely
  // a garbage-input backstop for when semantic says complete (should rarely happen for very short text).
  if (isComplete && words.length < 2) {
    console.log('[DecisionEngine] rejected by semantic incompleteness');
    return {
      shouldGenerate: false,
      isComplete: false,
      confidence: 0.0,
      reason: 'Rejected: implausibly short transcript marked complete (< 2 words)',
    };
  }

  // --- Gate 5: Confidence threshold ---
  if (confidence < MIN_CONFIDENCE) {
    console.log('[DecisionEngine] rejected by confidence');
    return {
      shouldGenerate: false,
      isComplete,
      confidence,
      reason: `Rejected: confidence (${confidence.toFixed(2)}) below threshold (${MIN_CONFIDENCE})`,
    };
  }

  // --- Gate 6: Continuation word at end (unstable fragment) ---
  const lastWord = words[words.length - 1]?.toLowerCase() ?? '';
  if (CONTINUATION_WORDS.has(lastWord)) {
    console.log('[DecisionEngine] rejected by semantic incompleteness');
    return {
      shouldGenerate: false,
      isComplete: false,
      confidence,
      reason: `Rejected: transcript ends with continuation word "${lastWord}"`,
    };
  }

  // --- Gate 7: Silence duration (auto-trigger paths only) ---
  if (silenceDuration !== undefined && silenceDuration <= MIN_SILENCE_MS) {
    return {
      shouldGenerate: false,
      isComplete,
      confidence,
      reason: `Rejected: silence duration (${silenceDuration}ms) below ${MIN_SILENCE_MS}ms threshold`,
    };
  }

  // --- Gate 8: Still speaking (auto-trigger paths only) ---
  if (isUserSpeaking) {
    return {
      shouldGenerate: false,
      isComplete,
      confidence,
      reason: 'Rejected: user is currently speaking',
    };
  }

  // --- Approved ---
  console.log('[DecisionEngine] finalization approved');
  return {
    shouldGenerate: true,
    isComplete,
    confidence,
    reason: 'Approved: all finalization conditions satisfied',
  };
}
