
"use client";

import Link from "next/link";
import { useTripData } from "@/hooks/use-trip-data";
import type { DailyPlan, ActivityItem, ActivityType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActivityForm } from "@/components/forms/ActivityForm";
import { CalendarDays, ArrowRight, Edit3, Plane, PlusCircle, CalendarRange, LayoutList, GanttChartSquare, Upload, ImageOff, MoreVertical, Map } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { TripTimelineView } from "@/components/planning/TripTimelineView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from 'next/dynamic';

const ActivityMapComponent = dynamic(() => import('@/components/planning/ActivityMap').then(mod => mod.ActivityMap), {
  ssr: false,
  loading: () => <p className="text-center py-4 text-muted-foreground">Cargando mapa general del viaje...</p>,
});


const activityTypes: ActivityType[] = ['Actividad', 'Comida', 'Compras', 'Transporte', 'Alojamiento'];

interface DayCardProps {
  dailyPlan: DailyPlan;
  dayNumber: number;
  tripId: string;
  onUpdateDayImage: (date: string, imageUri: string | null) => void;
}

function DayCard({ dailyPlan, dayNumber, tripId, onUpdateDayImage }: DayCardProps) {
    const dayDate = parseISO(dailyPlan.date);
    const dayNumDisplay = `Día ${dayNumber}`;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const handleUploadButtonClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size > 1 * 1024 * 1024) { 
            toast({ title: "Archivo Demasiado Grande", description: "Por favor, elige una imagen de menos de 1MB.", variant: "destructive"});
            return;
        }
        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUri = reader.result as string;
          await onUpdateDayImage(dailyPlan.date, dataUri);
          setIsUploading(false);
          toast({title: "Imagen del Día Actualizada", description: `Se cambió la imagen para el ${dayNumDisplay}.`})
        };
        reader.onerror = () => {
            setIsUploading(false);
            toast({ title: "Error de Archivo", description: "No se pudo leer el archivo de imagen.", variant: "destructive"});
        }
        reader.readAsDataURL(file);
      }
      if (event.target) {
          event.target.value = "";
      }
    };

    const handleRemoveImage = async () => {
        await onUpdateDayImage(dailyPlan.date, null);
        toast({title: "Imagen del Día Eliminada", description: `Se eliminó la imagen personalizada para el ${dayNumDisplay}.`})
    };
    
    const imageSrc = dailyPlan.dayImageUri || `https://placehold.co/400x300.png?text=${encodeURIComponent(dayNumDisplay)}`;

    return (
      <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
        <div className="relative h-36 md:h-40 group">
          <Image
            src={imageSrc}
            alt={`Plan del ${dayNumDisplay}`}
            width={400}
            height={300}
            className="object-cover w-full h-full"
            data-ai-hint="itinerary daily plan"
            key={imageSrc} 
          />
           <div className="absolute top-1 right-1">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/70 hover:bg-background/90 text-foreground rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleUploadButtonClick} disabled={isUploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? "Subiendo..." : "Cambiar Imagen"}
                </DropdownMenuItem>
                {dailyPlan.dayImageUri && (
                  <DropdownMenuItem onClick={handleRemoveImage} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <ImageOff className="mr-2 h-4 w-4" />
                    Quitar Imagen
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-grow justify-between">
          <div>
            <h3 className="text-lg font-semibold font-headline text-primary">
              {dayNumDisplay}: {format(dayDate, "EEEE", { locale: es })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {format(dayDate, "MMMM yyyy", { locale: es })}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Ver detalles para actividades.
            </p>
            {dailyPlan.notes && <p className="text-xs mt-2 italic text-muted-foreground line-clamp-2">Notas: {dailyPlan.notes}</p>}
          </div>
          <div className="mt-3">
            <Link href={`/plan/itinerary/${dailyPlan.date}`}>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-xs py-1.5">
                Ver/Editar Día <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
}

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`} />
);


export default function ItineraryPage() {
  const { activeTripData, isLoading, addActivity, updateActivity, updateDailyPlanImage } = useTripData();
  const router = useRouter();
  const { toast } = useToast();

  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  const activitiesForMap = useMemo(() => {
    if (!activeTripData || !activeTripData.activities) return [];
    return activeTripData.activities.filter(act => act.latitude != null && act.longitude != null);
  }, [activeTripData]);


  if (isLoading && !activeTripData) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-lg mt-8">
            <CardHeader>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[500px] w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeTripData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Plane className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No hay un itinerario activo.</h2>
        <p className="mb-4 text-muted-foreground">Por favor, crea o selecciona un viaje para ver el itinerario.</p>
        <Button onClick={() => router.push('/plan/new')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Viaje
        </Button>
      </div>
    );
  }

  const handleSaveGlobalActivity = (activity: ActivityItem) => {
    if (editingActivity) {
      updateActivity(activity);
      toast({ title: "Actividad Actualizada", description: `${activity.name} ha sido actualizada.` });
    } else {
      const { id, ...newActivityData } = activity;
      addActivity(newActivityData as Omit<ActivityItem, 'id'>);
      toast({ title: "Actividad Añadida", description: `${activity.name} ha sido añadida al viaje.` });
    }
    setEditingActivity(null);
    setIsActivityFormOpen(false);
  };

  const itineraryDays = (activeTripData.itinerary || []).sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());


  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle className="text-3xl font-headline text-primary mb-1">Itinerario: {activeTripData.destination}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-md text-muted-foreground">
                <CalendarRange className="h-5 w-5 text-accent" />
                <Badge variant="outline" className="text-sm">
                  Desde: {format(parseISO(activeTripData.startDate), "PPP", { locale: es })}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:inline-block" />
                <Badge variant="outline" className="text-sm">
                  Hasta: {format(parseISO(activeTripData.endDate), "PPP", { locale: es })}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-2">Planifica cada día de tu aventura. Las actividades globales se muestran en el mapa de abajo.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
              <Dialog open={isActivityFormOpen} onOpenChange={(isOpen) => {
                setIsActivityFormOpen(isOpen);
                if (!isOpen) setEditingActivity(null);
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingActivity(null)} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Actividad/Evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">
                      {editingActivity ? "Editar Actividad/Evento" : "Añadir Nueva Actividad/Evento Global"}
                    </DialogTitle>
                  </DialogHeader>
                  <ActivityForm
                    activityTypes={activityTypes}
                    onSubmit={handleSaveGlobalActivity}
                    initialData={editingActivity}
                    onCancel={() => { setEditingActivity(null); setIsActivityFormOpen(false); }}
                    tripStartDate={activeTripData.startDate}
                    tripEndDate={activeTripData.endDate}
                  />
                </DialogContent>
              </Dialog>
              <Link href={`/plan/new?edit=${activeTripData.id}`} passHref>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Edit3 className="mr-2 h-4 w-4" /> Modificar Viaje
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
              className="w-full sm:w-auto"
            >
              {viewMode === 'list' ?
                <><GanttChartSquare className="mr-2 h-4 w-4" /> Ver Línea de Tiempo</> :
                <><LayoutList className="mr-2 h-4 w-4" /> Ver Lista de Días</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {itineraryDays.length === 0 && (
            <div className="text-center space-y-4 py-8">
              <CardTitle className="text-2xl font-headline text-primary">Este viaje aún no tiene días planificados.</CardTitle>
              <p className="text-muted-foreground">Puedes modificar las fechas del viaje para generar los días del itinerario.</p>
              <Link href={`/plan/new?edit=${activeTripData.id}`} passHref>
                <Button variant="default">
                  <Edit3 className="mr-2 h-4 w-4" /> Modificar Fechas del Viaje
                </Button>
              </Link>
            </div>
          )}

          {viewMode === 'list' && itineraryDays.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itineraryDays.map((dailyPlan, index) => (
                <DayCard
                  key={dailyPlan.date}
                  dailyPlan={dailyPlan}
                  dayNumber={index + 1}
                  tripId={activeTripData.id}
                  onUpdateDayImage={updateDailyPlanImage}
                />
              ))}
            </div>
          )}

          {viewMode === 'timeline' && itineraryDays.length > 0 && (
            <TripTimelineView />
          )}
        </CardContent>
      </Card>

      {/* Mapa General del Viaje */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Map className="mr-2 h-6 w-6" /> Mapa General del Viaje
          </CardTitle>
          <CardDescription>
            Visualiza todas las actividades del viaje con ubicación. La ruta entre ellas se calculará automáticamente si tienen coordenadas.
            Asegúrate de que tus actividades tengan latitud y longitud.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full rounded-md border overflow-hidden bg-muted">
            <ActivityMapComponent activities={activitiesForMap} />
          </div>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
                Las rutas son generadas por Open Source Routing Machine (OSRM). Las optimizaciones textuales diarias son provistas por IA.
            </p>
        </CardFooter>
      </Card>

    </div>
  );
}

    