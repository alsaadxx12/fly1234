import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { LeaveRequest } from '../../pages/Leaves/types';

const LEAVES_COLLECTION = 'leaves';

export const subscribeToLeaves = (callback: (leaves: LeaveRequest[]) => void) => {
    const q = query(collection(db, LEAVES_COLLECTION), orderBy('submittedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const leaves = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            submittedAt: (doc.data().submittedAt as Timestamp).toDate(),
            startDate: doc.data().startDate ? (doc.data().startDate as Timestamp).toDate() : undefined,
            endDate: doc.data().endDate ? (doc.data().endDate as Timestamp).toDate() : undefined,
            date: doc.data().date ? (doc.data().date as Timestamp).toDate() : undefined,
            reviewedAt: doc.data().reviewedAt ? (doc.data().reviewedAt as Timestamp).toDate() : undefined,
        })) as LeaveRequest[];
        callback(leaves);
    });
};

export const submitLeaveRequest = async (request: Omit<LeaveRequest, 'id' | 'status' | 'submittedAt'>) => {
    // Filter out undefined values as Firestore doesn't allow them
    const cleanedRequest = Object.fromEntries(
        Object.entries(request).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, LEAVES_COLLECTION), {
        ...cleanedRequest,
        status: 'pending',
        submittedAt: Timestamp.now(),
    });
    return docRef.id;
};

export const getEmployeeLeaves = async (employeeId: string) => {
    const q = query(
        collection(db, LEAVES_COLLECTION),
        where('employeeId', '==', employeeId),
        orderBy('submittedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: (doc.data().submittedAt as Timestamp).toDate(),
        startDate: doc.data().startDate ? (doc.data().startDate as Timestamp).toDate() : undefined,
        endDate: doc.data().endDate ? (doc.data().endDate as Timestamp).toDate() : undefined,
        date: doc.data().date ? (doc.data().date as Timestamp).toDate() : undefined,
        reviewedAt: doc.data().reviewedAt ? (doc.data().reviewedAt as Timestamp).toDate() : undefined,
    })) as LeaveRequest[];
};

export const getAllLeaves = async () => {
    const q = query(collection(db, LEAVES_COLLECTION), orderBy('submittedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: (doc.data().submittedAt as Timestamp).toDate(),
        startDate: doc.data().startDate ? (doc.data().startDate as Timestamp).toDate() : undefined,
        endDate: doc.data().endDate ? (doc.data().endDate as Timestamp).toDate() : undefined,
        date: doc.data().date ? (doc.data().date as Timestamp).toDate() : undefined,
        reviewedAt: doc.data().reviewedAt ? (doc.data().reviewedAt as Timestamp).toDate() : undefined,
    })) as LeaveRequest[];
};

export const updateLeaveStatus = async (
    leaveId: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
    reviewerName: string,
    rejectionReason?: string
) => {
    const leaveRef = doc(db, LEAVES_COLLECTION, leaveId);
    await updateDoc(leaveRef, {
        status,
        reviewedAt: Timestamp.now(),
        reviewedBy: reviewerId,
        reviewedByName: reviewerName,
        rejectionReason: rejectionReason || null
    });
};
