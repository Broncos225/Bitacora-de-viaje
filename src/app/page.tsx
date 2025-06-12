
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTripData } from '@/hooks/use-trip-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function RootPageRedirect() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { activeTripId, allUserTrips, isLoading: tripDataLoading } = useTripData();

  useEffect(() => {
    if (authLoading || (user && tripDataLoading)) {
      // Still loading auth or user's trip data, wait.
      return;
    }

    if (!user) {
      // Not authenticated, redirect to login.
      router.replace('/auth');
    } else {
      // Authenticated
      if (activeTripId) {
        // Active trip exists, go to its itinerary.
        router.replace('/plan/itinerary');
      } else if (allUserTrips && Object.keys(allUserTrips).length > 0) {
        // No active trip, but other trips exist, go to trip selection.
        router.replace('/plan/trips');
      } else {
        // No active trip and no trips at all, go to create new trip.
        router.replace('/plan/new');
      }
    }
  }, [user, authLoading, activeTripId, allUserTrips, tripDataLoading, router]);

  // Show a loading state while determining where to redirect.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Skeleton className="w-32 h-32 rounded-full mb-6" />
      <Skeleton className="h-8 w-64 mb-4" />
      <Skeleton className="h-6 w-48" />
      <p className="mt-8 text-sm text-muted-foreground">Cargando tu bitácora...</p>
    </div>
  );
}
