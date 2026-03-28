import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './auth-context';

export interface Reading {
  timestamp: number;
  heartRate: number;
  temperature: number;
  hrv: number;
}

export interface Device {
  id: string;
  serialNumber: string;
  batteryLevel: number;
  lastSync: number;
  paired: boolean;
}

interface DeviceContextType {
  device: Device | null;
  readings: Reading[];
  latestReading: Reading | null;
  pairDevice: (serial: string) => Promise<void>;
  unpairDevice: () => Promise<void>;
  isSimulating: boolean;
}

const DeviceContext = createContext<DeviceContextType | null>(null);

function generateReading(): Reading {
  return {
    timestamp: Date.now(),
    heartRate: Math.round(65 + Math.random() * 30 + Math.sin(Date.now() / 10000) * 5),
    temperature: parseFloat((36.3 + Math.random() * 1.2 + (Math.random() > 0.95 ? 2 : 0)).toFixed(1)),
    hrv: Math.round(35 + Math.random() * 40),
  };
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // Load device and readings from Supabase
  useEffect(() => {
    if (!user) {
      setDevice(null);
      setReadings([]);
      setIsSimulating(false);
      return;
    }

    const loadData = async () => {
      // 1. Get paired device
      const { data: deviceData } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deviceData) {
        setDevice({
          id: deviceData.id,
          serialNumber: deviceData.serial_number,
          batteryLevel: deviceData.battery_level || 100,
          lastSync: new Date(deviceData.last_sync || '').getTime(),
          paired: true,
        });

        // 2. Get recent readings
        const { data: readingsData } = await supabase
          .from('readings')
          .select('*')
          .eq('user_id', user.id)
          .eq('device_id', deviceData.id)
          .order('timestamp', { ascending: false })
          .limit(200);

        if (readingsData) {
          const formatted = readingsData.map(r => ({
            timestamp: r.timestamp,
            heartRate: r.heart_rate || 0,
            temperature: r.temperature || 0,
            hrv: r.hrv || 0,
          })).reverse();
          setReadings(formatted);
        }
        setIsSimulating(true);
      }
    };

    loadData();
  }, [user]);

  // Simulation loop
  useEffect(() => {
    if (isSimulating && device && user) {
      intervalRef.current = setInterval(async () => {
        const r = generateReading();
        
        // 1. Update local state
        setReadings(prev => [...prev.slice(-1000), r]);
        setDevice(prev => prev ? {
          ...prev,
          batteryLevel: Math.max(0, prev.batteryLevel - 0.02),
          lastSync: Date.now(),
        } : null);

        // 2. Sync to Supabase (we do this less often or batched in a real app)
        // For this demo, let's just insert
        await supabase.from('readings').insert({
          user_id: user.id,
          device_id: device.id,
          timestamp: r.timestamp,
          heart_rate: r.heartRate,
          temperature: r.temperature,
          hrv: r.hrv,
        });

        // 3. Update device last sync/battery periodically (every 5 readings)
        if (Math.random() > 0.8) {
          await supabase.from('devices').update({
            battery_level: device.batteryLevel - 0.02,
            last_sync: new Date().toISOString(),
          }).eq('id', device.id);
        }
      }, 5000); // 5 seconds interval for DB sanity
      
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [isSimulating, device, user]);

  const pairDevice = useCallback(async (serial: string) => {
    if (!user) {
      console.error('Pairing failed: No authenticated user found.');
      throw new Error('You must be logged in to pair a device.');
    }

    console.log('Inserting device for user:', user.id);
    // 1. Create/Update device in Supabase
    const { data: newDevice, error } = await supabase
      .from('devices')
      .insert({
        user_id: user.id,
        serial_number: serial,
        battery_level: 100,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase device insertion error:', error);
      throw error;
    }

    if (newDevice) {
      console.log('Device paired successfully in DB:', newDevice.id);
      setDevice({
        id: newDevice.id,
        serialNumber: newDevice.serial_number,
        batteryLevel: newDevice.battery_level || 100,
        lastSync: Date.now(),
        paired: true,
      });
      setIsSimulating(true);
    }
  }, [user]);

  const unpairDevice = useCallback(async () => {
    if (!user || !device) return;

    // Soft delete in Supabase
    await supabase
      .from('devices')
      .update({ is_active: false })
      .eq('id', device.id);

    setDevice(null);
    setReadings([]);
    setIsSimulating(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [user, device]);

  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

  return (
    <DeviceContext.Provider value={{ device, readings, latestReading, pairDevice, unpairDevice, isSimulating }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
}
