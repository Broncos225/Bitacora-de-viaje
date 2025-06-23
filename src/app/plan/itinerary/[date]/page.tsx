
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTripData } from "@/hooks/use-trip-data";
import type { ActivityItem, DailyPlan, ActivityType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityForm } from "@/components/forms/ActivityForm";
import { ActivityCard } from "@/components/planning/ActivityCard";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { routeOptimization } from "@/ai/flows/route-optimization";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval } from "date-fns";
import { es } from 'date-fns/locale';
import { ArrowLeft, Brain, Edit, PlusCircle, Trash2, Wand2, Plane } from "lucide-react";
import { OptimizedRouteDisplay } from "@/components/planning/OptimizedRouteDisplay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const activityTypes: ActivityType[] = ['Actividad', 'Comida', 'Compras', 'Transporte', 'Alojamiento'];

export default function DayPlanPage() {
  const params = useParams();
  const router = useRouter();
  const date = typeof params.date === 'string' ? params.date : '';
  
  const { 
    activeTripData, 
    getDailyPlan, 
    updateDailyPlan, 
    updateActivity,
    removeActivity,
    isLoading 
  } = useTripData();
  const { toast } = useToast();

  const [currentDailyPlan, setCurrentDailyPlan] = useState<DailyPlan | null>(null);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [dayNotes, setDayNotes] = useState('');

  useEffect(() => {
    if (date && activeTripData) {
      const plan = getDailyPlan(date);
      if (plan) {
        setCurrentDailyPlan(plan);
        setDayNotes(plan.notes || '');
      } else { 
        toast({ title: "Error", description: "Día no encontrado en el itinerario del viaje activo.", variant: "destructive" });
        router.push("/plan/itinerary");
      }
    } else if (!isLoading && !activeTripData) {
      router.push("/plan/itinerary");
    }
  }, [date, activeTripData, getDailyPlan, router, toast, isLoading]);

  const activitiesForThisDay = useMemo(() => {
    if (!activeTripData || !date) return [];
    const currentDayDate = parseISO(date);
    return (activeTripData.activities || [])
      .filter(activity => {
        const activityStartDate = parseISO(activity.startDate);
        const activityEndDate = parseISO(activity.endDate);
        return isWithinInterval(currentDayDate, { start: activityStartDate, end: activityEndDate });
      })
      .sort((a, b) => {
        const aHasTime = !!a.startTime;
        const bHasTime = !!b.startTime;

        if (aHasTime && !bHasTime) return -1;
        if (!aHasTime && bHasTime) return 1;

        if (aHasTime && bHasTime) {
            const timeComparison = a.startTime!.localeCompare(b.startTime!);
            if (timeComparison !== 0) {
                return timeComparison;
            }
        }
        
        return a.name.localeCompare(b.name);
      });
  }, [activeTripData, date]);

  const handleSaveActivity = (activity: ActivityItem) => {
    if (editingActivity) {
      updateActivity(activity);
      toast({ title: "Actividad Actualizada", description: `${activity.name} ha sido actualizada.` });
    }
    setEditingActivity(null);
    setIsActivityFormOpen(false);
  };

  const handleEditActivity = (activity: ActivityItem) => {
    setEditingActivity(activity);
    setIsActivityFormOpen(true);
  };

  const handleRemoveActivity = (activityId: string) => {
    removeActivity(activityId);
    toast({ title: "Actividad Eliminada", description: "La actividad ha sido eliminada." });
  };
  
  const handleDayNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDayNotes(e.target.value);
  };

  const saveDayNotes = () => {
    if (currentDailyPlan) {
      updateDailyPlan(currentDailyPlan.date, { ...currentDailyPlan, notes: dayNotes });
      toast({ title: "Notas Guardadas", description: "Las notas del día han sido actualizadas." });
    }
  };

  const handleOptimizeRouteAI = async () => {
    if (activitiesForThisDay.length === 0) {
      toast({ title: "No hay actividades", description: "Añade actividades a este día para optimizar la ruta.", variant: "destructive" });
      return;
    }
    setIsOptimizing(true);
    try {
      const itineraryDescription = activitiesForThisDay.map(act => {
        let parts = [`- Tipo: ${act.type}`, `Nombre: ${act.name}`];
        if (act.startTime) parts.push(`Hora Inicio: ${act.startTime}`);
        if (act.endTime) parts.push(`Hora Fin: ${act.endTime}`);
        
        let locationInfo = [];
        if (act.location) locationInfo.push(act.location);
        if (act.cityRegion) locationInfo.push(act.cityRegion);
        if (act.address) locationInfo.push(act.address);
        if (locationInfo.length > 0) parts.push(`Ubicación: ${locationInfo.join(', ')}`);

        if (act.latitude && act.longitude) parts.push(`Coords: ${act.latitude}, ${act.longitude}`);
        if (act.budget && act.budget > 0) parts.push(`Presupuesto: ${act.budget}`);
        
        // Add type-specific details
        if (act.type === 'Transporte' && act.transportationMode) parts.push(`Modo de Transporte: ${act.transportationMode}`);
        if (act.type === 'Transporte' && act.gasolineBudget && act.gasolineBudget > 0) parts.push(`Presupuesto Gasolina: ${act.gasolineBudget}`);
        if (act.type === 'Transporte' && act.tollsBudget && act.tollsBudget > 0) parts.push(`Presupuesto Peajes: ${act.tollsBudget}`);
        if (act.type === 'Comida' && act.mealType) parts.push(`Tipo de Comida: ${act.mealType}`);
        if (act.type === 'Comida' && act.cuisineType) parts.push(`Tipo de Cocina: ${act.cuisineType}`);
        if (act.type === 'Comida' && act.dietaryNotes) parts.push(`Notas Dietéticas: ${act.dietaryNotes}`);
        if (act.type === 'Actividad' && act.activityCategory) parts.push(`Categoría Actividad: ${act.activityCategory}`);
        if (act.type === 'Compras' && act.shoppingCategory) parts.push(`Categoría Compras: ${act.shoppingCategory}`);
        
        if (act.notes) parts.push(`Notas: ${act.notes}`);

        return parts.join('; ');
      }).join('\n');
      
      const result = await routeOptimization({ dailyItinerary: itineraryDescription });
      updateDailyPlan(currentDailyPlan!.date, { 
        ...currentDailyPlan!, 
        optimizedRoute: result.optimizedRoute,
        estimatedTimeSavings: result.estimatedTimeSavings,
        estimatedCostSavings: result.estimatedCostSavings,
      });
      toast({ title: "Optimización de IA Recibida", description: "Se ha sugerido una nueva ruta y optimización textual." });
    } catch (error) {
      console.error("Error optimizing route with AI:", error);
      toast({ title: "Error de Optimización IA", description: "No se pudo obtener la optimización de la IA.", variant: "destructive" });
    }
    setIsOptimizing(false);
  };
  
  if (isLoading) {
    return <div className="text-center py-10">Cargando datos del viaje...</div>;
  }

  if (!activeTripData) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <Plane className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No hay un viaje activo.</h2>
        <p className="mb-4 text-muted-foreground">Por favor, crea o selecciona un viaje.</p>
        <Button onClick={() => router.push('/plan/new')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Viaje
        </Button>
      </div>
    );
  }

  if (!currentDailyPlan) {
    return <div className="text-center py-10">Cargando plan del día... Si el problema persiste, el día podría no ser válido o no pertenecer al viaje activo.</div>;
  }

  const formattedDate = format(parseISO(currentDailyPlan.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="space-y-6 animate-fadeIn">
      <Button variant="outline" onClick={() => router.push('/plan/itinerary')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Itinerario ({activeTripData.destination})
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle className="text-3xl font-headline text-primary">Plan para el {formattedDate}</CardTitle>
              <CardDescription>Eventos, actividades y alojamientos programados para este día.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="dayNotes" className="text-lg font-semibold">Notas del Día</Label>
            <Textarea 
              id="dayNotes"
              placeholder="Añade notas generales para este día..."
              value={dayNotes}
              onChange={handleDayNotesChange}
              className="mt-2 min-h-[100px]"
            />
            <Button onClick={saveDayNotes} className="mt-2" size="sm">Guardar Notas</Button>
          </div>

          <div className="flex justify-between items-center mt-6">
            <h3 className="text-2xl font-semibold font-headline">Actividades y Alojamientos del Día</h3>
            <Dialog open={isActivityFormOpen} onOpenChange={(isOpen) => {
                setIsActivityFormOpen(isOpen);
                if (!isOpen) setEditingActivity(null);
            }}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">
                    {editingActivity ? `Editar: ${editingActivity.name}` : "Editar Actividad/Evento"}
                  </DialogTitle>
                </DialogHeader>
                <ActivityForm
                  activityTypes={activityTypes}
                  onSubmit={handleSaveActivity}
                  initialData={editingActivity}
                  onCancel={() => { setEditingActivity(null); setIsActivityFormOpen(false); }}
                  tripStartDate={activeTripData.startDate}
                  tripEndDate={activeTripData.endDate}
                />
              </DialogContent>
            </Dialog>
          </div>

          {activitiesForThisDay.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay actividades ni alojamientos planificados para este día.</p>
          ) : (
            <div className="space-y-4">
              {activitiesForThisDay.map(activity => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity} 
                  currentDate={date}
                  onEdit={() => handleEditActivity(activity)} 
                  onRemove={() => handleRemoveActivity(activity.id)} 
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Brain className="mr-2 h-6 w-6" /> Optimización de Itinerario Diario (Sugerencias de IA)
          </CardTitle>
          <CardDescription>
            Deja que nuestra IA analice tus actividades del día y te sugiera la ruta más eficiente textualmente.
            Esta optimización es específica para las actividades de este día.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentDailyPlan.optimizedRoute ? (
            <OptimizedRouteDisplay 
              optimizedRoute={currentDailyPlan.optimizedRoute}
              estimatedTimeSavings={currentDailyPlan.estimatedTimeSavings}
              estimatedCostSavings={currentDailyPlan.estimatedCostSavings}
            />
          ) : (
            <p className="text-muted-foreground">Aún no se ha solicitado una optimización de IA para este día.</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
           <Button onClick={handleOptimizeRouteAI} disabled={isOptimizing || activitiesForThisDay.length === 0} className="w-full sm:w-auto">
            <Wand2 className="mr-2 h-4 w-4" /> {isOptimizing ? "Optimizando..." : "Obtener Sugerencias de IA (Texto)"}
          </Button>
          {currentDailyPlan.optimizedRoute && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" /> Limpiar Sugerencias de IA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitleComponent>¿Estás seguro?</AlertDialogTitleComponent>
                  <AlertDialogDescription>
                    Esto eliminará las sugerencias textuales de la IA para este día.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => updateDailyPlan(currentDailyPlan!.date, { 
                      ...currentDailyPlan!, 
                      optimizedRoute: '', 
                      estimatedTimeSavings: '', 
                      estimatedCostSavings: '',
                    })}
                  >
                    Limpiar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
