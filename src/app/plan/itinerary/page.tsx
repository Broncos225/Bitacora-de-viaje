
"use client";

import Link from "next/link";
import { useTripData } from "@/hooks/use-trip-data";
import type { DailyPlan, ActivityItem, ActivityType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActivityForm } from "@/components/forms/ActivityForm";
import { CalendarDays, ArrowRight, Edit3, Plane, PlusCircle, CalendarRange, LayoutList, GanttChartSquare, Upload, ImageOff, MoreVertical, Map, FileText, Landmark, Building2, MapPin, BedDouble, Car, ShoppingCart, Utensils, Puzzle } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";


const ActivityMapComponent = dynamic(() => import('@/components/planning/ActivityMap').then(mod => mod.ActivityMap), {
  ssr: false,
  loading: () => <p className="text-center py-4 text-muted-foreground">Cargando mapa general del viaje...</p>,
});


const activityTypes: ActivityType[] = ['Actividad', 'Comida', 'Compras', 'Transporte', 'Alojamiento'];

const activityTypeVisuals: Record<ActivityType, { border: string; text: string; icon: React.ElementType }> = {
  Actividad: { border: "border-purple-500", text: "text-purple-700 dark:text-purple-300", icon: Puzzle },
  Comida: { border: "border-orange-500", text: "text-orange-700 dark:text-orange-300", icon: Utensils },
  Compras: { border: "border-pink-500", text: "text-pink-700 dark:text-pink-300", icon: ShoppingCart },
  Transporte: { border: "border-teal-500", text: "text-teal-700 dark:text-teal-300", icon: Car },
  Alojamiento: { border: "border-blue-500", text: "text-blue-700 dark:text-blue-300", icon: BedDouble },
};


interface DayAccordionItemProps {
  dailyPlan: DailyPlan;
  dayNumber: number;
  tripId: string;
  onUpdateDayImage: (date: string, imageUri: string | null) => void;
  getActivitiesForDate: (date: string) => ActivityItem[];
}

function DayAccordionItem({ dailyPlan, dayNumber, tripId, onUpdateDayImage, getActivitiesForDate }: DayAccordionItemProps) {
    const dayDate = parseISO(dailyPlan.date);
    const dayNumDisplay = `Día ${dayNumber}`;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const dayActivities = getActivitiesForDate(dailyPlan.date).sort((a, b) => {
        // Prioritize items with a startTime
        const aHasTime = !!a.startTime;
        const bHasTime = !!b.startTime;

        if (aHasTime && !bHasTime) return -1;
        if (!aHasTime && bHasTime) return 1;

        // If both have startTime, compare them
        if (aHasTime && bHasTime) {
            const timeComparison = a.startTime!.localeCompare(b.startTime!);
            if (timeComparison !== 0) {
                return timeComparison;
            }
        }

        // If both are untimed, or have the same time, use secondary sorting.
        // Place 'Alojamiento' first among untimed events.
        if (a.type === 'Alojamiento' && b.type !== 'Alojamiento') return -1;
        if (a.type !== 'Alojamiento' && b.type === 'Alojamiento') return 1;

        // Fallback to sorting by name
        return a.name.localeCompare(b.name);
      });

    const handleUploadButtonClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      event.stopPropagation();
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

    const handleRemoveImage = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await onUpdateDayImage(dailyPlan.date, null);
        toast({title: "Imagen del Día Eliminada", description: `Se eliminó la imagen personalizada para el ${dayNumDisplay}.`})
    };
    
    const imageSrc = dailyPlan.dayImageUri || `https://placehold.co/64x64.png?text=Día+${dayNumber}`;

    return (
        <AccordionItem value={`day-${dayNumber}`} className="bg-card border-b-0 rounded-lg shadow-sm">
            <AccordionTrigger className="hover:no-underline p-4 rounded-lg">
                <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-4 text-left">
                        <Image
                            src={imageSrc}
                            alt={`Imagen del Día ${dayNumber}`}
                            width={56}
                            height={56}
                            className="rounded-md object-cover h-14 w-14"
                            data-ai-hint="itinerary day small"
                            key={imageSrc}
                        />
                        <div>
                            <h3 className="text-lg font-semibold font-headline text-primary">
                                Día {dayNumber}: {format(dayDate, "EEEE", { locale: es })}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {format(dayDate, "d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                        </div>
                    </div>
                    <div className="relative mr-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <span
                                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 rounded-full")}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
            </AccordionTrigger>
            <AccordionContent className="pl-6 pr-4 pb-4 border-l-2 border-primary/20 ml-9">
                {dailyPlan.notes && (
                    <p className="text-sm italic text-muted-foreground mb-4 border border-dashed p-3 rounded-md bg-background">
                        <FileText className="inline mr-2 h-4 w-4" />
                        <span className="font-medium">Notas del día:</span> {dailyPlan.notes}
                    </p>
                )}
                <div className="mb-3">
                    <h4 className="font-semibold text-base">Actividades del Día</h4>
                </div>
                {dayActivities.length > 0 ? (
                    <ul className="space-y-3">
                        {dayActivities.map(activity => {
                            const visuals = activityTypeVisuals[activity.type] || activityTypeVisuals['Actividad'];
                            const Icon = visuals.icon;
                            return (
                                <li key={activity.id} className={cn("text-sm p-3 bg-background rounded-md shadow-sm border-l-4", visuals.border)}>
                                    <div className="font-semibold flex items-center">
                                        <Icon className={cn("h-4 w-4 mr-2 shrink-0", visuals.text)} />
                                        <span>{activity.name} <span className="text-xs font-normal text-muted-foreground">({activity.type}{activity.type === 'Comida' && activity.mealType ? ` - ${activity.mealType}` : ''})</span></span>
                                    </div>
                                    <div className="pl-6 space-y-1 mt-1">
                                        {activity.startTime && <div className="text-xs text-muted-foreground">Horario: {activity.startTime}{activity.endTime && ` - ${activity.endTime}`}</div>}
                                        {activity.location && <div className="text-xs flex items-center"><Landmark size={14} className="mr-1.5 shrink-0"/> {activity.location}</div>}
                                        {activity.cityRegion && <div className="text-xs flex items-center"><Building2 size={14} className="mr-1.5 shrink-0"/> {activity.cityRegion}</div>}
                                        {activity.address && <div className="text-xs flex items-center"><MapPin size={14} className="mr-1.5 shrink-0"/> {activity.address}</div>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-muted-foreground text-sm">No hay actividades planificadas para este día.</p>
                )}
                
                <Link href={`/plan/itinerary/${dailyPlan.date}`} passHref>
                    <Button variant="link" size="sm" className="mt-4 p-0 h-auto text-primary items-center">
                        Ver/Editar Día Completo <ArrowRight className="ml-1 h-3 w-3"/>
                    </Button>
                </Link>
            </AccordionContent>
        </AccordionItem>
    );
}

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`} />
);


export default function ItineraryPage() {
  const { activeTripData, isLoading, addActivity, updateActivity, updateDailyPlanImage, getActivitiesForDate } = useTripData();
  const router = useRouter();
  const { toast } = useToast();

  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  const activitiesForMap = useMemo(() => {
    if (!activeTripData || !activeTripData.activities) return [];
    return activeTripData.activities; 
  }, [activeTripData]);


  if (isLoading && !activeTripData) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 w-full flex items-center p-4 bg-muted rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="ml-4 flex-grow space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
              </div>
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
            <Accordion type="single" collapsible className="w-full space-y-4">
              {itineraryDays.map((dailyPlan, index) => (
                <DayAccordionItem
                  key={dailyPlan.date}
                  dailyPlan={dailyPlan}
                  dayNumber={index + 1}
                  tripId={activeTripData.id}
                  onUpdateDayImage={updateDailyPlanImage}
                  getActivitiesForDate={getActivitiesForDate}
                />
              ))}
            </Accordion>
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
            Visualiza todas las actividades del viaje. Si ingresas coordenadas o direcciones válidas, se mostrará una ruta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full rounded-md border overflow-hidden bg-muted">
            <ActivityMapComponent 
              activities={activitiesForMap} 
              tripDestination={activeTripData.destination}
            />
          </div>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
                El mapa es provisto por Google Maps. Asegúrate de tener una API key válida y correctamente restringida para producción.
            </p>
        </CardFooter>
      </Card>

    </div>
  );
}
