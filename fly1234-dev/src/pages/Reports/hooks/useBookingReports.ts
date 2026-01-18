import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { BookingReport, Trip, MatchResult, BookingFilters } from '../types';
import {
  parseTrips,
  checkMatch,
  convertJalaliToGregorian,
  normalizeDateForCompare,
  toFriendlyError,
} from '../../../lib/services/flightLogic';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const FLIGHT_PROXY_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/flightProxy";

const normFlightNo = (v?: any): string => {
  const s = String(v ?? '').toUpperCase();
  const digits = s.match(/\d+/g)?.join('') ?? '';
  return digits;
};

const toYMD = (v?: any): string => {
    if (!v) return '';

    if (v instanceof Date && !isNaN(v.getTime())) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    return '';
};

export default function useBookingReports() {
  const [allReports, setAllReports] = useState<BookingReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef(false);

  const fetchReports = useCallback(async (filters?: BookingFilters) => {
    if (inflightRef.current) return;

    const flightNo = normFlightNo(filters?.flightNumber);
    let date = toYMD(filters?.date);
    if (!date && (filters as any)?.dateFrom) {
        date = toYMD((filters as any).dateFrom);
    }

    if (!flightNo || !date) {
      setAllReports([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    inflightRef.current = true;

    try {
      const settingsRef = doc(db, 'settings', 'api_config');
      const settingsDoc = await getDoc(settingsRef);

      let apiEndpoint = '';
      let apiToken = '';
      let userSyncUrl = '';

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        apiEndpoint = settings.flightApiEndpoint;
        apiToken = settings.flightApiToken;
        userSyncUrl = settings.userSyncApiEndpoint;
      } else {
         throw new Error('API settings not found in Firestore.');
      }
      
      if (!apiEndpoint || !apiToken) {
        throw new Error('لم يتم تعيين نقطة نهاية API أو رمز المصادقة في الإعدادات.');
      }
      
      const params: Record<string, any> = {
        'pagination[page]': 1,
        'pagination[perpage]': 1000,
        'query[flightNumber]': flightNo,
        'query[flight]': flightNo,
        'query[flight_no]': flightNo,
        'query[departureFrom]': date,
        'query[departureTo]': date,
      };

      const payload = {
        endpoint: apiEndpoint,
        token: apiToken,
        params,
      };

      console.log('BookingReports payload:', payload);

      const res = await axios.post(FLIGHT_PROXY_URL, payload, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      });

      const resp = res.data;
      console.log('BookingReports response:', resp);

      if (resp?.ok === false || res.status >= 400) {
        throw new Error(resp?.message || `Proxy error: ${res.status}`);
      }

      const raw = resp?.data?.data ?? resp?.data ?? resp;

      let trips: any[] = [];
      try {
        trips = parseTrips(raw);
      } catch {
        trips = parseTrips(JSON.stringify(raw));
      }

      const reportsWithUserInfo = await Promise.all(
        (Array.isArray(trips) ? trips : []).filter(Boolean).map(async (trip: any) => {
          let userInfo = { phone: '', email: '' };

          if (trip.usersName && typeof trip.usersName === 'object' && Object.keys(trip.usersName).length > 0 && userSyncUrl) {
            const userId = Object.keys(trip.usersName)[0];
            
            try {
              const userRes = await axios.post(
                userSyncUrl,
                { userId, token: apiToken }
              );
              
              if (userRes.data?.phone) userInfo.phone = userRes.data.phone;
              if (userRes.data?.email) userInfo.email = userRes.data.email;

            } catch (userError) {
              console.warn(`Failed to fetch user info for ${userId}:`, userError);
            }
          }
          
          return {
            ...trip,
            ...userInfo,
            id: trip.id || `${trip.pnr || 'NO_PNR'}-${trip.date || 'NO_DATE'}`,
            booking_status: trip.booking_status || 'UNKNOWN',
            invoice_status: trip.invoice_status || 'UNKNOWN',
            userSearchTitle: trip.title || trip.userSearchTitle || '',
            flight_airline: trip.airline || trip.flight_airline || '',
            flight_number: normFlightNo(trip.flightNumber || trip.flight_number || trip.flight_no || trip.flight || ''),
            match_status: checkMatch(trip, {
              airline: filters?.airline,
              flightNumber: flightNo,
              date: date,
            }),
          } as BookingReport;
        })
      );

      setAllReports(reportsWithUserInfo);
    } catch (err) {
      console.error('Error fetching booking reports:', err);
      setError(toFriendlyError(err));
      setAllReports([]);
    } finally {
      inflightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  return { allReports, isLoading, error, fetchReports };
}
