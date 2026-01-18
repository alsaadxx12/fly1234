import { collection, query, where, getDocs, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  totalProfit: number;
  usdProfit: number;
  iqdProfit: number;
  ticketCount: number;
  visaCount: number;
  changeCount: number;
  refundCount: number;
}

interface EmployeeOfTheMonth {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  totalProfit: number;
  usdProfit: number;
  iqdProfit: number;
  ticketCount: number;
  visaCount: number;
  changeCount: number;
  refundCount: number;
  month: number;
  year: number;
  createdAt: Date;
}

export const calculateEmployeeOfTheMonth = async (month: number, year: number): Promise<EmployeeOfTheMonth | null> => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const employeesRef = collection(db, 'employees');
    const employeesSnapshot = await getDocs(employeesRef);
    const employees = employeesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || '',
      email: doc.data().email || ''
    }));

    const statsMap = new Map<string, EmployeeStats>();

    employees.forEach(emp => {
      statsMap.set(emp.id, {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeEmail: emp.email,
        totalProfit: 0,
        usdProfit: 0,
        iqdProfit: 0,
        ticketCount: 0,
        visaCount: 0,
        changeCount: 0,
        refundCount: 0
      });
    });

    const ticketsRef = collection(db, 'tickets');
    const ticketsSnapshot = await getDocs(ticketsRef);

    ticketsSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const createdAt = data.createdAt?.toDate();

      if (!createdAt || createdAt < startDate || createdAt > endDate) {
        return;
      }

      const stats = statsMap.get(data.createdBy);
      if (!stats) return;

      const passengers = data.passengers || [];
      passengers.forEach((passenger: any) => {
        const purchase = passenger.purchasePrice || 0;
        const sale = passenger.salePrice || 0;
        const profit = sale - purchase;

        if (data.currency === 'USD') {
          stats.usdProfit += profit;
        } else {
          stats.iqdProfit += profit;
        }

        if (data.type === 'entry') {
          stats.ticketCount++;
        } else if (data.type === 'change') {
          stats.changeCount++;
        } else if (data.type === 'refund') {
          stats.refundCount++;
        }
      });

      stats.totalProfit = stats.usdProfit + stats.iqdProfit;
    });

    const visasRef = collection(db, 'visas');
    const visasSnapshot = await getDocs(visasRef);

    visasSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const createdAt = data.createdAt?.toDate();

      if (!createdAt || createdAt < startDate || createdAt > endDate) {
        return;
      }

      const stats = statsMap.get(data.createdBy);
      if (!stats) return;

      const purchase = data.purchasePrice || 0;
      const sale = data.salePrice || 0;
      const profit = sale - purchase;

      stats.usdProfit += profit;
      stats.visaCount++;
      stats.totalProfit = stats.usdProfit + stats.iqdProfit;
    });

    const allStats = Array.from(statsMap.values());
    const topEmployee = allStats.reduce((prev, current) => {
      return (current.totalProfit > prev.totalProfit) ? current : prev;
    }, allStats[0]);

    if (!topEmployee || topEmployee.totalProfit === 0) {
      return null;
    }

    const employeeOfTheMonth: EmployeeOfTheMonth = {
      ...topEmployee,
      month,
      year,
      createdAt: new Date()
    };

    return employeeOfTheMonth;
  } catch (error) {
    console.error('Error calculating employee of the month:', error);
    return null;
  }
};

export const saveEmployeeOfTheMonth = async (data: EmployeeOfTheMonth): Promise<boolean> => {
  try {
    const docId = `${data.year}-${String(data.month).padStart(2, '0')}`;
    const docRef = doc(db, 'employeeOfTheMonth', docId);

    await setDoc(docRef, {
      ...data,
      createdAt: Timestamp.fromDate(data.createdAt)
    });

    return true;
  } catch (error) {
    console.error('Error saving employee of the month:', error);
    return false;
  }
};

export const getEmployeeOfTheMonth = async (month: number, year: number): Promise<EmployeeOfTheMonth | null> => {
  try {
    const docId = `${year}-${String(month).padStart(2, '0')}`;
    const docRef = doc(db, 'employeeOfTheMonth', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as EmployeeOfTheMonth;
    }

    return null;
  } catch (error) {
    console.error('Error getting employee of the month:', error);
    return null;
  }
};

export const checkAndCalculateEmployeeOfTheMonth = async (): Promise<void> => {
  const now = new Date();
  const currentDay = now.getDate();

  if (currentDay !== 1) {
    return;
  }

  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const existing = await getEmployeeOfTheMonth(lastMonth, lastYear);
  if (existing) {
    return;
  }

  const topEmployee = await calculateEmployeeOfTheMonth(lastMonth, lastYear);
  if (topEmployee) {
    await saveEmployeeOfTheMonth(topEmployee);
  }
};

export const getAllEmployeesOfTheMonth = async (): Promise<EmployeeOfTheMonth[]> => {
  try {
    const collectionRef = collection(db, 'employeeOfTheMonth');
    const snapshot = await getDocs(collectionRef);

    const employees = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as EmployeeOfTheMonth;
    });

    employees.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return employees;
  } catch (error) {
    console.error('Error getting all employees of the month:', error);
    return [];
  }
};
