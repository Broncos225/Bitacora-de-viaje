
"use client";

import React, { useMemo, useState } from "react";
import { useTripData } from "@/hooks/use-trip-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ActivityForm } from "@/components/forms/ActivityForm";
import { BedDouble, Car, ShoppingCart, Utensils, PuzzleIcon, Clock, MapPin, Info, LogIn, LogOut, FileText, CalendarDays, Landmark, Building2, Edit3, Trash2, DollarSign } from "lucide-react";
import type { ActivityItem, ActivityType } from "@/lib/types";
import { format, parseISO, eachDayOfInterval, isSameDay, differenceInCalendarDays, isWithinInterval, max, min, isEqual } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ACTIVITY_TYPE_ORDER: ActivityType[] = ['Alojamiento', 'Transporte', 'Actividad', 'Comida', 'Compras'];
const activityTypesForForm: ActivityType[] = ['Actividad', 'Comida', 'Compras', 'Transporte', 'Alojamiento'];


const activityTypeVisuals: Record<ActivityType, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  Actividad: { bg: "bg-purple-100 dark:bg-purple-900/40", border: "border-purple-500", text: "text-purple-700 dark:text-purple-300", icon: PuzzleIcon },
  Comida: { bg: "bg-orange-100 dark:bg-orange-900/40", border: "border-orange-500", text: "text-orange-700 dark:text-orange-300", icon: Utensils },
  Compras: { bg: "bg-pink-100 dark:bg-pink-900/40", border: "border-pink-500", text: "text-pink-700 dark:text-pink-300", icon: ShoppingCart },
  Transporte: { bg: "bg-teal-100 dark:bg-teal-900/40", border: "border-teal-500", text: "text-teal-700 dark:text-teal-300", icon: Car },
  Alojamiento: { bg: "bg-blue-100 dark:bg-blue-900/40", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300", icon: BedDouble },
};

const TYPE_HEADER_ROW_HEIGHT = '40px'; 
const DAY_ROW_MIN_HEIGHT = '70px'; // Increased slightly for better content fit

interface ActivityBlockData extends ActivityItem {
  trackIndex: number;
}

interface TripLayoutData {
  tripDaysArray: Date[];
  allActivities: ActivityItem[]; // All relevant activities for the trip period
  overallMaxTracksPerType: Record<ActivityType, number>;
  activityTypeHeaderSpans: Array<{ type: ActivityType; span: number; gridColumnStart: number }>;
  dynamicGridTemplateColumnsString: string;
  error: string | null;
}

// Function to assign tracks to activities to prevent visual overlap within a type
function assignTracksToActivities(
  activities: ActivityItem[],
  days: Date[],
  activityTypes: ActivityType[]
): { assignments: Record<string, { track: number }>, maxTracksPerType: Record<ActivityType, number> } {
  const assignments: Record<string, { track: number }> = {};
  const occupiedTracksPerDayType: Record<string, Partial<Record<ActivityType, boolean[]>>> = {}; // dayStr -> type -> trackIsOccupied[]
  const currentMaxTracksForType: Partial<Record<ActivityType, number>> = {};

  days.forEach(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    occupiedTracksPerDayType[dayStr] = {};
    activityTypes.forEach(type => {
      occupiedTracksPerDayType[dayStr][type] = [];
    });
  });

  const sortedForTracking = [...activities].sort((a, b) => {
    const startA = parseISO(a.startDate).getTime();
    const startB = parseISO(b.startDate).getTime();
    if (startA !== startB) return startA - startB;
    
    const durationA = differenceInCalendarDays(parseISO(a.endDate), parseISO(a.startDate));
    const durationB = differenceInCalendarDays(parseISO(b.endDate), parseISO(b.startDate));
    if (durationA !== durationB) return durationB - durationA; // Longer first

    const timeA = a.startTime || "00:00";
    const timeB = b.startTime || "00:00";
    return timeA.localeCompare(timeB);
  });

  for (const activity of sortedForTracking) {
    const activityStart = parseISO(activity.startDate);
    const activityEnd = parseISO(activity.endDate);
    const activityDaysInvolved = days.filter(d => isWithinInterval(d, { start: activityStart, end: activityEnd }));

    if (activityDaysInvolved.length === 0) continue;

    let assignedTrackForActivity = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let trackIsAvailableThisIteration = true;
      for (const day of activityDaysInvolved) {
        const dayFormatted = format(day, 'yyyy-MM-dd');
        if (occupiedTracksPerDayType[dayFormatted]?.[activity.type]?.[assignedTrackForActivity]) {
          trackIsAvailableThisIteration = false;
          break;
        }
      }
      if (trackIsAvailableThisIteration) break;
      assignedTrackForActivity++;
    }

    assignments[activity.id] = { track: assignedTrackForActivity };

    for (const day of activityDaysInvolved) {
        const dayFormatted = format(day, 'yyyy-MM-dd');
        occupiedTracksPerDayType[dayFormatted][activity.type]![assignedTrackForActivity] = true;
    }
    currentMaxTracksForType[activity.type] = Math.max(currentMaxTracksForType[activity.type] || 0, assignedTrackForActivity + 1);
  }

  const finalMaxTracks: Record<ActivityType, number> = {} as Record<ActivityType, number>;
  activityTypes.forEach(type => {
    finalMaxTracks[type] = currentMaxTracksForType[type] || 1; // Default to 1 track if no activities of this type
  });

  return { assignments, maxTracksPerType: finalMaxTracks };
}


export function TripTimelineView() {
  const { activeTripData, isLoading, updateActivity, removeActivity } = useTripData();
  const { toast } = useToast();

  const [selectedActivityForDialog, setSelectedActivityForDialog] = useState<ActivityItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<ActivityItem | null>(null);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);


  const tripLayoutData = useMemo<TripLayoutData>(() => {
    const defaultErrorReturn = (error: string): TripLayoutData => ({
        tripDaysArray: [],
        allActivities: [],
        overallMaxTracksPerType: {} as Record<ActivityType, number>,
        activityTypeHeaderSpans: [],
        dynamicGridTemplateColumnsString: 'minmax(100px, auto)', // Date column
        error,
    });

    if (!activeTripData) return defaultErrorReturn("no_active_trip");

    const tripStartDateMain = parseISO(activeTripData.startDate);
    const tripEndDateMain = parseISO(activeTripData.endDate);

    if (isNaN(tripStartDateMain.getTime()) || isNaN(tripEndDateMain.getTime()) || tripStartDateMain > tripEndDateMain) {
      return defaultErrorReturn("invalid_dates");
    }
    
    const daysArray = eachDayOfInterval({ start: tripStartDateMain, end: tripEndDateMain });
    if (daysArray.length === 0) {
      return defaultErrorReturn("no_days");
    }

    const rawActivities = (activeTripData.activities || []).filter(activity => {
      try {
        const activityStart = parseISO(activity.startDate);
        const activityEnd = parseISO(activity.endDate);
        if (isNaN(activityStart.getTime()) || isNaN(activityEnd.getTime()) || activityStart > activityEnd) return false;
        
        const tripInterval = { start: tripStartDateMain, end: tripEndDateMain };
        return isWithinInterval(activityStart, tripInterval) || 
               isWithinInterval(activityEnd, tripInterval) ||
               (activityStart < tripStartDateMain && activityEnd > tripEndDateMain);
      } catch (e) { return false; }
    });

    if (rawActivities.length === 0) {
        return defaultErrorReturn("no_activities");
    }
    
    const { assignments: trackAssignments, maxTracksPerType: calculatedMaxTracksPerType } = assignTracksToActivities(rawActivities, daysArray, ACTIVITY_TYPE_ORDER);

    const localSortedActivitiesWithTracks: ActivityBlockData[] = rawActivities
      .map(act => ({ ...act, trackIndex: trackAssignments[act.id]?.track ?? 0 }))
      .sort((a, b) => {
        const typeAIndex = ACTIVITY_TYPE_ORDER.indexOf(a.type);
        const typeBIndex = ACTIVITY_TYPE_ORDER.indexOf(b.type);
        if (typeAIndex !== typeBIndex) return typeAIndex - typeBIndex;
        
        if (a.trackIndex !== b.trackIndex) return a.trackIndex - b.trackIndex;

        const startA = parseISO(a.startDate).getTime();
        const startB = parseISO(b.startDate).getTime();
        if (startA !== startB) return startA - startB;

        const timeA = a.startTime || "00:00";
        const timeB = b.startTime || "00:00";
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        
        return a.name.localeCompare(b.name);
      });

    const internalDynamicGridCols: string[] = ['minmax(100px, auto)']; // For date labels
    const internalActivityTypeHeaderSpans: Array<{ type: ActivityType; span: number; gridColumnStart: number }> = [];
    let currentGlobalGridColumnIndex = 2; // Starts at 2 because column 1 is for dates

    ACTIVITY_TYPE_ORDER.forEach(type => {
      const tracksForThisType = calculatedMaxTracksPerType[type] || 1; 
      internalActivityTypeHeaderSpans.push({ type, span: tracksForThisType, gridColumnStart: currentGlobalGridColumnIndex });
      for (let i = 0; i < tracksForThisType; i++) {
        internalDynamicGridCols.push('minmax(150px, 1fr)'); // Min width for track columns
      }
      currentGlobalGridColumnIndex += tracksForThisType;
    });
    
    const finalDynamicGridTemplateColumnsString = internalDynamicGridCols.join(' ');

    return {
      tripDaysArray: daysArray,
      allActivities: localSortedActivitiesWithTracks, // Use the processed list with trackIndex
      overallMaxTracksPerType: calculatedMaxTracksPerType,
      activityTypeHeaderSpans: internalActivityTypeHeaderSpans,
      dynamicGridTemplateColumnsString: finalDynamicGridTemplateColumnsString,
      error: null,
    };

  }, [activeTripData]);

  if (isLoading || !tripLayoutData) return <Card><CardHeader><CardTitle>Línea de Tiempo del Viaje</CardTitle></CardHeader><CardContent><p>Cargando datos...</p></CardContent></Card>;
  
  const {
    tripDaysArray,
    allActivities, // Renamed from sortedActivitiesWithTracks for clarity
    activityTypeHeaderSpans,
    dynamicGridTemplateColumnsString,
    error: tripDataError,
  } = tripLayoutData;

  if (tripDataError === "no_active_trip") return <Card><CardHeader><CardTitle>Línea de Tiempo del Viaje</CardTitle></CardHeader><CardContent><p className="text-destructive">No hay un viaje activo seleccionado.</p></CardContent></Card>;
  if (tripDataError === "invalid_dates") return <Card><CardHeader><CardTitle>Línea de Tiempo del Viaje</CardTitle></CardHeader><CardContent><p className="text-destructive">Fechas de viaje inválidas.</p></CardContent></Card>;
  if (tripDataError === "no_days") return <Card><CardHeader><CardTitle>Línea de Tiempo del Viaje</CardTitle><CardDescription>Visualiza tus actividades.</CardDescription></CardHeader><CardContent><p className="text-muted-foreground">Viaje sin días definidos.</p></CardContent></Card>;
  
  if (tripDataError === "no_activities" || !allActivities || allActivities.length === 0) {
     return (
       <Card>
         <CardHeader>
           <CardTitle>Línea de Tiempo del Viaje</CardTitle>
            <CardDescription>Visualiza tus actividades a lo largo del viaje.</CardDescription>
         </CardHeader>
         <CardContent><p className="text-muted-foreground">Aún no has añadido actividades a este viaje.</p></CardContent>
       </Card>
     );
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: dynamicGridTemplateColumnsString,
    gridTemplateRows: `${TYPE_HEADER_ROW_HEIGHT} repeat(${tripDaysArray.length}, minmax(${DAY_ROW_MIN_HEIGHT}, auto))`,
    gap: '1px',
    backgroundColor: 'hsl(var(--border))',
    border: '1px solid hsl(var(--border))',
  };
  
  const activityBlocksToRender = allActivities.map(activity => {
    const activityStart = parseISO(activity.startDate);
    const activityEnd = parseISO(activity.endDate);

    const firstViewableDayOfActivity = max([tripDaysArray[0], activityStart]);
    const lastViewableDayOfActivity = min([tripDaysArray[tripDaysArray.length - 1], activityEnd]);

    if (firstViewableDayOfActivity > lastViewableDayOfActivity) return null;

    const actualStartDayIndex = tripDaysArray.findIndex(day => isSameDay(day, firstViewableDayOfActivity));
    if (actualStartDayIndex === -1) return null;

    const actualEndDayIndex = tripDaysArray.findIndex(day => isSameDay(day, lastViewableDayOfActivity));
    if (actualEndDayIndex === -1) return null;
    
    const durationInViewDays = actualEndDayIndex - actualStartDayIndex + 1;
    if (durationInViewDays <= 0) return null;

    let activityGridColumnStartVal = 0;
    let typeGlobalStartIndex = 2; // Column 1 is for dates
    for (const headerSpan of activityTypeHeaderSpans) {
        if (headerSpan.type === activity.type) {
            activityGridColumnStartVal = typeGlobalStartIndex + (activity as ActivityBlockData).trackIndex;
            break;
        }
        typeGlobalStartIndex += headerSpan.span;
    }
    if (activityGridColumnStartVal === 0) return null; // Should not happen if type exists
    
    const visuals = activityTypeVisuals[activity.type];
    const Icon = visuals.icon;

    return {
      activity,
      gridRow: actualStartDayIndex + 2,
      rowSpan: durationInViewDays,
      activityGridColumnStart: activityGridColumnStartVal,
      visuals,
      Icon
    };
  }).filter(Boolean);

  const handleBlockClick = (activity: ActivityItem) => {
    setSelectedActivityForDialog(activity);
    setIsDetailDialogOpen(true);
  };

  const handleEditRequest = () => {
    if (selectedActivityForDialog) {
      setActivityToEdit(selectedActivityForDialog);
      setIsActivityFormOpen(true);
      setIsDetailDialogOpen(false); // Close detail dialog
    }
  };

  const handleDeleteActivity = () => {
    if (selectedActivityForDialog) {
      removeActivity(selectedActivityForDialog.id);
      toast({ title: "Actividad Eliminada", description: `"${selectedActivityForDialog.name}" ha sido eliminada.` });
      setIsDetailDialogOpen(false);
      setSelectedActivityForDialog(null);
    }
  };

  const handleSaveActivityUpdate = (updatedActivityItem: ActivityItem) => {
    updateActivity(updatedActivityItem);
    toast({ title: "Actividad Actualizada", description: `"${updatedActivityItem.name}" ha sido actualizada.` });
    setIsActivityFormOpen(false);
    setActivityToEdit(null);
  };

  return (
    <div className="w-full overflow-x-auto p-1 bg-muted/30 rounded-lg shadow-inner">
      <CardHeader className="p-2 mb-1 sticky left-0 bg-background/90 backdrop-blur-sm z-30 w-fit rounded-tr-lg md:w-full">
        <CardTitle className="text-xl md:text-2xl">Línea de Tiempo del Viaje</CardTitle>
        <CardDescription className="text-xs md:text-sm">Columnas por tipo/pista, filas por día. Haz clic en un bloque para ver detalles.</CardDescription>
      </CardHeader>
      <TooltipProvider delayDuration={100}>
        <div style={gridStyle} className="min-w-max relative rounded-md border-collapse border border-border">
          {/* Celda esquina superior izquierda (vacía para cabeceras) */}
          <div style={{ gridColumn: 1, gridRow: 1 }} className="sticky top-0 left-0 z-20 bg-muted border-r border-b border-border" />

          {/* Cabeceras de Tipo de Actividad (Columnas) */}
          {activityTypeHeaderSpans.map(({ type, span, gridColumnStart }) => {
            const visuals = activityTypeVisuals[type];
            const Icon = visuals.icon;
            return (
              <div
                key={`type-header-${type}`}
                style={{ 
                    gridColumnStart: gridColumnStart,
                    gridColumnEnd: `span ${span}`,
                    gridRow: 1 
                }}
                className={cn(
                  "sticky top-0 z-10 p-2 text-sm font-semibold text-center flex items-center justify-center h-full shadow-sm",
                  visuals.bg, visuals.text, "border-b border-r border-border backdrop-blur-sm"
                )}
              >
                <Icon size={16} className={cn("mr-1.5 shrink-0", visuals.text)} />
                {type}
              </div>
            );
          })}
          
          {/* Celdas Base del Grid y Cabeceras de Día */}
          {tripDaysArray.map((day, dayIndex) => (
            <React.Fragment key={`row-frag-${format(day, 'yyyy-MM-dd')}`}>
              {/* Cabecera del Día */}
              <div 
                style={{ 
                    gridColumn: 1, 
                    gridRow: dayIndex + 2, // +1 for type header row
                    top: TYPE_HEADER_ROW_HEIGHT 
                }}
                className="sticky left-0 z-10 bg-muted p-2 text-xs font-medium text-center flex items-center justify-center border-r border-b border-border backdrop-blur-sm"
              >
                {format(day, "EEE, d MMM", { locale: es })}
              </div>
              {/* Render empty base cells for tracks */}
              {activityTypeHeaderSpans.reduce((acc, typeSpan) => acc + typeSpan.span, 0) > 0 && 
                Array.from({ length: activityTypeHeaderSpans.reduce((acc, typeSpan) => acc + typeSpan.span, 0) }).map((_, trackColIndex) => (
                <div
                  key={`cell-${format(day, 'yyyy-MM-dd')}-track-${trackColIndex}`}
                  style={{ 
                      gridColumn: trackColIndex + 2, 
                      gridRow: dayIndex + 2,
                  }}
                  className="bg-background border-r border-b border-border"
                />
              ))}
            </React.Fragment>
          ))}

         {/* Renderizar Bloques de Actividad */}
          {activityBlocksToRender.map((blockData) => {
            if (!blockData) return null;
            const { activity, gridRow, rowSpan, activityGridColumnStart, visuals, Icon } = blockData;

            return (
              <Tooltip key={`tooltip-${activity.id}-${(activity as ActivityBlockData).trackIndex}`}>
                <TooltipTrigger asChild>
                  <div
                    style={{
                      gridColumnStart: activityGridColumnStart,
                      gridRowStart: gridRow,
                      gridRowEnd: `span ${rowSpan}`,
                    }}
                    onClick={() => handleBlockClick(activity)}
                    className={cn(
                      "m-px p-1.5 flex flex-col items-start justify-start overflow-hidden shadow-md min-w-0 group cursor-pointer", 
                      visuals.bg, visuals.text, "rounded-md hover:ring-2 hover:ring-accent hover:z-10"
                    )}
                  >
                        <span className="font-semibold text-xs truncate w-full group-hover:whitespace-normal leading-tight">{activity.name}</span>
                        {(activity.startTime || (activity.type === 'Alojamiento' && (activity.startTime || activity.endTime))) && (
                          <span className="text-[10px] truncate w-full mt-0.5 opacity-90 flex items-center">
                            {activity.type === 'Alojamiento' ? (
                              <>
                                {activity.startTime && <LogIn size={12} className="inline mr-1 shrink-0 opacity-80" />}
                                {activity.startTime && `Check-in: ${activity.startTime}`}
                                {activity.startTime && activity.endTime && " / "}
                                {activity.endTime && <LogOut size={12} className="inline mr-1 shrink-0 opacity-80" />}
                                {activity.endTime && `Check-out: ${activity.endTime}`}
                              </>
                            ) : (
                              <>
                                <Clock size={12} className="inline mr-1 shrink-0 opacity-80" />
                                {activity.startTime}
                                {activity.endTime && ` - ${activity.endTime}`}
                              </>
                            )}
                          </span>
                        )}
                        {activity.location && (
                          <span className="text-[10px] truncate w-full mt-0.5 opacity-90 flex items-center">
                            <MapPin size={12} className="inline mr-1 shrink-0" />
                            {activity.location}
                          </span>
                        )}
                         {activity.cityRegion && !activity.location && (
                            <span className="text-[10px] truncate w-full mt-0.5 opacity-90 flex items-center">
                                <Building2 size={12} className="inline mr-1 shrink-0" />
                                {activity.cityRegion}
                            </span>
                        )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-background text-foreground border shadow-lg p-3 rounded-md max-w-xs z-50">
                  <p className="font-bold text-base mb-1 flex items-center">
                    <Icon size={16} className={cn("mr-2 shrink-0", visuals.text)} />
                    {activity.name} <span className="text-sm font-normal text-muted-foreground ml-1">({activity.type})</span>
                  </p>
                  <div className="text-xs space-y-1">
                    <p className="flex items-center"><CalendarDays size={14} className="mr-1.5" />
                       {format(parseISO(activity.startDate), "P", { locale: es })}
                       {activity.startTime && ` ${activity.startTime}`}
                       {' - '}
                       {format(parseISO(activity.endDate), "P", { locale: es })}
                       {activity.endTime && ` ${activity.endTime}`}
                    </p>
                    {activity.location && <p className="flex items-center"><Landmark size={14} className="mr-1.5"/>{activity.location}</p>}
                    {activity.cityRegion && <p className="flex items-center"><Building2 size={14} className="mr-1.5"/>{activity.cityRegion}</p>}
                    {activity.address && <p className="flex items-center"><MapPin size={14} className="mr-1.5"/>{activity.address}</p>}
                    {activity.notes && (
                      <div className="flex items-start">
                        <FileText size={14} className="mr-1.5 mt-0.5 shrink-0"/>
                        <span>Notas: <span className="italic whitespace-pre-wrap">{activity.notes}</span></span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Detail Dialog */}
      {selectedActivityForDialog && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center font-headline text-2xl">
                {(activityTypeVisuals[selectedActivityForDialog.type]?.icon || Info) && 
                  React.createElement(activityTypeVisuals[selectedActivityForDialog.type].icon, { className: cn("mr-2 h-6 w-6", activityTypeVisuals[selectedActivityForDialog.type].text) })}
                {selectedActivityForDialog.name}
              </DialogTitle>
              <DialogDescription>
                Detalles de: {selectedActivityForDialog.type}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <p className="flex items-center text-sm"><CalendarDays size={16} className="mr-2 text-primary shrink-0"/> Fechas: {format(parseISO(selectedActivityForDialog.startDate), "PPP", { locale: es })} - {format(parseISO(selectedActivityForDialog.endDate), "PPP", { locale: es })}</p>
              
              {selectedActivityForDialog.type === 'Alojamiento' ? (
                <>
                  {selectedActivityForDialog.startTime && <p className="flex items-center text-sm"><LogIn size={16} className="mr-2 text-primary shrink-0"/>Check-in: {selectedActivityForDialog.startTime}</p>}
                  {selectedActivityForDialog.endTime && <p className="flex items-center text-sm"><LogOut size={16} className="mr-2 text-primary shrink-0"/>Check-out: {selectedActivityForDialog.endTime}</p>}
                </>
              ) : (
                 (selectedActivityForDialog.startTime || selectedActivityForDialog.endTime) && (
                    <p className="flex items-center text-sm"><Clock size={16} className="mr-2 text-primary shrink-0"/>
                    Horario: {selectedActivityForDialog.startTime || "N/A"} - {selectedActivityForDialog.endTime || "N/A"}
                    </p>
                 )
              )}

              {selectedActivityForDialog.location && <p className="flex items-start text-sm"><Landmark size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Punto de Interés: {selectedActivityForDialog.location}</p>}
              {selectedActivityForDialog.cityRegion && <p className="flex items-start text-sm"><Building2 size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Ciudad/Región: {selectedActivityForDialog.cityRegion}</p>}
              {selectedActivityForDialog.address && <p className="flex items-start text-sm"><MapPin size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Dirección: {selectedActivityForDialog.address}</p>}
              
              {selectedActivityForDialog.type === 'Transporte' && (
                <>
                  {selectedActivityForDialog.transportationMode && <p className="flex items-start text-sm"><Info size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Medio: {selectedActivityForDialog.transportationMode}</p>}
                  {selectedActivityForDialog.gasolineBudget && selectedActivityForDialog.gasolineBudget > 0 && <p className="flex items-start text-sm"><DollarSign size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Presupuesto Gasolina: ${selectedActivityForDialog.gasolineBudget.toLocaleString()}</p>}
                  {selectedActivityForDialog.tollsBudget && selectedActivityForDialog.tollsBudget > 0 && <p className="flex items-start text-sm"><DollarSign size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Presupuesto Peajes: ${selectedActivityForDialog.tollsBudget.toLocaleString()}</p>}
                </>
              )}
              {selectedActivityForDialog.type === 'Comida' && selectedActivityForDialog.mealType && <p className="flex items-start text-sm"><Info size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Tipo de Comida: {selectedActivityForDialog.mealType}</p>}
              {selectedActivityForDialog.type === 'Comida' && selectedActivityForDialog.cuisineType && <p className="flex items-start text-sm"><Info size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Tipo de Cocina: {selectedActivityForDialog.cuisineType}</p>}
              {selectedActivityForDialog.type === 'Comida' && selectedActivityForDialog.dietaryNotes && <p className="flex items-start text-sm"><Info size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Notas Dietéticas: {selectedActivityForDialog.dietaryNotes}</p>}
              {selectedActivityForDialog.type === 'Actividad' && selectedActivityForDialog.activityCategory && <p className="flex items-start text-sm"><Info size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Categoría: {selectedActivityForDialog.activityCategory}</p>}
              {selectedActivityForDialog.type === 'Compras' && selectedActivityForDialog.shoppingCategory && <p className="flex items-start text-sm"><Info size={16} className="mr-2 text-primary shrink-0 mt-0.5"/>Categoría: {selectedActivityForDialog.shoppingCategory}</p>}

              {selectedActivityForDialog.budget !== undefined && selectedActivityForDialog.budget > 0 && <p className="flex items-center text-sm"><DollarSign size={16} className="mr-2 text-primary shrink-0"/>Presupuesto General: ${selectedActivityForDialog.budget.toLocaleString()}</p>}
              
              {selectedActivityForDialog.type === 'Alojamiento' && selectedActivityForDialog.reservationInfo && (
                <div className="text-sm space-y-1">
                    <div className="font-medium flex items-center">
                        <FileText size={16} className="mr-2 text-primary shrink-0"/>
                        Reserva:
                    </div>
                    <p className="pl-8 whitespace-pre-wrap text-muted-foreground">{selectedActivityForDialog.reservationInfo}</p>
                </div>
              )}
              {selectedActivityForDialog.notes && (
                <div className="text-sm space-y-1">
                    <div className="font-medium flex items-center">
                        <FileText size={16} className="mr-2 text-primary shrink-0"/>
                        Notas:
                    </div>
                    <p className="pl-8 italic whitespace-pre-wrap text-muted-foreground">{selectedActivityForDialog.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitleComponent>¿Estás seguro de eliminar "{selectedActivityForDialog.name}"?</AlertDialogTitleComponent>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteActivity} className="bg-destructive hover:bg-destructive/90">
                      Sí, eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" variant="outline" onClick={handleEditRequest}><Edit3 className="mr-2 h-4 w-4" />Editar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Activity Form Dialog */}
      {activityToEdit && activeTripData && (
        <Dialog open={isActivityFormOpen} onOpenChange={(isOpen) => {
            setIsActivityFormOpen(isOpen);
            if (!isOpen) setActivityToEdit(null); // Reset on close
        }}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Editar Actividad/Evento</DialogTitle>
            </DialogHeader>
            <ActivityForm
              activityTypes={activityTypesForForm}
              onSubmit={handleSaveActivityUpdate}
              initialData={activityToEdit}
              onCancel={() => { setIsActivityFormOpen(false); setActivityToEdit(null); }}
              tripStartDate={activeTripData.startDate}
              tripEndDate={activeTripData.endDate}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
