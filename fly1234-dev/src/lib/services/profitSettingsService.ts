import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ProfitSettings {
  employeeProfitPercentage: number;
  companyProfitPercentage: number;
  updatedAt: Date;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: ProfitSettings = {
  employeeProfitPercentage: 10,
  companyProfitPercentage: 90,
  updatedAt: new Date()
};

export const getProfitSettings = async (): Promise<ProfitSettings> => {
  try {
    const docRef = doc(db, 'settings', 'profitSettings');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        employeeProfitPercentage: data.employeeProfitPercentage || 10,
        companyProfitPercentage: data.companyProfitPercentage || 90,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy
      };
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting profit settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveProfitSettings = async (
  settings: Omit<ProfitSettings, 'updatedAt'>,
  userId?: string
): Promise<boolean> => {
  try {
    const docRef = doc(db, 'settings', 'profitSettings');

    await setDoc(docRef, {
      employeeProfitPercentage: settings.employeeProfitPercentage,
      companyProfitPercentage: settings.companyProfitPercentage,
      updatedAt: new Date(),
      updatedBy: userId
    });

    return true;
  } catch (error) {
    console.error('Error saving profit settings:', error);
    return false;
  }
};

export const calculateEmployeeProfit = (totalProfit: number, percentage: number): number => {
  return (totalProfit * percentage) / 100;
};

export const calculateCompanyProfit = (totalProfit: number, percentage: number): number => {
  return (totalProfit * percentage) / 100;
};
