import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { MastercardIssue, IssuePriority } from '../types';

export default function useMastercardIssues() {
  const { employee } = useAuth();
  const [issues, setIssues] = useState<MastercardIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'mastercard_issues'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          issueDate: data.issueDate?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate(),
          // Ensure transactionImageURLs is always an array
          transactionImageURLs: Array.isArray(data.transactionImageURLs) ? data.transactionImageURLs : (data.transactionImageURL ? [data.transactionImageURL] : []),
        } as MastercardIssue;
      });
      setIssues(issuesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addIssue = useCallback(async (newIssue: Omit<MastercardIssue, 'id' | 'status' | 'createdAt' | 'createdBy' | 'createdByName'>) => {
    if (!employee) return;
    try {
      await addDoc(collection(db, 'mastercard_issues'), {
        ...newIssue,
        status: 'pending',
        createdBy: employee.id,
        createdByName: employee.name,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding issue: ", error);
    }
  }, [employee]);

  const updateIssue = useCallback(async (issueId: string, updates: Partial<Omit<MastercardIssue, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>>) => {
    if (!employee) return;
    const issueRef = doc(db, 'mastercard_issues', issueId);
    try {
      await updateDoc(issueRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: employee.id,
        updatedByName: employee.name,
      });
    } catch (error) {
      console.error("Error updating issue: ", error);
    }
  }, [employee]);

  const deleteIssue = useCallback(async (issueId: string) => {
    const issueRef = doc(db, 'mastercard_issues', issueId);
    try {
      await deleteDoc(issueRef);
    } catch (error) {
      console.error("Error deleting issue: ", error);
    }
  }, []);


  const updateIssueStatus = useCallback(async (issueId: string, status: 'pending' | 'in_progress' | 'resolved') => {
    const issueRef = doc(db, 'mastercard_issues', issueId);
    try {
      const updateData: any = { status };
      if (status === 'resolved') {
        updateData.resolvedAt = serverTimestamp();
        updateData.resolvedBy = employee?.id;
        updateData.resolvedByName = employee?.name;
      }
      await updateDoc(issueRef, updateData);
    } catch (error) {
      console.error("Error updating issue status: ", error);
    }
  }, [employee]);

  const assignIssue = useCallback(async (issueId: string) => {
    if (!employee) return;
    const issueRef = doc(db, 'mastercard_issues', issueId);
    try {
      await updateDoc(issueRef, {
        assignedTo: employee.id,
        assignedToName: employee.name,
        status: 'in_progress'
      });
    } catch (error) {
      console.error("Error assigning issue: ", error);
    }
  }, [employee]);

  return { issues, addIssue, updateIssue, deleteIssue, updateIssueStatus, assignIssue, loading };
}
