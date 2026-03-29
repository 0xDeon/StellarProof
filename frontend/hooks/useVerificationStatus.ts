import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOracleStatus, VerificationStatus } from '../services/oracleService';
import toast from 'react-hot-toast'; 

interface UseVerificationStatusOptions {
  requestId: string;
  intervalMs?: number;
}

export const useVerificationStatus = ({ 
  requestId, 
  intervalMs = 5000 
}: UseVerificationStatusOptions) => {
  
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const startTimeRef = useRef(Date.now());
  const previousStatusRef = useRef<VerificationStatus | null>(null);
  
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const query = useQuery({
    queryKey: ['verificationStatus', requestId],
    queryFn: () => fetchOracleStatus(requestId),
    retry: 3, 
    refetchInterval: (query) => {
      if (hasTimedOut) return false;
      
      const status = query.state?.data;
      if (status === 'Verified' || status === 'Rejected') {
        return false;
      }
      return intervalMs;
    },
  });

  const currentStatus = query.data;

  useEffect(() => {
    if (currentStatus && previousStatusRef.current !== currentStatus) {
      // Don't toast on the very first load if it's just 'Pending'
      if (previousStatusRef.current !== null) {
        toast.success(`Status updated to: ${currentStatus}`);
      }
      previousStatusRef.current = currentStatus;
    }
  }, [currentStatus]);

  useEffect(() => {
    if (hasTimedOut || currentStatus === 'Verified' || currentStatus === 'Rejected') {
      return;
    }

    const timeoutInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= TEN_MINUTES_MS) {
        setHasTimedOut(true);
        toast.error('Verification timed out after 10 minutes.');
      }
    }, 1000); 
    return () => clearInterval(timeoutInterval);
  }, [hasTimedOut, currentStatus]);

  return {
    status: hasTimedOut ? 'Timeout' : (currentStatus || 'Pending'),
    isLoading: query.isLoading,
    error: query.error,
    lastChecked: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
};