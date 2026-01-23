import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface BuyersSettings {
    endpoint: string;
    token: string;
}

const SETTINGS_COLLECTION = 'system_config';
const SETTINGS_DOC = 'buyers_accounts_settings';

export const saveBuyersSettings = async (settings: BuyersSettings) => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
        await setDoc(docRef, settings, { merge: true });
    } catch (error) {
        console.error('Error saving Buyers Accounts settings:', error);
        throw error;
    }
};

export const getBuyersSettings = async (): Promise<BuyersSettings | null> => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as BuyersSettings;
        }
        return null;
    } catch (error) {
        console.error('Error getting Buyers Accounts settings:', error);
        throw error;
    }
};

export const subscribeToBuyersSettings = (callback: (settings: BuyersSettings) => void) => {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as BuyersSettings);
        }
    });
};
