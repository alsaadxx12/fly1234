import { format } from "date-fns";
import moment from "jalali-moment";
import { Trip, MatchResult } from '../../pages/Reports/types';
import axios from 'axios';


// --- Date Helpers ---
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function formatDateSafely(
  dateStr: string,
  pattern: string,
  fallback?: string,
): string {
  if (!dateStr) return fallback || "";
  try {
    const date = new Date(dateStr);
    if (!isValidDate(date)) return fallback || dateStr;
    return format(date, pattern);
  } catch {
    return fallback || dateStr;
  }
}

export function formatDateYMD(dateStr: string) {
  return formatDateSafely(dateStr, "yyyy/MM/dd", dateStr);
}

export function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

export function toMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

export function convertJalaliToGregorian(dateStr: string): string {
  if (!dateStr) return dateStr;
  try {
    const m = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!m) return dateStr;

    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);

    // Check if this is a Jalali date (Shamsi year range 1300-1499)
    if (year >= 1300 && year <= 1499) {
      const jDate = moment(`${year}/${month}/${day}`, "jYYYY/jMM/jDD");
      return jDate.format("YYYY-MM-DD");
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function normalizeDateForCompare(s?: string) {
  if (!s) return "";
  const m = String(s).match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : String(s);
}

export function convertToDisplayFormat(dateStr: string): string {
  if (!dateStr) return "";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateStr;
  return `${m[3]}/${m[2]}/${m[1]}`; // DD/MM/YYYY
}

export function convertFromDisplayFormat(displayStr: string): string {
  if (!displayStr) return "";
  const m = displayStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (!m) return displayStr;
  return `${m[3]}-${m[2]}-${m[1]}`; // YYYY-MM-DD
}

export function equalCI(a?: string, b?: string) {
  return (
    String(a ?? "").trim().toUpperCase() === String(b ?? "").trim().toUpperCase()
  );
}

export function containsKeyword(text?: string, keyword?: string): boolean {
  if (!text || !keyword) return false;
  const cleanText = String(text).trim().toUpperCase();
  const cleanKeyword = String(keyword).trim().toUpperCase();
  return cleanText.includes(cleanKeyword);
}

export function checkMatch(
  trip: Trip,
  criteria: { airline?: string; flightNumber?: string; date?: string; }
): MatchResult {
  if (!criteria.airline) return "NONE";

  // 1. Airline name must match exactly (case-insensitive)
  if (!equalCI(trip.airline, criteria.airline)) {
    return "NONE";
  }

  // 2. Flight number must match exactly
  if (criteria.flightNumber && !equalCI(trip.flightNumber, criteria.flightNumber)) {
    return "FLIGHT_NO_MISMATCH";
  }

  // 3. Date must match exactly
  if (criteria.date && normalizeDateForCompare(trip.date) !== normalizeDateForCompare(criteria.date)) {
    return "DATE_MISMATCH";
  }

  return "EXACT";
}

export function toFriendlyError(err: unknown): string {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ERR_NETWORK') return 'خطأ في الشبكة. يرجى التحقق من الاتصال.';
      if (err.response?.status === 401) return 'فشل المصادقة. تحقق من الـ Token.';
      if (err.response) {
        return `حدث خطأ من الخادم: ${err.response.status} - ${String(
          (err.response.data as any)?.message || err.message
        )}`;
      }
      return String(err.message) || 'فشل في الاتصال.';
    }
    return (err as any)?.message || 'فشل في تحميل بيانات التبليغات.';
}


// --- Parser ---
export function parseTrips(raw: string): Trip[] {
  const text = raw.trim();
  if (!text) return [];

  const extractFlightNo = (s: string | undefined): string => {
    if (!s) return "";
    const match = String(s).match(/[A-Z0-9]{2,}\s*(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    const numbers = String(s).match(/\d+/g);
    if (numbers) {
      return numbers.reduce((a, b) => (a.length > b.length ? a : b), "");
    }
    return "";
  };
  

  const normalizeDate = (d: string | undefined) => {
    if (!d) return undefined as unknown as string;
    const m = String(d).match(/(\d{4}[\/-]\d{2}[\/-]\d{2})/);
    return m ? m[1].replace(/-/g, "/") : String(d);
  };

  try {
    const json = JSON.parse(text);
    const arr = Array.isArray(json)
      ? json
      : Array.isArray((json as any)?.data?.data)
        ? (json as any).data.data
        : Array.isArray((json as any)?.data)
          ? (json as any).data
          : null;

    if (arr) {
      const out: Trip[] = [];
      for (const r of arr) {
        const legs: any[] = r.serviceDetails?.legsInfo ?? [];
        
        let tripData: Partial<Trip> = { ...r };

        if (legs.length > 0) {
          const firstLeg = legs[0];
          tripData = {
            ...tripData,
            flightNumber: extractFlightNo(firstLeg.airlineAndflightNumber),
            date: normalizeDate(firstLeg.date),
            origin: firstLeg.departureAirportAbb,
            destination: firstLeg.arrivalAirportAbb,
            airline: firstLeg.airline ?? r.flight_airline,
            time: firstLeg.departureTime || firstLeg.time,
          };
        } else {
          // Fallback for flat structure
          tripData = {
            ...tripData,
            flightNumber: extractFlightNo(r.flightNumber ?? r.flight_no ?? r.flight),
            date: normalizeDate(r.date ?? r.flightDate),
            origin: r.origin ?? r.from,
            destination: r.destination ?? r.to,
            airline: r.airline ?? r.flight_airline,
            time: r.departureTime || r.time,
          };
        }
        
        // Add all other fields from the raw object
        const fullTrip: Trip = {
          ...r, // This includes everything from the source
          ...tripData,
          buyer: String(r.buyer ?? r.customer ?? r.client ?? r.userSearchTitle ?? r.lp_reference ?? '').trim(),
          title: String(r.userSearchTitle ?? r.lp_reference ?? r.buyer ?? '').trim(),
          pnr: String(r.pnr ?? r.PNR ?? r.booking ?? '').trim(),
          booking_status: String(r.booking_status ?? r.bookingStatus ?? "").toUpperCase() || undefined,
          "supplier pricing": r["supplier pricing"],
          "supplier currency": r["supplier currency"],
        };

        if (fullTrip.pnr || fullTrip.flightNumber) {
          out.push(fullTrip);
        }
      }
      return out;
    }
  } catch {
    // Ignore JSON error
  }
  return [];
}
