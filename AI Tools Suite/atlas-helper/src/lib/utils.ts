import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SegmentItem } from "../types/atlas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Smart time range parser using regex pattern matching.
 * Handles any unicode dash (–, —, -, ~) and formats like:
 * "0:00.00–0:03.00", "0:00.00 - 0:03.00", "0:07.33–0:13.32"
 */
export function parseTimeRange(rangeStr: string): { startTime: string; endTime: string } | null {
  if (!rangeStr) return null;
  const matches = rangeStr.match(/\d{1,2}:\d{2}(?:\.\d{1,3})?/g);
  if (matches && matches.length >= 2) {
    return {
      startTime: matches[0],
      endTime: matches[1],
    };
  }
  return null;
}

/**
 * Smart Bulk Parser for text containing multiple timestamps and labels.
 * Supports both line-by-line format and single-line timestamp + label format.
 */
export function parseBulkSegmentsText(bulkText: string): SegmentItem[] {
  if (!bulkText) return [];
  const lines = bulkText.split("\n").map((line) => line.trim()).filter(Boolean);
  const segments: SegmentItem[] = [];

  let pendingTime: { startTime: string; endTime: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const timeMatch = parseTimeRange(line);

    if (timeMatch) {
      // Check if the same line also contains the label text after removing timestamps
      const lineWithoutTimes = line
        .replace(/\d{1,2}:\d{2}(?:\.\d{1,3})?/g, "")
        .replace(/[\s–—\-~→>]+/g, " ")
        .trim();

      if (lineWithoutTimes.length > 2) {
        // Timestamps and label are on the SAME line
        segments.push({
          id: `seg-${Date.now()}-${segments.length + 1}`,
          startTime: timeMatch.startTime,
          endTime: timeMatch.endTime,
          currentLabel: lineWithoutTimes,
          status: "idle",
        });
        pendingTime = null;
      } else {
        // Timestamps are on their own line; label is expected on the next line
        pendingTime = timeMatch;
      }
    } else if (pendingTime) {
      // Current line is the label for the pending timestamp
      segments.push({
        id: `seg-${Date.now()}-${segments.length + 1}`,
        startTime: pendingTime.startTime,
        endTime: pendingTime.endTime,
        currentLabel: line,
        status: "idle",
      });
      pendingTime = null;
    }
  }

  return segments;
}
