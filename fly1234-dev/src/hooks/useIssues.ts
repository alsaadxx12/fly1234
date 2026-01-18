import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Issue, IssuePriority } from '../pages/PendingIssues/types';

export default function useIssues(type: 'pending' | 'mastercard' = 'pending') {
  const { employee } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const collectionName = type === 'mastercard' ? 'mastercard_issues' : 'issues';

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          issueDate: data.issueDate?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate(),
        } as Issue;
      });
      setIssues(issuesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const addIssue = useCallback(async (newIssue: { 
    pnr: string[]; 
    title: string; 
    description?: string; 
    issueDate: Date; 
    priority: IssuePriority;
    companyId?: string;
    companyName?: string;
    phone?: string;
  }) => {
    if (!employee) return;
    try {
      await addDoc(collection(db, collectionName), {
        ...newIssue,
        status: 'pending',
        createdBy: employee.id,
        createdByName: employee.name,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding issue: ", error);
    }
  }, [employee, collectionName]);

  const updateIssue = useCallback(async (issueId: string, updates: Partial<Omit<Issue, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>>) => {
    if (!employee) return;
    const issueRef = doc(db, collectionName, issueId);
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
  }, [employee, collectionName]);

  const deleteIssue = useCallback(async (issueId: string) => {
    const issueRef = doc(db, collectionName, issueId);
    try {
      await deleteDoc(issueRef);
    } catch (error) {
      console.error("Error deleting issue: ", error);
    }
  }, [collectionName]);


  const updateIssueStatus = useCallback(async (issueId: string, status: 'pending' | 'in_progress' | 'resolved') => {
    const issueRef = doc(db, collectionName, issueId);
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
  }, [employee, collectionName]);

  const assignIssue = useCallback(async (issueId: string) => {
    if (!employee) return;
    const issueRef = doc(db, collectionName, issueId);
    try {
      await updateDoc(issueRef, {
        assignedTo: employee.id,
        assignedToName: employee.name,
        status: 'in_progress'
      });
    } catch (error) {
      console.error("Error assigning issue: ", error);
    }
  }, [employee, collectionName]);

  return { issues, addIssue, updateIssue, deleteIssue, updateIssueStatus, assignIssue, loading };
}

    