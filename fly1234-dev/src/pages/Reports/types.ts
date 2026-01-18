export type MatchResult = "EXACT" | "FLIGHT_NO_MISMATCH" | "DATE_MISMATCH" | "NONE";

export interface Trip {
  id?: string;
  counter?: number;
  reference_id?: string;
  bookingId?: string;
  supplier?: string;
  lp_reference?: string;
  amount?: string;
  currency?: string;
  "supplier pricing"?: number;
  "supplier price customization"?: number;
  "supplier currency"?: string;
  invoice_id?: string;
  invoice_status?: string;
  created_at?: string;
  controller?: string;
  location?: string;
  userImage?: string;
  userSearchTitle?: string;
  userCountry?: string;
  userBuyerGroup?: string;
  travelService?: string;
  provider?: string;
  adults?: number;
  children?: number;
  infants?: number;
  leaderETicket?: string;
  returnLeaderETicket?: string;
  serviceDetails?: any;
  buyer: string;
  title: string;
  pnr: string;
  flightNumber: string;
  date?: string;
  origin?: string;
  destination?: string;
  airline?: string;
  booking_status?: string;
  booking_date?: string;
  time?: string;
  tripType?: 'oneWay' | 'roundTrip';
  flight_airline?: string;
  supplierErrorMsg?: string;
  phone?: string;
  email?: string;
}

export interface LegInfo {
  time: string;
  date: string;
  airlineAndflightNumber: string;
  departureAirportAbb: string;
  arrivalAirportAbb: string;
  airline: string;
}

export interface ServiceDetails {
  tripType: 'oneWay' | 'roundTrip';
  legsInfo: LegInfo[];
  allBooking: boolean;
}

export interface BookingReport extends Trip {
  id: string; // Ensure id is always a string
  match_status: MatchResult;
  flight_number?: string;
}

export interface BookingFilters {
  airline?: string;
  flightNumber?: string;
  date?: string;
  origin?: string;
  destination?: string;
}
