import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface RewardConfig {
    targetFollowing: number;
    targetMasterResolved: number;
    targetPendingResolved: number;
    pointsValue: number;
}

const SETTINGS_COLLECTION = 'system_config';
const REWARD_DOC = 'reward_settings';

export const saveRewardConfig = async (config: RewardConfig) => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, REWARD_DOC);
        await setDoc(docRef, config, { merge: true });
    } catch (error) {
        console.error('Error saving Reward config:', error);
        throw error;
    }
};

export const getRewardConfig = async (): Promise<RewardConfig | null> => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, REWARD_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as RewardConfig;
        }
        return {
            targetFollowing: 50,
            targetMasterResolved: 50,
            targetPendingResolved: 50,
            pointsValue: 10
        };
    } catch (error) {
        console.error('Error getting Reward config:', error);
        throw error;
    }
};

export const subscribeToRewardConfig = (callback: (config: RewardConfig) => void) => {
    const docRef = doc(db, SETTINGS_COLLECTION, REWARD_DOC);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as RewardConfig);
        } else {
            callback({
                targetFollowing: 50,
                targetMasterResolved: 50,
                targetPendingResolved: 50,
                pointsValue: 10
            });
        }
    });
};
