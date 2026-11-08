import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

export function useLiveAllocations() {
  const [fleet, setFleet] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [verification, setVerification] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [status, setStatus] = useState('DISCONNECTED'); // DISCONNECTED | CONNECTING | CONNECTED | PAUSED | COMPLETED
  const [speed, setSpeed] = useState(1.5); // interval in seconds
  const [runningTotals, setRunningTotals] = useState({
    served: 0,
    unserved: 0,
    total_processed: 0,
    remaining: 0,
    avg_soh_allocated: 0,
    avg_suitability_score: 0,
    pct_high_critical_served: 0,
    critical_served: 0,
    critical_total: 0,
    high_served: 0,
    high_total: 0,
    normal_served: 0,
    normal_total: 0,
    batteries_allocated: 0,
  });

  const wsRef = useRef(null);

  // Fetch initial REST data
  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/fleet`);
      if (res.ok) {
        const data = await res.json();
        setFleet(data);
      }
    } catch (err) {
      console.error('Failed to fetch fleet data:', err);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles`);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to fetch vehicle data:', err);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch metrics data:', err);
    }
  }, []);

  const fetchVerification = useCallback(async (index = null) => {
    try {
      const query = index !== null ? `?index=${index}` : '';
      const res = await fetch(`${API_BASE_URL}/verification${query}`);
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
      }
    } catch (err) {
      console.error('Failed to fetch verification data:', err);
    }
  }, []);

  const fetchAllRestData = useCallback(async () => {
    await Promise.all([fetchFleet(), fetchVehicles(), fetchMetrics(), fetchVerification()]);
  }, [fetchFleet, fetchVehicles, fetchMetrics, fetchVerification]);

  // Initial load
  useEffect(() => {
    fetchAllRestData();
  }, [fetchAllRestData]);

  // Start / Connect Simulation WS
  const connectSimulation = useCallback((intervalSec = speed) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus('CONNECTING');
    const ws = new WebSocket(`${WS_BASE_URL}/simulate?interval=${intervalSec}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('CONNECTED');
    };

    ws.onmessage = (messageEvent) => {
      try {
        const data = JSON.parse(messageEvent.data);
        
        if (data.type === 'allocation' || data.event === 'allocation') {
          setCurrentEvent(data);
          setEvents((prev) => [data, ...prev]);

          if (data.running_totals) {
            setRunningTotals(data.running_totals);
            // Fetch dynamically updated verification state from backend
            fetchVerification(data.index + 1);
          }
        } else if (data.type === 'complete' || data.event === 'done') {
          setStatus('COMPLETED');
          if (data.final_metrics) {
            setMetrics(data.final_metrics);
          }
          // Refresh REST verification to confirm final state
          fetchVerification();
        }
      } catch (err) {
        console.error('Error parsing WS event:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setStatus('DISCONNECTED');
    };

    ws.onclose = () => {
      setStatus((prev) => (prev === 'COMPLETED' ? 'COMPLETED' : 'DISCONNECTED'));
    };
  }, [speed, fetchVerification]);

  const disconnectSimulation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('PAUSED');
  }, []);

  const resetSimulation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setEvents([]);
    setCurrentEvent(null);
    setStatus('DISCONNECTED');
    setRunningTotals({
      served: 0,
      unserved: 0,
      total_processed: 0,
      remaining: vehicles.length,
      avg_soh_allocated: 0,
      avg_suitability_score: 0,
      pct_high_critical_served: 0,
      critical_served: 0,
      critical_total: 0,
      high_served: 0,
      high_total: 0,
      normal_served: 0,
      normal_total: 0,
      batteries_allocated: 0,
    });
    fetchAllRestData();
  }, [fetchAllRestData, vehicles.length]);

  // Keep remaining totals updated on initial vehicle loading
  useEffect(() => {
    setRunningTotals(prev => ({
      ...prev,
      remaining: vehicles.length - prev.total_processed,
    }));
  }, [vehicles.length]);

  // upload dataset helper
  const uploadDataset = useCallback(async (batteryFile, vehicleFile) => {
    try {
      const formData = new FormData();
      if (batteryFile) formData.append('battery_file', batteryFile);
      if (vehicleFile) formData.append('vehicle_file', vehicleFile);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        // Reset the simulation completely for the new data
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        setEvents([]);
        setCurrentEvent(null);
        setStatus('DISCONNECTED');
        setRunningTotals({
          served: 0,
          unserved: 0,
          total_processed: 0,
          remaining: result.vehicles,
          avg_soh_allocated: 0,
          avg_suitability_score: 0,
          pct_high_critical_served: 0,
          critical_served: 0,
          critical_total: 0,
          high_served: 0,
          high_total: 0,
          normal_served: 0,
          normal_total: 0,
          batteries_allocated: 0,
        });
        await fetchAllRestData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to upload dataset:', err);
      return false;
    }
  }, [fetchAllRestData]);

  // reset dataset helper
  const resetDataset = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/reset`, {
        method: 'POST',
      });
      if (res.ok) {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        setEvents([]);
        setCurrentEvent(null);
        setStatus('DISCONNECTED');
        await fetchAllRestData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to reset dataset:', err);
      return false;
    }
  }, [fetchAllRestData]);

  // export snapshot helper
  const exportSnapshot = useCallback(() => {
    window.location.href = `${API_BASE_URL}/export`;
  }, []);

  const changeSpeed = useCallback((newSpeed) => {
    setSpeed(newSpeed);
    if (status === 'CONNECTED') {
      connectSimulation(newSpeed);
    }
  }, [status, connectSimulation]);

  return {
    fleet,
    vehicles,
    metrics,
    verification,
    events,
    currentEvent,
    status,
    speed,
    runningTotals,
    uploadDataset,
    resetDataset,
    exportSnapshot,
    connectSimulation,
    disconnectSimulation,
    resetSimulation,
    changeSpeed,
    refetchRestData: fetchAllRestData,
  };
}
