
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTripData } from "@/hooks/use-trip-data";
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { List, PlusCircle, CheckCircle, Edit3, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManageTripsPage() {
  const { allUserTrips, activeTripId, setActiveTrip, deleteTripForUser, isLoading, isOperating } = useTripData();
  const router = useRouter();

  if (isLoading && !allUserTrips) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex items-center gap-3">
                <List className="h-10 w-10 text-primary" />
                <div>
                  <CardTitle className="text-3xl font-headline text-primary">Mis Viajes</CardTitle>
                  <CardDescription className="text-lg">
                    Cargando tus aventuras...
                  </CardDescription>
                </div>
              </div>
              <Skeleton className="h-10 w-40 mt-4 md:mt-0" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-1" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Skeleton className="h-10 w-full sm:flex-grow" />
                  <Skeleton className="h-10 w-10 sm:w-auto" />
                  <Skeleton className="h-10 w-10 sm:w-auto" />
                </CardFooter>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tripsArray = allUserTrips ? Object.values(allUserTrips).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)) : [];

  const handleSelectTrip = (tripId: string) => {
    setActiveTrip(tripId);
    router.push("/plan/itinerary");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center gap-3">
              <List className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-3xl font-headline text-primary">Mis Viajes</CardTitle>
                <CardDescription className="text-lg">
                  Selecciona un viaje para ver sus detalles o crea uno nuevo.
                </CardDescription>
              </div>
            </div>
            <Link href="/plan/new" passHref>
              <Button className="mt-4 md:mt-0 bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-5 w-5" /> Crear Nuevo Viaje
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {tripsArray.length === 0 ? (
            <div className="text-center py-12">
              <Image 
                src="https://placehold.co/300x200.png" 
                alt="Maleta vacía indicando que no hay viajes creados" 
                width={300} 
                height={200} 
                className="mx-auto mb-6 rounded-lg" 
                data-ai-hint="empty luggage travel" 
              />
              <p className="text-xl text-muted-foreground mb-4">Aún no has creado ningún viaje.</p>
              <p className="text-muted-foreground">¡Empieza tu próxima aventura ahora!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tripsArray.map((trip) => {
                const imageSrc = trip.summaryImageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(trip.destination || "Viaje")}`;
                return (
                  <Card key={trip.id} className={`overflow-hidden transition-all-subtle hover:shadow-2xl ${trip.id === activeTripId ? 'border-2 border-primary ring-2 ring-primary/50' : 'border'}`}>
                    <div className="relative h-40 w-full bg-muted">
                      <Image 
                        src={imageSrc}
                        alt={`Imagen del viaje a ${trip.destination}`}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="travel destination"
                        key={imageSrc} // Forzar re-render si cambia la URI
                      />
                      {trip.id === activeTripId && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center shadow-md">
                          <CheckCircle className="h-4 w-4 mr-1" /> Activo
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl font-headline truncate" title={trip.destination}>{trip.destination}</CardTitle>
                      <CardDescription>
                        {format(parseISO(trip.startDate), "d MMM", { locale: es })} - {format(parseISO(trip.endDate), "d MMM yyyy", { locale: es })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground truncate h-10">{trip.purpose || "Planifica los detalles de tu aventura."}</p>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                      <Button 
                        onClick={() => handleSelectTrip(trip.id)} 
                        className="w-full sm:flex-grow"
                        variant={trip.id === activeTripId ? "secondary" : "default"}
                        disabled={isOperating}
                      >
                        {trip.id === activeTripId ? "Ver Detalles" : "Seleccionar Viaje"}
                      </Button>
                      <Link href={`/plan/new?edit=${trip.id}`}>
                         <Button variant="outline" size="icon" aria-label="Editar viaje" disabled={isOperating} className="w-full sm:w-auto mt-2 sm:mt-0">
                           <Edit3 />
                         </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            aria-label="Eliminar Viaje" 
                            disabled={isOperating || trip.id !== activeTripId} // Solo permite eliminar el viaje activo desde aquí por ahora
                            className="w-full sm:w-auto mt-2 sm:mt-0"
                          >
                            <Trash2 className="text-destructive"/>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar viaje a {trip.destination}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Todos los datos de este viaje serán eliminados.
                              Esta acción solo eliminará el viaje si está actualmente activo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteTripForUser()} // Esto elimina el viaje ACTIVO
                              disabled={isOperating || trip.id !== activeTripId}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Sí, eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
