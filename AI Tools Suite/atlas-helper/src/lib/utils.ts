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

/**
 * Instant Arabic Translation Helper for Atlas Action Labels & Visual Evidence
 */
export function translateToArabic(englishText: string): string {
  if (!englishText) return "";

  // Full sentence phrases mapping
  if (englishText.includes("Applied ground-truth Atlas rubric syntax rules")) {
    return "تم تطبيق القواعد النحوية والقياسية المعتمدة لأطلس.";
  }

  let ar = englishText;

  // Dictionary mappings
  const dict: [RegExp, string][] = [
    [/Action syntax verified:\s*/gi, "تم فحص وتأكيد حركة اليدين: "],
    [/Observed action:\s*/gi, "ملاحظة حركة اليدين في المشهد: "],
    [/Action verified:\s*/gi, "تم تأكيد الحركة في المشهد: "],

    // Actions
    [/\bpick up\b/gi, "التقاط"],
    [/\bplace\b/gi, "وضع"],
    [/\bset\b/gi, "وضع"],
    [/\bhold\b/gi, "إمساك"],
    [/\bpass\b/gi, "تمرير"],
    [/\bwipe\b/gi, "مسح/تنظيف"],
    [/\brotate\b/gi, "تدوير"],
    [/\bsmoothen\b/gi, "تنعيم/فرد"],
    [/\bsmooth\b/gi, "تنعيم"],
    [/\binsert\b/gi, "إدخال"],
    [/\bpull\b/gi, "سحب"],
    [/\bdig\b/gi, "حفر/تجريف"],
    [/\bgather\b/gi, "تجميع"],
    [/\bwater\b/gi, "ري/سقي"],
    [/\bfill\b/gi, "ملء"],
    [/\bstir\b/gi, "تقليب"],
    [/\brake\b/gi, "تجريف/كنس"],
    [/\balign\b/gi, "محاذاة"],
    [/\bcut\b/gi, "قص/قطع"],
    [/\bstrip\b/gi, "تقشير/تعرية"],
    [/\bslide\b/gi, "سحب/انزلاق"],
    [/\btighten\b/gi, "إحكام ربط"],
    [/\bfold\b/gi, "طيّ"],
    [/\btuck\b/gi, "ثني/إدخال"],
    [/\bsqueeze\b/gi, "عصر/ضغط"],
    [/\bposition\b/gi, "تثبيت دقيق"],

    // Objects
    [/\bbook\b/gi, "كتاب"],
    [/\bpage\b/gi, "صفحة"],
    [/\bsewing needle\b/gi, "إبرة الخياطة"],
    [/\bneedle\b/gi, "إبرة"],
    [/\bthread\b/gi, "خيط"],
    [/\bcap\b/gi, "غطاء/قبعة"],
    [/\bpatch\b/gi, "رقعة"],
    [/\bglass cup\b/gi, "كأس زجاجي"],
    [/\bglass jar\b/gi, "برطمان زجاجي"],
    [/\bcup\b/gi, "كأس"],
    [/\bjar\b/gi, "برطمان"],
    [/\bcloth\b/gi, "قطعة قماش"],
    [/\bpaper\b/gi, "ورقة"],
    [/\bpapers\b/gi, "أوراق"],
    [/\bscissors\b/gi, "مقص"],
    [/\bhoe\b/gi, "فأس/مجرفة زراعية"],
    [/\bhose\b/gi, "خرطوم المياه"],
    [/\bwatering can\b/gi, "إبريق الري"],
    [/\bbucket\b/gi, "دلو"],
    [/\bsoil\b/gi, "التربة"],
    [/\bleaves\b/gi, "أوراق الشجر"],
    [/\bplant\b/gi, "نبتة"],
    [/\bminced meat\b/gi, "لحم مفروم"],
    [/\bonions\b/gi, "بصل"],
    [/\bwok\b/gi, "مقلاة/وعاء الطهي"],
    [/\bladle\b/gi, "مغرفة الطهي"],
    [/\bscrewdriver\b/gi, "مفك براغي"],
    [/\belectrical plug\b/gi, "فيشة كهربائية"],
    [/\bplug\b/gi, "فيشة"],
    [/\bscrews\b/gi, "براغي"],
    [/\bscrew\b/gi, "برغي"],
    [/\btray\b/gi, "صينية"],
    [/\bbottle\b/gi, "زجاجة"],
    [/\bsyrup bottle\b/gi, "زجاجة شربات"],
    [/\bbag\b/gi, "كيس"],
    [/\bsachet\b/gi, "كيس صغير"],
    [/\bsnack bag\b/gi, "كيس وجبة تسالي"],
    [/\bcounter\b/gi, "رخامة/منضدة العمل"],
    [/\btable\b/gi, "طاولة"],
    [/\bground\b/gi, "الأرض"],
    [/\bfloor\b/gi, "الأرضية"],

    // Prepositions & Hands
    [/\bwith right hand\b/gi, "باليد اليمنى"],
    [/\bwith left hand\b/gi, "باليد اليسرى"],
    [/\bwith both hands\b/gi, "بكلتا اليدين"],
    [/\bin right hand\b/gi, "في اليد اليمنى"],
    [/\bin left hand\b/gi, "في اليد اليسرى"],
    [/\bin both hands\b/gi, "في كلتا اليدين"],
    [/\bfrom right hand to left hand\b/gi, "من اليد اليمنى إلى اليد اليسرى"],
    [/\bfrom left hand to right hand\b/gi, "من اليد اليسرى إلى اليد اليمنى"],
    [/\bwith\b/gi, "بـ"],
    [/\bfrom\b/gi, "من"],
    [/\bto\b/gi, "إلى"],
    [/\band\b/gi, "و"],
  ];

  for (const [regex, replacement] of dict) {
    ar = ar.replace(regex, replacement);
  }

  return ar;
}
