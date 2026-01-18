import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, Check } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { TicketType, Passenger, PassengerType } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import CustomDatePicker from './CustomDatePicker';
import RouteInput from './RouteInput';
import BeneficiarySelector from './BeneficiarySelector';
import SourceSelector from './SourceSelector';

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (pnr: string, passengers: Passenger[], type: TicketType, notes?: string, additionalData?: {
    route?: string;
    beneficiary?: string;
    source?: string;
    currency?: string;
    entryDate?: Date;
    issueDate?: Date;
  }) => Promise<void>;
  initialType?: TicketType;
  editingTicket?: {
    id: string;
    pnr: string;
    passengers: Passenger[];
    type: TicketType;
    notes?: string;
    entryDate?: Date;
    issueDate?: Date;
    route?: string;
    beneficiary?: string;
    source?: string;
    currency?: string;
  } | null;
}

interface Company {
  id: string;
  name: string;
  entityType?: 'company' | 'client' | 'expense';
}

interface Source {
  id: string;
  name: string;
  currency: 'IQD' | 'USD';
}

export default function AddTicketModal({ isOpen, onClose, onAdd, initialType = 'entry', editingTicket }: AddTicketModalProps) {
  const { theme } = useTheme();
  const passengersContainerRef = useRef<HTMLDivElement>(null);
  const [pnr, setPnr] = useState('');
  const [type, setType] = useState<TicketType>(initialType);
  const [notes, setNotes] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [routes, setRoutes] = useState(['']);
  const [beneficiary, setBeneficiary] = useState('');
  const [source, setSource] = useState('');
  const [currency, setCurrency] = useState('IQD');
  const [passengers, setPassengers] = useState<Passenger[]>([
    { id: crypto.randomUUID(), name: '', passportNumber: '', passengerType: 'adult', purchasePrice: 0, salePrice: 0, ticketNumber: '' }
  ]);
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [infantsCount, setInfantsCount] = useState(0);
  const [showPassengersDropdown, setShowPassengersDropdown] = useState(false);
  const passengersDropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [globalPurchasePrice, setGlobalPurchasePrice] = useState<number | ''>('');
  const [globalSalePrice, setGlobalSalePrice] = useState<number | ''>('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (passengersDropdownRef.current && !passengersDropdownRef.current.contains(event.target as Node)) {
        setShowPassengersDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const totalCount = adultsCount + childrenCount + infantsCount;
    const currentCount = passengers.length;

    if (totalCount > currentCount) {
      const newPassengers = [...passengers];
      for (let i = currentCount; i < totalCount; i++) {
        let passengerType: PassengerType = 'adult';
        if (i < adultsCount) {
          passengerType = 'adult';
        } else if (i < adultsCount + childrenCount) {
          passengerType = 'child';
        } else {
          passengerType = 'infant';
        }
        newPassengers.push({
          id: crypto.randomUUID(),
          name: '',
          passportNumber: '',
          passengerType,
          purchasePrice: 0,
          salePrice: 0,
          ticketNumber: ''
        });
      }
      setPassengers(newPassengers);
    } else if (totalCount < currentCount) {
      setPassengers(passengers.slice(0, totalCount));
    }
  }, [adultsCount, childrenCount, infantsCount]);

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
      loadSources();

      if (editingTicket) {
        setPnr(editingTicket.pnr);
        setType(editingTicket.type);
        setNotes(editingTicket.notes || '');
        setPassengers(editingTicket.passengers);
        setRoutes(editingTicket.route ? editingTicket.route.split(' - ') : ['']);
        setBeneficiary(editingTicket.beneficiary || '');
        setSource(editingTicket.source || '');
        setCurrency(editingTicket.currency || 'IQD');

        if (editingTicket.entryDate) {
          setEntryDate(new Date(editingTicket.entryDate).toISOString().split('T')[0]);
        }
        if (editingTicket.issueDate) {
          setIssueDate(new Date(editingTicket.issueDate).toISOString().split('T')[0]);
        }
        if (editingTicket.notes) {
          setShowNotes(true);
        }

        const adults = editingTicket.passengers.filter(p => p.passengerType === 'adult').length;
        const children = editingTicket.passengers.filter(p => p.passengerType === 'child').length;
        const infants = editingTicket.passengers.filter(p => p.passengerType === 'infant').length;
        setAdultsCount(adults);
        setChildrenCount(children);
        setInfantsCount(infants);
      } else {
        setType(initialType);
        setAdultsCount(1);
        setChildrenCount(0);
        setInfantsCount(0);
        const today = new Date().toISOString().split('T')[0];
        setEntryDate(today);
        setIssueDate(today);
      }
    } else {
      resetForm();
    }
  }, [isOpen, initialType, editingTicket]);

  const resetForm = () => {
    setPnr('');
    setNotes('');
    setRoutes(['']);
    setBeneficiary('');
    setSource('');
    setCurrency('IQD');
    setPassengers([
      { id: crypto.randomUUID(), name: '', passportNumber: '', passengerType: 'adult', purchasePrice: 0, salePrice: 0, ticketNumber: '' }
    ]);
    setGlobalPurchasePrice('');
    setGlobalSalePrice('');
    setError('');
    setLoading(false);
  };

  const loadCompanies = async () => {
    try {
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);
      const companiesList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        entityType: doc.data().entityType
      }));
      setCompanies(companiesList);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  const loadSources = async () => {
    try {
      const sourcesRef = collection(db, 'sources');
      const snapshot = await getDocs(sourcesRef);
      const sourcesList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        currency: doc.data().currency
      }));
      setSources(sourcesList);
    } catch (err) {
      console.error('Error loading sources:', err);
    }
  };


  const handleAddPassenger = () => {
    setPassengers([
      ...passengers,
      { id: crypto.randomUUID(), name: '', passportNumber: '', passengerType: 'adult', purchasePrice: 0, salePrice: 0, ticketNumber: '' }
    ]);

    setTimeout(() => {
      if (passengersContainerRef.current) {
        passengersContainerRef.current.scrollTo({
          top: passengersContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleRemovePassenger = (id: string) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter(p => p.id !== id));
    }
  };

  const handleUpdatePassenger = (id: string, field: keyof Passenger, value: any) => {
    setPassengers(passengers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const applyGlobalPrices = () => {
    if (globalPurchasePrice !== '' || globalSalePrice !== '') {
      setPassengers(passengers.map(p => ({
        ...p,
        ...(globalPurchasePrice !== '' && { purchasePrice: Number(globalPurchasePrice) }),
        ...(globalSalePrice !== '' && { salePrice: Number(globalSalePrice) })
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const routeString = routes.filter(r => r.trim()).join(' - ');

      const enrichedPassengers = passengers.map(p => ({
        ...p,
        ticketDate: entryDate,
        route: routeString,
        beneficiary,
        source,
        currency
      }));

      await onAdd(pnr, enrichedPassengers, type, notes, {
        route: routeString,
        beneficiary,
        source,
        currency,
        entryDate: entryDate ? new Date(entryDate) : undefined,
        issueDate: issueDate ? new Date(issueDate) : undefined
      });

      setPnr('');
      setType('entry');
      setNotes('');
      const today = new Date().toISOString().split('T')[0];
      setEntryDate(today);
      setIssueDate(today);
      setRoutes(['']);
      setBeneficiary('');
      setSource('');
      setCurrency('IQD');
      setPassengers([{ id: crypto.randomUUID(), name: '', passportNumber: '', passengerType: 'adult', purchasePrice: 0, salePrice: 0, ticketNumber: '' }]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة التذكرة');
    } finally {
      setLoading(false);
    }
  };

  // This component will be rendered in a portal
  // Return null because createPortal handles the rendering
  return null;
}
