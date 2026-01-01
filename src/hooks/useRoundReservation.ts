import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ReservationResult {
  success: boolean;
  reservationCount: number;
  isOpen: boolean;
  minimumReservations: number;
}

export function useRoundReservation() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const reserveSlot = useCallback(async (roundId: string): Promise<ReservationResult | null> => {
    if (!user) {
      toast.error('Please sign in to reserve a slot');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reserve-round-slot', {
        body: { round_id: roundId },
      });

      if (error) {
        console.error('Reservation error:', error);
        toast.error('Failed to reserve slot');
        return null;
      }

      if (data.already_reserved) {
        toast.info('You already have a reservation for this round');
      }

      return {
        success: true,
        reservationCount: data.reservation_count || 0,
        isOpen: data.is_open || false,
        minimumReservations: data.minimum_reservations || 30,
      };
    } catch (error) {
      console.error('Reservation error:', error);
      toast.error('Failed to reserve slot');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkReservation = useCallback(async (roundId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data } = await supabase.functions.invoke('check-reservation', {
        body: { round_id: roundId },
      });
      return !!data?.has_reservation;
    } catch {
      return false;
    }
  }, [user]);

  const getReservationCount = useCallback(async (roundId: string): Promise<{ count: number; pickCount: number; isOpen: boolean; minimumReservations: number }> => {
    try {
      const { data } = await supabase.functions.invoke('get-reservation-count', {
        body: { round_id: roundId },
      });
      return {
        count: data?.count || 0,
        pickCount: data?.pick_count || 0,
        isOpen: data?.is_open || false,
        minimumReservations: data?.minimum_reservations || 30,
      };
    } catch {
      return { count: 0, pickCount: 0, isOpen: false, minimumReservations: 30 };
    }
  }, []);

  return {
    reserveSlot,
    checkReservation,
    getReservationCount,
    loading,
  };
}
