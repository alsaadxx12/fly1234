import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import moment from "jalali-moment";

interface Passenger {
  name: string;
  passportNumber: string;
  ticketNumber: string;
  passengerType: 'adult' | 'child' | 'infant';
}

export interface ExtractedData {
  airline: string;
  flightNumber: string;
  date: string;
  origin: string;
  destination: string;
  type:
    | 'delay'
    | 'advance'
    | 'cancel'
    | 'number_change'
    | 'number_time_delay'
    | 'number_time_advance'
    | '';
  oldTime: string;
  newTime: string;
  newFlightNumber: string;
  newAirline: string;
  pnr: string;
  passengers: Passenger[];
}

// ---------------- Helpers ----------------

function normalizeDigits(input: string): string {
  const map: Record<string, string> = {
    "٠": "0", "۰": "0", "١": "1", "۱": "1", "٢": "2", "۲": "2",
    "٣": "3", "۳": "3", "٤": "4", "۴": "4", "٥": "5", "۵": "5",
    "٦": "6", "۶": "6", "٧": "7", "۷": "7", "٨": "8", "۸": "8",
    "٩": "9", "۹": "9",
  };
  return String(input).replace(/[٠-٩۰-۹]/g, (d) => map[d] || d);
}

function cleanText(raw: string): string {
  return normalizeDigits(raw || "")
    .replace(/\u200c/g, " ") // ZWNJ
    .replace(/\s+/g, " ")
    .trim();
}

function extractJson(text: string): any {
  const cleaned = (text || "").trim();
  const fence = cleaned.match(/```\w*\n([\s\S]*?)```/);
  const body = fence ? fence[1] : cleaned;
  const firstBrace = body.indexOf("{");
  const lastBrace = body.lastIndexOf("}");
  const jsonStr =
    firstBrace >= 0 && lastBrace >= 0
      ? body.slice(firstBrace, lastBrace + 1)
      : body;

  try {
    return JSON.parse(jsonStr);
  } catch {
    try {
      return JSON.parse(normalizeDigits(jsonStr));
    } catch {
      return {};
    }
  }
}

/**
 * ✅ تحويل جلالي إلى ميلادي بصيغة ثابتة (بدون انزلاق يوم)
 * نثبت على 12:00 داخل النص نفسه.
 */
function jalaliToGregorianISO(jy: number, jm: number, jd: number): string | undefined {
  const g = moment(`${jy}/${jm}/${jd} 12:00`, "jYYYY/jM/jD HH:mm", true);
  if (!g.isValid()) return undefined;
  return g.format("YYYY-MM-DD");
}

/**
 * ✅ يستخرج تاريخ جلالي كامل من داخل النص مثل:
 * 1404/10/20 أو 1404-10-20 أو 1404.10.20
 * ويرجعه ميلادي: YYYY-MM-DD
 */
function extractFullJalaliDateFromText(rawText: string): string | undefined {
  if (!rawText) return undefined;
  const text = cleanText(rawText);

  const m = text.match(/\b(1[34]\d{2})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/);
  if (!m) return undefined;

  const jy = parseInt(m[1], 10);
  const jm = parseInt(m[2], 10);
  const jd = parseInt(m[3], 10);

  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return undefined;

  return jalaliToGregorianISO(jy, jm, jd);
}

/**
 * ✅ يقرأ "19 دی" من النص الأصلي ويحوّله إلى ميلادي
 * ✅ يستخدم السنة الجلالية الحالية فقط (بدون قفز للسنة القادمة)
 */
function extractJalaliDayMonthFromText(rawText: string): string | undefined {
  if (!rawText) return undefined;
  const text = cleanText(rawText);

  const JALALI_MONTHS: Record<string, number> = {
    "فروردین": 1, "اردیبهشت": 2, "خرداد": 3, "تیر": 4, "مرداد": 5, "شهریور": 6,
    "مهر": 7, "آبان": 8, "آذر": 9, "دی": 10, "بهمن": 11, "اسفند": 12,
  };

  const monthPattern = Object.keys(JALALI_MONTHS).join('|');
  const m = text.match(new RegExp(`\\b(\\d{1,2})\\s*(${monthPattern})\\b`));
  if (!m) return undefined;

  const day = parseInt(m[1], 10);
  const month = JALALI_MONTHS[m[2]];
  if (!month || day < 1 || day > 31) return undefined;

  // ✅ السنة الجلالية الحالية فقط
  const jy = moment().jYear();

  return jalaliToGregorianISO(jy, month, day);
}

/**
 * ✅ تطبيع تاريخ (ميلادي أو جلالي) إلى YYYY-MM-DD
 * - يدعم:
 *   - جلالي داخل نص (1404/10/20)
 *   - نص صافي YYYY/MM/DD
 *   - DD/MM/YYYY (ميلادي)
 */
function normalizeDateToISO(input?: string): string | undefined {
  if (!input) return undefined;

  const s = cleanText(String(input))
    .replace(/\./g, "/")
    .replace(/-/g, "/");

  // 1) جلالي كامل داخل النص
  const jalaliInside = extractFullJalaliDateFromText(s);
  if (jalaliInside) return jalaliInside;

  // 2) YYYY/MM/DD صافي
  const mYMD = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (mYMD) {
    const y = parseInt(mYMD[1], 10);
    const mo = parseInt(mYMD[2], 10);
    const d = parseInt(mYMD[3], 10);

    // جلالي
    if (y >= 1300 && y <= 1500) {
      return jalaliToGregorianISO(y, mo, d);
    }

    // ميلادي
    if (y > 1900 && y < 3000) {
      return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // 3) DD/MM/YYYY (ميلادي)
  const mDMY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mDMY) {
    const d = parseInt(mDMY[1], 10);
    const mo = parseInt(mDMY[2], 10);
    const y = parseInt(mDMY[3], 10);
    if (y > 1900 && y < 3000) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  return undefined;
}

function normalizeTime24(input?: string): string | undefined {
  if (!input) return undefined;
  const s = normalizeDigits(String(input)).replace(/\s/g, "");
  const m = s.match(/(\d{1,2})[:٫.](\d{1,2})/);
  if (!m) return undefined;
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

async function callGeminiAPI(prompt: string, apiKey: string): Promise<string> {
  const model = "gemini-2.5-flash";

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  } as const;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      }

      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        lastError = new Error(JSON.stringify(errorJson));
      } catch {
        lastError = new Error(errorText);
      }

      if (response.status === 403 || response.status === 404 || response.status === 400) {
        throw lastError;
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (lastError.message.includes("PERMISSION_DENIED") || lastError.message.includes("NOT_FOUND")) {
        throw lastError;
      }
    }
    await new Promise(res => setTimeout(res, 1000 * (i + 1)));
  }

  throw lastError || new Error(`Gemini request failed after ${maxRetries} retries.`);
}

export class ReportDataExtractor {

  private static async getApiKey(): Promise<string> {
    try {
      const settingsRef = doc(db, 'settings', 'api_config');
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists() && (settingsDoc.data() as any).aiApiKey) {
        return (settingsDoc.data() as any).aiApiKey;
      }

      const localKey = localStorage.getItem('ai_api_key') || localStorage.getItem('openai_api_key');
      if (localKey) return localKey;

    } catch (error) {
      console.error('Error fetching API key:', error);
    }
    return '';
  }

  public static async extractAndTranslate(text: string): Promise<{ extractedData: ExtractedData, translatedText: string }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error("API Key not found. Please set it in the AI Settings.");

    // ✅ أولاً: تاريخ جلالي كامل داخل النص (أقوى)
    const fullJalaliISO = extractFullJalaliDateFromText(text);

    // ✅ ثانياً: يوم + شهر مثل 19 دی (سنة جلالية حالية فقط)
    const jalaliHintISO = fullJalaliISO || extractJalaliDayMonthFromText(text);

    const todayISO = new Date().toISOString().slice(0, 10);

    const combinedPrompt = [
      "You are an expert flight data analyst and translator.",
      "Your task is to perform two actions on the provided text:",
      "1) Extraction: Extract flight details into a valid JSON object.",
      "Rules:",
      "- pnr: 6 alphanumeric, often PNR or #BK. Default empty.",
      "- flightNumber: numeric part only.",
      "- origin/destination: MUST be 3-letter IATA codes. Infer from city names.",
      `- TODAY is ${todayISO}.`,
      "- date: Output yyyy-MM-dd. If the year is missing, infer the most logical year based on TODAY.",
      "- oldTime/newTime: HH:mm 24h. If only one time exists, it is newTime.",
      "- airline: Use proper airline name. Default empty.",
      "- type: one of delay, advance, cancel, number_change, number_time_delay, number_time_advance. Infer when possible.",
      "- newFlightNumber/newAirline if applicable, else empty.",
      "2) Translation: Translate original text to proper Arabic. Keep formatting, numbers, and dates EXACTLY as they appear. If already Arabic return as-is.",
      "Return ONE JSON object with keys: extractedData, translatedText.",
      "Text to process:",
      text
    ].join("\n");

    try {
      const result = await callGeminiAPI(combinedPrompt, apiKey);
      const parsedResult = extractJson(result);

      if (!parsedResult?.extractedData || !parsedResult?.translatedText) {
        throw new Error("Invalid response structure from AI.");
      }

      const obj = parsedResult.extractedData;

      const toIata = (s: string): string => {
        const up = (s || "").trim().toUpperCase();
        if (/^[A-Z]{3}$/.test(up)) return up;
        const code = up.match(/\b[A-Z]{3}\b/);
        return code ? code[0] : up;
      };

      const rawType = String(obj.type || "").toLowerCase();
      const newTime = normalizeTime24((obj as any).newTime || (obj as any).new_time);
      const oldTime = normalizeTime24((obj as any).oldTime || (obj as any).old_time);
      const newFlightNumber = String((obj as any).newFlightNumber || "").trim();

      let inferredType = rawType;
      const allowed = ["delay", "advance", "cancel", "number_change", "number_time_delay", "number_time_advance"];
      if (!allowed.includes(inferredType)) {
        if (newFlightNumber && newTime) inferredType = "number_time_delay";
        else if (newFlightNumber) inferredType = "number_change";
        else if (newTime) inferredType = "delay";
        else inferredType = "";
      }

      const aiDateISO = normalizeDateToISO(String((obj as any).date || (obj as any).flightDate || ""));
      const finalDateISO = jalaliHintISO || aiDateISO || '';

      const extractedData: ExtractedData = {
        airline: String((obj as any).airline || "").trim(),
        flightNumber: String((obj as any).flightNumber || (obj as any).flight_no || "").trim(),
        date: finalDateISO,
        origin: toIata(String((obj as any).origin || "")),
        destination: toIata(String((obj as any).destination || "")),
        type: inferredType as ExtractedData['type'],
        oldTime: oldTime || "",
        newTime: newTime || "",
        newFlightNumber: newFlightNumber,
        newAirline: String((obj as any).newAirline || "").trim(),
        pnr: String((obj as any).pnr || "").trim(),
        passengers: []
      };

      return { extractedData, translatedText: parsedResult.translatedText };
    } catch (error) {
      console.error("Error in extractAndTranslate:", error);
      throw new Error(`Failed to process text with AI. ${error instanceof Error ? error.message : ''}`);
    }
  }

  public static async extractFromPDF(_file: File): Promise<ExtractedData> {
    return {} as ExtractedData; // Placeholder
  }

  public static async extractFromImage(_file: File): Promise<ExtractedData> {
    return {} as ExtractedData; // Placeholder
  }
}
