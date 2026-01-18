import { useState, useEffect, useCallback } from 'react';
import { getBranches, addBranch, updateBranch, deleteBranch } from '../../../lib/collections/branches';
import { Branch } from '../types';

export default function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      setError('فشل في تحميل الفروع');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleAddBranch = useCallback(async (newBranch: Omit<Branch, 'id' | 'createdAt'>) => {
    await addBranch(newBranch);
    await loadBranches();
  }, [loadBranches]);

  const handleUpdateBranch = useCallback(async (branchId: string, updates: Partial<Omit<Branch, 'id'>>) => {
    await updateBranch(branchId, updates);
    await loadBranches();
  }, [loadBranches]);

  const handleDeleteBranch = useCallback(async (branchId: string) => {
    await deleteBranch(branchId);
    await loadBranches();
  }, [loadBranches]);

  return {
    branches,
    loading,
    error,
    addBranch: handleAddBranch,
    updateBranch: handleUpdateBranch,
    deleteBranch: handleDeleteBranch,
    refreshBranches: loadBranches
  };
}
