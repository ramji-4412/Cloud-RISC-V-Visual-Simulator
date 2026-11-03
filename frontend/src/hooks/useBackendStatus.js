
import {
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';

import { simulationService } from '../services/simulationService.js';

const INITIAL_STATUS = {
  backendAlive: false,
  verilatorConnected: false,
  health: null,
  status: null,
  architecture: null,
  error: null,
  isChecking: true
};

export function useBackendStatus(pollInterval = 4000) {
  const [backend, setBackend] = useState(INITIAL_STATUS);

  const mountedRef = useRef(false);
  const checkingRef = useRef(false);

  const check = useCallback(async () => {
    if (checkingRef.current) return;

    checkingRef.current = true;

    setBackend(previous => ({
      ...previous,
      isChecking: true
    }));

    try {
      const result = await simulationService.checkBackend();

      if (mountedRef.current) {
        setBackend({
          ...result,
          isChecking: false
        });
      }
    } catch (error) {
      if (mountedRef.current) {
        setBackend({
          ...INITIAL_STATUS,
          error: error.message,
          isChecking: false
        });
      }
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    check();

    const intervalId = setInterval(() => {
      check();
    }, pollInterval);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [check, pollInterval]);

  return {
    ...backend,
    refresh: check
  };
}
