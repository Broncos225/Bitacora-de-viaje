
import { database } from './firebase';
import { ref, set, get, push, remove, serverTimestamp } from 'firebase/database';
import type { FullTripData, TripBase, UserTrips, DailyPlan, ActivityItem } from './types';
import { format, parseISO } from 'date-fns';

const USER_DATA_ROOT = 'users';
const TRIPS_COLLECTION_NAME = 'tripPlanners';

function generateItineraryShell(startDateStr: string, endDateStr: string): DailyPlan[] {
  if (!startDateStr || !endDateStr) return [];
  const itinerary: DailyPlan[] = [];
  try {
    let currentDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);

    if (isNaN(currentDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("Invalid date format for itinerary shell generation");
      return [];
    }

    while (currentDate <= endDate) {
      itinerary.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        notes: '',
        optimizedRoute: '',
        estimatedTimeSavings: '',
        estimatedCostSavings: '',
        dayImageUri: undefined, // Inicializar nuevo campo
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } catch (error) {
    console.error("Error generating itinerary shell:", error);
    return [];
  }
  return itinerary;
};

export async function saveTripForUser(userId: string, tripId: string, tripData: FullTripData): Promise<void> {
  if (!userId || !tripId) throw new Error("User ID and Trip ID are required to save trip data.");
  const tripRef = ref(database, `${USER_DATA_ROOT}/${userId}/${TRIPS_COLLECTION_NAME}/${tripId}`);

  const dataToSave: FullTripData = {
    ...tripData,
    summaryImageUri: tripData.summaryImageUri || "",
    packingList: tripData.packingList || [],
    itinerary: (tripData.itinerary || []).map(plan => ({
      date: plan.date,
      notes: plan.notes || '',
      optimizedRoute: plan.optimizedRoute || '',
      estimatedTimeSavings: plan.estimatedTimeSavings || '',
      estimatedCostSavings: plan.estimatedCostSavings || '',
      dayImageUri: plan.dayImageUri || "", // Guardar string vacío si es null/undefined
    })),
    activities: tripData.activities || [],
  };
  delete (dataToSave as any).accommodationStays;
  await set(tripRef, dataToSave);
}

export async function loadTripsForUser(userId: string): Promise<UserTrips | null> {
  if (!userId) throw new Error("User ID is required to load trips.");
  const userTripsRef = ref(database, `${USER_DATA_ROOT}/${userId}/${TRIPS_COLLECTION_NAME}`);
  const snapshot = await get(userTripsRef);
  if (snapshot.exists()) {
    const trips = snapshot.val() as UserTrips;
    Object.keys(trips).forEach(tripId => {
      const trip = trips[tripId];
      trip.activities = trip.activities || (trip as any).accommodationStays || [];
      delete (trip as any).accommodationStays;
      trip.itinerary = (trip.itinerary || []).map(dp => ({
          date: dp.date,
          notes: dp.notes || '',
          optimizedRoute: dp.optimizedRoute || '',
          estimatedTimeSavings: dp.estimatedTimeSavings || '',
          estimatedCostSavings: dp.estimatedCostSavings || '',
          dayImageUri: dp.dayImageUri === "" ? undefined : dp.dayImageUri, // Convertir "" a undefined
      }));
      trip.packingList = trip.packingList || [];
      trip.summaryImageUri = trip.summaryImageUri === "" ? undefined : trip.summaryImageUri;
    });
    return trips;
  }
  return null;
}

export async function createNewTripForUserFirebase(userId: string, tripDetails: TripBase): Promise<FullTripData> {
  if (!userId) throw new Error("User ID is required to create a new trip.");

  const userTripsCollectionRef = ref(database, `${USER_DATA_ROOT}/${userId}/${TRIPS_COLLECTION_NAME}`);
  const newTripRef = push(userTripsCollectionRef);
  const tripId = newTripRef.key;

  if (!tripId) throw new Error("Failed to generate a new trip ID from Firebase.");

  const newFullTripData: FullTripData = {
    ...tripDetails,
    id: tripId,
    userId: userId,
    createdAt: serverTimestamp() as unknown as number,
    packingList: [],
    itinerary: generateItineraryShell(tripDetails.startDate, tripDetails.endDate),
    activities: [],
    summaryImageUri: undefined,
  };

  await set(newTripRef, {
    ...newFullTripData,
    summaryImageUri: "", 
    itinerary: newFullTripData.itinerary.map(plan => ({ ...plan, dayImageUri: "" })), // Guardar dayImageUri como string vacío
  });

  newFullTripData.createdAt = Date.now();

  return newFullTripData;
}

export async function deleteTripForUserFirebase(userId: string, tripId: string): Promise<void> {
  if (!userId || !tripId) throw new Error("User ID and Trip ID are required to delete trip data.");
  const tripRef = ref(database, `${USER_DATA_ROOT}/${userId}/${TRIPS_COLLECTION_NAME}/${tripId}`);
  await remove(tripRef);
}

const ACTIVE_TRIP_ID_KEY_PREFIX = 'activeTripId_';

export function saveActiveTripIdToLS(userId: string, tripId: string | null): void {
  if (typeof window !== 'undefined' && userId) {
    if (tripId === null) {
      localStorage.removeItem(ACTIVE_TRIP_ID_KEY_PREFIX + userId);
    } else {
      localStorage.setItem(ACTIVE_TRIP_ID_KEY_PREFIX + userId, tripId);
    }
  }
}

export function loadActiveTripIdFromLS(userId: string): string | null {
  if (typeof window !== 'undefined' && userId) {
    return localStorage.getItem(ACTIVE_TRIP_ID_KEY_PREFIX + userId);
  }
  return null;
}
