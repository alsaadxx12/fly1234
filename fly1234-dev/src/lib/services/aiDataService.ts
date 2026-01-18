import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface SafeBalance {
  name: string;
  balance_usd: number;
  balance_iqd: number;
  unconfirmed_balance_usd: number;
  unconfirmed_balance_iqd: number;
}

export interface AIDataContext {
  vouchers: any[];
  safes: SafeBalance[];
  companies: any[];
  employees: any[];
  summary: {
    totalSafes: number;
    totalCompanies: number;
    totalEmployees: number;
    totalBalanceUSD: number;
    totalBalanceIQD: number;
    totalUnconfirmedUSD: number;
    totalUnconfirmedIQD: number;
  };
}

export const getAIDataContext = async (): Promise<AIDataContext> => {
  try {
    const vouchersRef = collection(db, 'vouchers');
    const vouchersSnapshot = await getDocs(vouchersRef);
    const vouchers = vouchersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date()
    }));

    const safesRef = collection(db, 'safes');
    const safesSnapshot = await getDocs(safesRef);
    const safes = safesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const safesWithUnconfirmedBalances: SafeBalance[] = [];

    for (const safe of safes) {
      const safeVouchers = vouchers.filter(v => v.safeId === safe.id);

      let confirmedUSD = 0;
      let confirmedIQD = 0;
      let unconfirmedUSD = 0;
      let unconfirmedIQD = 0;

      safeVouchers.forEach(voucher => {
        const amount = typeof voucher.amount === 'number' ? voucher.amount : parseFloat(voucher.amount) || 0;
        const factor = voucher.type === 'receipt' ? 1 : -1;

        if (voucher.confirmation === true) {
          if (voucher.currency === 'USD') {
            confirmedUSD += amount * factor;
          } else {
            confirmedIQD += amount * factor;
          }
        } else {
          if (voucher.currency === 'USD') {
            unconfirmedUSD += amount * factor;
          } else {
            unconfirmedIQD += amount * factor;
          }
        }
      });

      safesWithUnconfirmedBalances.push({
        name: safe.name,
        balance_usd: confirmedUSD,
        balance_iqd: confirmedIQD,
        unconfirmed_balance_usd: unconfirmedUSD,
        unconfirmed_balance_iqd: unconfirmedIQD
      });
    }

    const companiesRef = collection(db, 'companies');
    const companiesSnapshot = await getDocs(companiesRef);
    const companies = companiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const employeesRef = collection(db, 'employees');
    const employeesSnapshot = await getDocs(employeesRef);
    const employees = employeesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalBalanceUSD = safesWithUnconfirmedBalances.reduce((sum, safe) => sum + safe.balance_usd, 0);
    const totalBalanceIQD = safesWithUnconfirmedBalances.reduce((sum, safe) => sum + safe.balance_iqd, 0);
    const totalUnconfirmedUSD = safesWithUnconfirmedBalances.reduce((sum, safe) => sum + safe.unconfirmed_balance_usd, 0);
    const totalUnconfirmedIQD = safesWithUnconfirmedBalances.reduce((sum, safe) => sum + safe.unconfirmed_balance_iqd, 0);

    return {
      vouchers,
      safes: safesWithUnconfirmedBalances,
      companies,
      employees,
      summary: {
        totalSafes: safes.length,
        totalCompanies: companies.length,
        totalEmployees: employees.length,
        totalBalanceUSD,
        totalBalanceIQD,
        totalUnconfirmedUSD,
        totalUnconfirmedIQD
      }
    };
  } catch (error) {
    console.error('Error getting AI data context:', error);
    throw error;
  }
};

export const formatDataForAI = (data: AIDataContext): string => {
  let context = `## ملخص البيانات:\n`;
  context += `- عدد الصناديق: ${data.summary.totalSafes}\n`;
  context += `- عدد الشركات: ${data.summary.totalCompanies}\n`;
  context += `- عدد الموظفين: ${data.summary.totalEmployees}\n`;
  context += `- إجمالي الأرصدة المؤكدة: ${data.summary.totalBalanceUSD.toLocaleString()} دولار، ${data.summary.totalBalanceIQD.toLocaleString()} دينار\n`;
  context += `- إجمالي الأرصدة المعلقة: ${data.summary.totalUnconfirmedUSD.toLocaleString()} دولار، ${data.summary.totalUnconfirmedIQD.toLocaleString()} دينار\n\n`;

  if (data.safes.length > 0) {
    context += `## الصناديق (الأرصدة المؤكدة والمعلقة):\n`;
    data.safes.forEach(safe => {
      context += `- ${safe.name}:\n`;
      context += `  • رصيد مؤكد: ${safe.balance_usd.toLocaleString()} دولار، ${safe.balance_iqd.toLocaleString()} دينار\n`;
      if (safe.unconfirmed_balance_usd !== 0 || safe.unconfirmed_balance_iqd !== 0) {
        context += `  • رصيد معلق: ${safe.unconfirmed_balance_usd.toLocaleString()} دولار، ${safe.unconfirmed_balance_iqd.toLocaleString()} دينار\n`;
      }
    });
    context += `\n`;
  }

  if (data.companies.length > 0) {
    context += `## الشركات (${data.companies.length} شركة):\n`;
    data.companies.forEach(company => {
      context += `- ${company.name}: ${company.balance || 0} ${company.currency || 'IQD'}\n`;
    });
    context += `\n`;
  }

  if (data.employees.length > 0) {
    context += `## الموظفين (${data.employees.length} موظف):\n`;
    data.employees.forEach(employee => {
      context += `- ${employee.name}: ${employee.role || 'موظف'} - ${employee.isActive ? 'نشط' : 'غير نشط'}\n`;
    });
    context += `\n`;
  }

  context += `## السندات (${data.vouchers.length} سند متاح للبحث):\n`;
  context += `يمكنك البحث في جميع السندات عن طريق:\n`;
  context += `- اسم العميل\n`;
  context += `- اسم الشركة\n`;
  context += `- رقم السند\n`;
  context += `- الملاحظات\n`;
  context += `- نوع السند (قبض/صرف)\n`;
  context += `- العملة (دولار/دينار)\n`;
  context += `- حالة التأكيد\n\n`;

  return context;
};

export const searchVouchers = async (searchTerm: string) => {
  try {
    const vouchersRef = collection(db, 'vouchers');
    const vouchersSnapshot = await getDocs(vouchersRef);

    const vouchers = vouchersSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(voucher => {
        const searchLower = searchTerm.toLowerCase();
        return (
          voucher.clientName?.toLowerCase().includes(searchLower) ||
          voucher.companyName?.toLowerCase().includes(searchLower) ||
          voucher.note?.toLowerCase().includes(searchLower) ||
          voucher.voucherNumber?.toString().includes(searchTerm)
        );
      });

    return vouchers;
  } catch (error) {
    console.error('Error searching vouchers:', error);
    throw error;
  }
};

export const getCompanyDetails = async (companyName: string) => {
  try {
    const companiesRef = collection(db, 'companies');
    const companiesSnapshot = await getDocs(companiesRef);

    const company = companiesSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .find(c => c.name.toLowerCase().includes(companyName.toLowerCase()));

    if (!company) return null;

    const vouchersRef = collection(db, 'vouchers');
    const vouchersQuery = query(
      vouchersRef,
      where('companyName', '==', company.name),
      orderBy('createdAt', 'desc')
    );
    const vouchersSnapshot = await getDocs(vouchersQuery);
    const vouchers = vouchersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      ...company,
      vouchers
    };
  } catch (error) {
    console.error('Error getting company details:', error);
    throw error;
  }
};
