import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Branch } from '../../pages/Branches/types';

const BRANCHES_COLLECTION = 'branches';

export const addBranch = async (branchData: Omit<Branch, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, BRANCHES_COLLECTION), {
      ...branchData,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding branch:', error);
    throw new Error('Failed to add branch');
  }
};

export const getBranches = async (): Promise<Branch[]> => {
  try {
    const q = query(collection(db, BRANCHES_COLLECTION), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Branch));
  } catch (error) {
    console.error('Error getting branches:', error);
    throw new Error('Failed to get branches');
  }
};

export const updateBranch = async (branchId: string, updates: Partial<Omit<Branch, 'id'>>): Promise<void> => {
  try {
    const branchRef = doc(db, BRANCHES_COLLECTION, branchId);
    await updateDoc(branchRef, updates);
  } catch (error) {
    console.error('Error updating branch:', error);
    throw new Error('Failed to update branch');
  }
};

export const deleteBranch = async (branchId: string): Promise<void> => {
  try {
    const branchRef = doc(db, BRANCHES_COLLECTION, branchId);
    await deleteDoc(branchRef);
  } catch (error) {
    console.error('Error deleting branch:', error);
    throw new Error('Failed to delete branch');
  }
};
