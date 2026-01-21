import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface DataFlySettings {
    endpoint: string;
    token: string;
}

const SETTINGS_COLLECTION = 'system_config';
const SETTINGS_DOC = 'data_fly_settings';

export const saveDataFlySettings = async (settings: DataFlySettings) => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
        await setDoc(docRef, settings, { merge: true });
    } catch (error) {
        console.error('Error saving Data Fly settings:', error);
        throw error;
    }
};

export const getDataFlySettings = async (): Promise<DataFlySettings | null> => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as DataFlySettings;
        }
        return null;
    } catch (error) {
        console.error('Error getting Data Fly settings:', error);
        throw error;
    }
};

export const subscribeToDataFlySettings = (callback: (settings: DataFlySettings) => void) => {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as DataFlySettings);
        }
    });
};
