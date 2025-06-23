

import { database } from './firebase';
import { ref, set, get, push, remove, serverTimestamp } from 'firebase/database';
import type { FullTripData, TripBase, UserTrips, DailyPlan, ActivityItem, Travelers, PreparationItem, ChecklistItem } from './types';
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
        dayImageUri: undefined, 
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

  // Sanitize activities before saving to Firebase
  const sanitizedActivities = (tripData.activities || []).map((act): ActivityItem => ({
    id: act.id,
    type: act.type,
    name: act.name,
    startDate: act.startDate,
    endDate: act.endDate,

    // Optional string fields: undefined -> null
    location: act.location ?? null,
    cityRegion: act.cityRegion ?? null,
    address: act.address ?? null,
    reservationInfo: act.reservationInfo ?? null,
    startTime: act.startTime ?? null,
    endTime: act.endTime ?? null,
    notes: act.notes ?? null,

    // Optional number fields: undefined -> null
    latitude: act.latitude ?? null,
    longitude: act.longitude ?? null,
    budget: act.budget ?? null,

    // Transport specific optional string fields
    originLocation: act.originLocation ?? null,
    originCityRegion: act.originCityRegion ?? null,
    originAddress: act.originAddress ?? null,
    destinationLocation: act.destinationLocation ?? null,
    destinationCityRegion: act.destinationCityRegion ?? null,
    destinationAddress: act.destinationAddress ?? null,

    // Transport specific optional number fields
    originLatitude: act.originLatitude ?? null,
    originLongitude: act.originLongitude ?? null,
    destinationLatitude: act.destinationLatitude ?? null,
    destinationLongitude: act.destinationLongitude ?? null,

    // New specific fields
    mealType: act.mealType ?? null,
    cuisineType: act.cuisineType ?? null,
    dietaryNotes: act.dietaryNotes ?? null,
    activityCategory: act.activityCategory ?? null,
    shoppingCategory: act.shoppingCategory ?? null,
    transportationMode: act.transportationMode ?? null,
    gasolineBudget: act.gasolineBudget ?? null,
    tollsBudget: act.tollsBudget ?? null,
  }));

  const sanitizedPreparations = (tripData.preparations || []).map((prep): PreparationItem => ({
      ...prep,
      notes: prep.notes ?? null,
      dueDate: prep.dueDate ?? null,
      checklist: (prep.checklist || []).map(item => ({...item})) ?? null,
  }));

  const dataToSave: FullTripData & { travelers: Travelers } = {
    ...tripData, // Spread original trip data first
    destination: tripData.destination || "", // Ensure destination is at least an empty string
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    purpose: tripData.purpose || "", // Ensure purpose is at least an empty string
    travelers: {
      men: tripData.travelers?.men || 0,
      women: tripData.travelers?.women || 0,
      children: tripData.travelers?.children || 0,
      seniors: tripData.travelers?.seniors || 0,
    },
    summaryImageUri: tripData.summaryImageUri || "", 
    packingList: tripData.packingList || [],
    preparations: sanitizedPreparations,
    itinerary: (tripData.itinerary || []).map(plan => ({
      date: plan.date,
      notes: plan.notes || '',
      optimizedRoute: plan.optimizedRoute || '',
      estimatedTimeSavings: plan.estimatedTimeSavings || '',
      estimatedCostSavings: plan.estimatedCostSavings || '',
      dayImageUri: plan.dayImageUri || "", 
    })),
    activities: sanitizedActivities, // Use the sanitized activities
  };
  delete (dataToSave as any).accommodationStays; // Keep this cleanup if it was there before

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
      // Clean up potentially null fields from Firebase to undefined for client-side logic if needed
      trip.activities = (trip.activities || (trip as any).accommodationStays || []).map(act => ({
        ...act,
        location: act.location === null ? undefined : act.location,
        cityRegion: act.cityRegion === null ? undefined : act.cityRegion,
        address: act.address === null ? undefined : act.address,
        latitude: act.latitude === null ? undefined : act.latitude,
        longitude: act.longitude === null ? undefined : act.longitude,
        reservationInfo: act.reservationInfo === null ? undefined : act.reservationInfo,
        budget: act.budget === null ? undefined : act.budget,
        startTime: act.startTime === null ? undefined : act.startTime,
        endTime: act.endTime === null ? undefined : act.endTime,
        notes: act.notes === null ? undefined : act.notes,
        originLocation: act.originLocation === null ? undefined : act.originLocation,
        originCityRegion: act.originCityRegion === null ? undefined : act.originCityRegion,
        originAddress: act.originAddress === null ? undefined : act.originAddress,
        originLatitude: act.originLatitude === null ? undefined : act.originLatitude,
        originLongitude: act.originLongitude === null ? undefined : act.originLongitude,
        destinationLocation: act.destinationLocation === null ? undefined : act.destinationLocation,
        destinationCityRegion: act.destinationCityRegion === null ? undefined : act.destinationCityRegion,
        destinationAddress: act.destinationAddress === null ? undefined : act.destinationAddress,
        destinationLatitude: act.destinationLatitude === null ? undefined : act.destinationLatitude,
        destinationLongitude: act.destinationLongitude === null ? undefined : act.destinationLongitude,
        mealType: act.mealType === null ? undefined : act.mealType,
        cuisineType: act.cuisineType === null ? undefined : act.cuisineType,
        dietaryNotes: act.dietaryNotes === null ? undefined : act.dietaryNotes,
        activityCategory: act.activityCategory === null ? undefined : act.activityCategory,
        shoppingCategory: act.shoppingCategory === null ? undefined : act.shoppingCategory,
        transportationMode: act.transportationMode === null ? undefined : act.transportationMode,
        gasolineBudget: act.gasolineBudget === null ? undefined : act.gasolineBudget,
        tollsBudget: act.tollsBudget === null ? undefined : act.tollsBudget,
      }));
      delete (trip as any).accommodationStays;
      trip.itinerary = (trip.itinerary || []).map(dp => ({
          date: dp.date,
          notes: dp.notes || '',
          optimizedRoute: dp.optimizedRoute || '',
          estimatedTimeSavings: dp.estimatedTimeSavings || '',
          estimatedCostSavings: dp.estimatedCostSavings || '',
          dayImageUri: dp.dayImageUri === "" || dp.dayImageUri === null ? undefined : dp.dayImageUri,
      }));
      trip.packingList = trip.packingList || [];
      trip.preparations = (trip.preparations || []).map(prep => ({
          ...prep,
          notes: prep.notes === null ? undefined : prep.notes,
          dueDate: prep.dueDate === null ? undefined : prep.dueDate,
          checklist: prep.checklist === null ? undefined : prep.checklist,
      }));
      trip.summaryImageUri = trip.summaryImageUri === "" || trip.summaryImageUri === null ? undefined : trip.summaryImageUri;
      trip.travelers = trip.travelers || undefined;
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
    preparations: [],
    itinerary: generateItineraryShell(tripDetails.startDate, tripDetails.endDate),
    activities: [],
    summaryImageUri: undefined,
    travelers: tripDetails.travelers || { men: 0, women: 0, children: 0, seniors: 0 },
  };

  // Prepare data for Firebase, ensuring undefined optionals are null or empty strings
  const dataToSetInFirebase = {
    ...newFullTripData,
    destination: newFullTripData.destination || "",
    purpose: newFullTripData.purpose || "",
    travelers: {
      men: newFullTripData.travelers?.men || 0,
      women: newFullTripData.travelers?.women || 0,
      children: newFullTripData.travelers?.children || 0,
      seniors: newFullTripData.travelers?.seniors || 0,
    },
    summaryImageUri: newFullTripData.summaryImageUri || "", 
    preparations: (newFullTripData.preparations || []).map(p => ({...p, notes: p.notes ?? null, dueDate: p.dueDate ?? null, checklist: p.checklist ?? null})),
    itinerary: newFullTripData.itinerary.map(plan => ({ 
        ...plan, 
        notes: plan.notes || '',
        optimizedRoute: plan.optimizedRoute || '',
        estimatedTimeSavings: plan.estimatedTimeSavings || '',
        estimatedCostSavings: plan.estimatedCostSavings || '',
        dayImageUri: plan.dayImageUri || "" 
    })),
    activities: (newFullTripData.activities || []).map(act => ({
        ...act,
        location: act.location ?? null,
        cityRegion: act.cityRegion ?? null,
        address: act.address ?? null,
        latitude: act.latitude ?? null,
        longitude: act.longitude ?? null,
        reservationInfo: act.reservationInfo ?? null,
        budget: act.budget ?? null,
        startTime: act.startTime ?? null,
        endTime: act.endTime ?? null,
        notes: act.notes ?? null,
        originLocation: act.originLocation ?? null,
        originCityRegion: act.originCityRegion ?? null,
        originAddress: act.originAddress ?? null,
        originLatitude: act.originLatitude ?? null,
        originLongitude: act.originLongitude ?? null,
        destinationLocation: act.destinationLocation ?? null,
        destinationCityRegion: act.destinationCityRegion ?? null,
        destinationAddress: act.destinationAddress ?? null,
        destinationLatitude: act.destinationLatitude ?? null,
        destinationLongitude: act.destinationLongitude ?? null,
        mealType: act.mealType ?? null,
        cuisineType: act.cuisineType ?? null,
        dietaryNotes: act.dietaryNotes ?? null,
        activityCategory: act.activityCategory ?? null,
        shoppingCategory: act.shoppingCategory ?? null,
        transportationMode: act.transportationMode ?? null,
        gasolineBudget: act.gasolineBudget ?? null,
        tollsBudget: act.tollsBudget ?? null,
    })),
  };

  await set(newTripRef, dataToSetInFirebase);

  // Return the client-side representation with 'undefined' for truly absent optional fields
  newFullTripData.createdAt = Date.now(); // Firebase serverTimestamp will be set, use client time for optimistic update
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
