
"use client";

import { TripInitializationForm } from "@/components/forms/TripInitializationForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaneTakeoff, PencilLine } from "lucide-react";
import { useTripData } from "@/hooks/use-trip-data";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from "react";
import type { FullTripData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewOrEditTripPage() {
  const searchParams = useSearchParams();
  const editTripId = searchParams.get('edit'); // Check if 'edit' query param exists (value is tripId)
  
  const { allUserTrips, isLoading: isTripDataLoading } = useTripData();
  const [initialDataForEdit, setInitialDataForEdit] = useState<FullTripData | null | undefined>(undefined); // undefined means loading/not sure, null means no data for edit

  useEffect(() => {
    if (editTripId && allUserTrips) {
      setInitialDataForEdit(allUserTrips[editTripId] || null);
    } else if (!editTripId) {
      setInitialDataForEdit(null); // Explicitly set to null for new trip mode
    }
    // If editTripId is present but allUserTrips is not yet loaded, initialDataForEdit remains undefined
  }, [editTripId, allUserTrips]);

  const isEditMode = !!editTripId;

  // Show skeleton or loading if we're in edit mode but data isn't ready
  if (isEditMode && initialDataForEdit === undefined && isTripDataLoading) {
    return (
       <div className="max-w-2xl mx-auto animate-fadeIn">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Skeleton className="w-16 h-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-8">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If in edit mode, but the trip ID from query param was not found in user's trips
  if (isEditMode && initialDataForEdit === null && !isTripDataLoading) {
     return (
        <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-destructive">Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>No se encontró el viaje que intentas editar, o no tienes permiso para acceder a él.</p>
                </CardContent>
            </Card>
        </div>
        );
  }


  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isEditMode ? <PencilLine className="w-16 h-16 text-primary" /> : <PlaneTakeoff className="w-16 h-16 text-primary" />}
          </div>
          <CardTitle className="text-3xl font-headline">
            {isEditMode ? "Modificar Detalles del Viaje" : "Comienza tu Aventura"}
          </CardTitle>
          <CardDescription className="text-lg">
            {isEditMode 
              ? "Actualiza la información de tu viaje." 
              : "Ingresa los detalles de tu próximo viaje para empezar a planificar."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TripInitializationForm initialData={isEditMode ? initialDataForEdit : null} />
        </CardContent>
      </Card>
    </div>
  );
}
