

"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { FullTripData, PackingListItem, DailyPlan, ActivityItem, TripBase, UserTrips, ActivityType, PreparationItem } from '@/lib/types';
import {
  saveTripForUser as saveTripForUserFirebase,
  loadTripsForUser as loadTripsForUserFirebase,
  createNewTripForUserFirebase as createNewTripForUserFirebaseHook,
  deleteTripForUserFirebase,
  saveActiveTripIdToLS,
  loadActiveTripIdFromLS,
} from '@/lib/firebase-store';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface TripDataContextType {
  allUserTrips: UserTrips | null;
  activeTripId: string | null;
  activeTripData: FullTripData | null;
  isLoading: boolean;
  isOperating: boolean; // Para operaciones de creación/eliminación
  setActiveTrip: (tripId: string | null) => void;
  createAndSetActiveTrip: (tripDetails: TripBase) => Promise<FullTripData | null>;
  updateActiveTripDetails: (updatedBaseDetails: Partial<TripBase>) => Promise<void>;
  deleteActiveTrip: () => Promise<void>;
  deselectActiveTrip: () => void;
  // Packing List
  addPackingItem: (item: Omit<PackingListItem, 'id'>) => void;
  updatePackingItem: (updatedItem: PackingListItem) => void;
  removePackingItem: (itemId: string) => void;
  // Preparation List
  addPreparationItem: (item: Omit<PreparationItem, 'id'>) => void;
  updatePreparationItem: (updatedItem: PreparationItem) => void;
  removePreparationItem: (itemId: string) => void;
  // Daily Plan (Notas y optimización)
  getDailyPlan: (date: string) => DailyPlan | undefined;
  updateDailyPlan: (date: string, updatedPlanData: Partial<Omit<DailyPlan, 'date' >>) => void;
  updateDailyPlanImage: (date: string, dayImageUri: string | null) => Promise<void>; // Nueva función
  // Global Activities (incluye Alojamiento)
  addActivity: (activityData: Omit<ActivityItem, 'id'>) => void;
  updateActivity: (updatedActivity: ActivityItem) => void;
  removeActivity: (activityId: string) => void;
  getActivitiesForDate: (date: string) => ActivityItem[];
  // Summary Image
  updateTripSummaryImage: (imageDataUri: string | null) => Promise<void>;
}

const TripDataContext = createContext<TripDataContextType | undefined>(undefined);

export function TripDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allUserTrips, setAllUserTrips] = useState<UserTrips | null>(null);
  const [activeTripIdState, setActiveTripIdState] = useState<string | null>(null);
  const [_isLoading, _setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);

  const activeTripData = useMemo<FullTripData | null>(() => {
    if (activeTripIdState && allUserTrips && allUserTrips[activeTripIdState]) {
      const trip = allUserTrips[activeTripIdState];
      return {
        ...trip,
        activities: trip.activities || [],
        summaryImageUri: trip.summaryImageUri === "" ? undefined : trip.summaryImageUri,
        itinerary: (trip.itinerary || []).map(dp => ({
          ...dp,
          dayImageUri: dp.dayImageUri === "" ? undefined : dp.dayImageUri,
        })),
        preparations: trip.preparations || [],
      };
    }
    return null;
  }, [activeTripIdState, allUserTrips]);

  const isLoading = _isLoading || authLoading;

  useEffect(() => {
    if (user && !authLoading) {
      _setIsLoading(true);
      loadTripsForUserFirebase(user.uid)
        .then(trips => {
          const cleanedTrips: UserTrips = {};
          if (trips) {
            Object.keys(trips).forEach(tripId => {
              const trip = trips[tripId];
              const cleanedTrip: FullTripData = {
                ...trip,
                activities: trip.activities || (trip as any).accommodationStays || [],
                itinerary: (trip.itinerary || []).map(dp => ({
                  date: dp.date,
                  notes: dp.notes || '',
                  optimizedRoute: dp.optimizedRoute || '',
                  estimatedTimeSavings: dp.estimatedTimeSavings || '',
                  estimatedCostSavings: dp.estimatedCostSavings || '',
                  dayImageUri: dp.dayImageUri === "" ? undefined : dp.dayImageUri,
                })),
                packingList: trip.packingList || [],
                preparations: trip.preparations || [],
                summaryImageUri: trip.summaryImageUri === "" ? undefined : trip.summaryImageUri,
              };
              delete (cleanedTrip as any).accommodationStays;
              cleanedTrips[tripId] = cleanedTrip;
            });
          }
          setAllUserTrips(cleanedTrips);
          const lastActiveId = loadActiveTripIdFromLS(user.uid);
          if (lastActiveId && cleanedTrips && cleanedTrips[lastActiveId]) {
            setActiveTripIdState(lastActiveId);
          } else {
            setActiveTripIdState(null);
          }
        })
        .catch(error => {
          console.error("Error loading user trips:", error);
          toast({ title: "Error", description: "No se pudieron cargar tus viajes.", variant: "destructive" });
          setAllUserTrips(null);
          setActiveTripIdState(null);
        })
        .finally(() => _setIsLoading(false));
    } else if (!user && !authLoading) {
      setAllUserTrips(null);
      setActiveTripIdState(null);
      _setIsLoading(false);
    }
  }, [user, authLoading, toast]);

  const setActiveTrip = useCallback((tripId: string | null) => {
    if (!user) {
        setActiveTripIdState(null);
        return;
    }
    setActiveTripIdState(tripId);
    saveActiveTripIdToLS(user.uid, tripId);
  }, [user]);

  const _performOptimisticUpdateAndSave = useCallback(async (updatedTripDataForSave: FullTripData) => {
    if (!user || !updatedTripDataForSave.id) return;
    const tripIdToUpdate = updatedTripDataForSave.id;

    const tripDataToSave: FullTripData = {
      ...updatedTripDataForSave,
      summaryImageUri: updatedTripDataForSave.summaryImageUri || "",
      packingList: updatedTripDataForSave.packingList || [],
      preparations: updatedTripDataForSave.preparations || [],
      itinerary: (updatedTripDataForSave.itinerary || []).map(plan => ({
        date: plan.date,
        notes: plan.notes || '',
        optimizedRoute: plan.optimizedRoute || '',
        estimatedTimeSavings: plan.estimatedTimeSavings || '',
        estimatedCostSavings: plan.estimatedCostSavings || '',
        dayImageUri: plan.dayImageUri || "",
      })),
      activities: updatedTripDataForSave.activities || [],
    };
    delete (tripDataToSave as any).accommodationStays;

    setAllUserTrips(prev => ({ ...prev, [tripIdToUpdate]: updatedTripDataForSave }));
    try {
      await saveTripForUserFirebase(user.uid, tripIdToUpdate, tripDataToSave);
    } catch (error) {
      console.error("Error saving trip data to Firebase:", error);
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
      if (user) {
        _setIsLoading(true);
        loadTripsForUserFirebase(user.uid).then(trips => {
          setAllUserTrips(trips);
        }).finally(() => _setIsLoading(false));
      }
    }
  }, [user, toast]);

  const createAndSetActiveTrip = useCallback(async (tripDetails: TripBase): Promise<FullTripData | null> => {
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return null;
    }
    setIsOperating(true);
    try {
      const newTrip = await createNewTripForUserFirebaseHook(user.uid, tripDetails);
      newTrip.summaryImageUri = undefined;
      newTrip.itinerary = newTrip.itinerary.map(plan => ({ ...plan, dayImageUri: undefined }));
      setAllUserTrips(prev => ({ ...prev, [newTrip.id]: newTrip }));
      setActiveTripIdState(newTrip.id);
      saveActiveTripIdToLS(user.uid, newTrip.id);
      toast({ title: "¡Viaje Creado!", description: `Viaje a ${newTrip.destination} listo.` });
      return newTrip;
    } catch (error) {
      console.error("Error creating new trip:", error);
      toast({ title: "Error", description: "No se pudo crear el viaje.", variant: "destructive" });
      return null;
    } finally {
      setIsOperating(false);
    }
  }, [user, toast]);

  const updateActiveTripDetails = useCallback(async (updatedBaseDetails: Partial<TripBase>) => {
    if (!activeTripData || !user || !activeTripIdState) return;
    setIsOperating(true);
    let newFullTripDetails = { ...activeTripData, ...updatedBaseDetails };

    if (updatedBaseDetails.startDate || updatedBaseDetails.endDate) {
        const newStartDate = updatedBaseDetails.startDate || activeTripData.startDate;
        const newEndDate = updatedBaseDetails.endDate || activeTripData.endDate;

        const newItineraryShell: DailyPlan[] = [];
        let currentDateIter = parseISO(newStartDate);
        const finalDateIter = parseISO(newEndDate);

        const currentPlansData: Record<string, Partial<Omit<DailyPlan, 'date'>>> = {};
        (activeTripData.itinerary || []).forEach(plan => {
            currentPlansData[plan.date] = {
                notes: plan.notes,
                optimizedRoute: plan.optimizedRoute,
                estimatedTimeSavings: plan.estimatedTimeSavings,
                estimatedCostSavings: plan.estimatedCostSavings,
                dayImageUri: plan.dayImageUri,
            };
        });

        while (currentDateIter <= finalDateIter) {
            const dateStr = format(currentDateIter, 'yyyy-MM-dd');
            newItineraryShell.push({
                date: dateStr,
                notes: currentPlansData[dateStr]?.notes || '',
                optimizedRoute: currentPlansData[dateStr]?.optimizedRoute || '',
                estimatedTimeSavings: currentPlansData[dateStr]?.estimatedTimeSavings || '',
                estimatedCostSavings: currentPlansData[dateStr]?.estimatedCostSavings || '',
                dayImageUri: currentPlansData[dateStr]?.dayImageUri || undefined,
            });
            currentDateIter.setDate(currentDateIter.getDate() + 1);
        }
        newFullTripDetails = { ...newFullTripDetails, startDate: newStartDate, endDate: newEndDate, itinerary: newItineraryShell };
    }

    newFullTripDetails.packingList = activeTripData.packingList || [];
    newFullTripDetails.preparations = activeTripData.preparations || [];
    newFullTripDetails.activities = activeTripData.activities || [];
    newFullTripDetails.summaryImageUri = activeTripData.summaryImageUri;

    await _performOptimisticUpdateAndSave(newFullTripDetails);
    setIsOperating(false);
    toast({ title: "Viaje Actualizado", description: "Detalles del viaje actualizados." });
  }, [activeTripData, user, activeTripIdState, toast, _performOptimisticUpdateAndSave]);

  const deleteActiveTrip = useCallback(async () => {
    if (!user || !activeTripIdState) return;
    const tripToDeleteId = activeTripIdState;
    setIsOperating(true);
    try {
      await deleteTripForUserFirebase(user.uid, tripToDeleteId);
      setAllUserTrips(prev => {
        if (!prev) return null;
        const { [tripToDeleteId]: _, ...rest } = prev;
        return rest;
      });
      setActiveTripIdState(null);
      saveActiveTripIdToLS(user.uid, null);
      toast({ title: "Viaje Eliminado", description: "El viaje ha sido eliminado." });
      router.push('/plan/trips');
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast({ title: "Error", description: "No se pudo eliminar el viaje.", variant: "destructive" });
    } finally {
      setIsOperating(false);
    }
  }, [user, activeTripIdState, toast, router]);

  const deselectActiveTrip = useCallback(() => {
    if (!user) return;
    setActiveTripIdState(null);
    saveActiveTripIdToLS(user.uid, null);
    router.push('/plan/trips');
  }, [user, router]);

  const addPackingItem = useCallback((item: Omit<PackingListItem, 'id'>) => {
    if (!activeTripData) return;
    const capitalizedName = item.name.charAt(0).toUpperCase() + item.name.slice(1);
    const newItem = { ...item, name: capitalizedName, id: `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, packed: false };
    const updatedPackingList = [...(activeTripData.packingList || []), newItem];
    _performOptimisticUpdateAndSave({ ...activeTripData, packingList: updatedPackingList });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const updatePackingItem = useCallback((updatedItem: PackingListItem) => {
    if (!activeTripData) return;
    const capitalizedName = updatedItem.name.charAt(0).toUpperCase() + updatedItem.name.slice(1);
    const finalUpdatedItem = { ...updatedItem, name: capitalizedName };
    const updatedPackingList = (activeTripData.packingList || []).map(item =>
      item.id === finalUpdatedItem.id ? finalUpdatedItem : item
    );
    _performOptimisticUpdateAndSave({ ...activeTripData, packingList: updatedPackingList });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const removePackingItem = useCallback((itemId: string) => {
    if (!activeTripData) return;
    const updatedPackingList = (activeTripData.packingList || []).filter(item => item.id !== itemId);
    _performOptimisticUpdateAndSave({ ...activeTripData, packingList: updatedPackingList });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const addPreparationItem = useCallback((item: Omit<PreparationItem, 'id'>) => {
    if (!activeTripData) return;
    const capitalizedName = item.name.charAt(0).toUpperCase() + item.name.slice(1);
    const newItem = { ...item, name: capitalizedName, id: `prep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, completed: false };
    const updatedPreparations = [...(activeTripData.preparations || []), newItem];
    _performOptimisticUpdateAndSave({ ...activeTripData, preparations: updatedPreparations });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const updatePreparationItem = useCallback((updatedItem: PreparationItem) => {
    if (!activeTripData) return;
    const updatedPreparations = (activeTripData.preparations || []).map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    _performOptimisticUpdateAndSave({ ...activeTripData, preparations: updatedPreparations });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const removePreparationItem = useCallback((itemId: string) => {
    if (!activeTripData) return;
    const updatedPreparations = (activeTripData.preparations || []).filter(item => item.id !== itemId);
    _performOptimisticUpdateAndSave({ ...activeTripData, preparations: updatedPreparations });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const getDailyPlan = useCallback((date: string): DailyPlan | undefined => {
    return (activeTripData?.itinerary || []).find(plan => plan.date === date);
  }, [activeTripData]);

  const updateDailyPlan = useCallback((date: string, updatedPlanData: Partial<Omit<DailyPlan, 'date' >>) => {
    if (!activeTripData) return;
    const updatedItinerary = (activeTripData.itinerary || []).map(plan =>
      plan.date === date ? { ...plan, ...updatedPlanData } : plan
    );
    _performOptimisticUpdateAndSave({ ...activeTripData, itinerary: updatedItinerary });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const updateDailyPlanImage = useCallback(async (date: string, dayImageUri: string | null) => {
    if (!activeTripData || !user || !activeTripIdState) return;
    const updatedItinerary = (activeTripData.itinerary || []).map(plan =>
      plan.date === date ? { ...plan, dayImageUri: dayImageUri === null ? undefined : dayImageUri } : plan
    );
    const updatedTripData = { ...activeTripData, itinerary: updatedItinerary };
    await _performOptimisticUpdateAndSave(updatedTripData);
  }, [activeTripData, user, activeTripIdState, _performOptimisticUpdateAndSave]);

  const addActivity = useCallback((activityData: Omit<ActivityItem, 'id'>) => {
    if (!activeTripData) return;
    const newActivity = { ...activityData, id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    const updatedActivities = [...(activeTripData.activities || []), newActivity];
    _performOptimisticUpdateAndSave({ ...activeTripData, activities: updatedActivities });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const updateActivity = useCallback((updatedActivityItem: ActivityItem) => {
    if (!activeTripData) return;
    const updatedActivities = (activeTripData.activities || []).map(act =>
      act.id === updatedActivityItem.id ? updatedActivityItem : act
    );
    _performOptimisticUpdateAndSave({ ...activeTripData, activities: updatedActivities });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const removeActivity = useCallback((activityId: string) => {
    if (!activeTripData) return;
    const updatedActivities = (activeTripData.activities || []).filter(act => act.id !== activityId);
    _performOptimisticUpdateAndSave({ ...activeTripData, activities: updatedActivities });
  }, [activeTripData, _performOptimisticUpdateAndSave]);

  const getActivitiesForDate = useCallback((date: string): ActivityItem[] => {
    if (!activeTripData || !activeTripData.activities) return [];
    const targetDate = parseISO(date);
    return activeTripData.activities.filter(activity => {
      const activityStartDate = parseISO(activity.startDate);
      const activityEndDate = parseISO(activity.endDate);
      return isWithinInterval(targetDate, { start: activityStartDate, end: activityEndDate });
    });
  }, [activeTripData]);

  const updateTripSummaryImage = useCallback(async (imageDataUri: string | null) => {
    if (!activeTripData || !user || !activeTripIdState) return;
    const updatedTripData = { ...activeTripData, summaryImageUri: imageDataUri === null ? undefined : imageDataUri };
    await _performOptimisticUpdateAndSave(updatedTripData);
  }, [activeTripData, user, activeTripIdState, _performOptimisticUpdateAndSave]);


  const value = {
    allUserTrips,
    activeTripId: activeTripIdState,
    activeTripData,
    isLoading,
    isOperating,
    setActiveTrip,
    createAndSetActiveTrip,
    updateActiveTripDetails,
    deleteActiveTrip,
    deselectActiveTrip,
    addPackingItem,
    updatePackingItem,
    removePackingItem,
    addPreparationItem,
    updatePreparationItem,
    removePreparationItem,
    getDailyPlan,
    updateDailyPlan,
    updateDailyPlanImage,
    addActivity,
    updateActivity,
    removeActivity,
    getActivitiesForDate,
    updateTripSummaryImage,
  };

  return <TripDataContext.Provider value={value}>{children}</TripDataContext.Provider>;
}

export function useTripData(): TripDataContextType {
  const context = useContext(TripDataContext);
  if (context === undefined) {
    throw new Error('useTripData must be used within a TripDataProvider');
  }
  return context;
}
