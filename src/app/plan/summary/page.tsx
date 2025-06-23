
"use client";

import { useTripData } from "@/hooks/use-trip-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Briefcase, CalendarDays, CheckSquare, MapPin, Plane, FileText, Edit3, PlusCircle, Landmark, Building2, Brain, Wand2, ArrowRight, Upload, RefreshCcw, Loader2, PiggyBank, Info, Clock, Users, ScrollText, FileDown } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { es } from 'date-fns/locale';
import Link from "next/link";
import Image from "next/image";
import { OptimizedRouteDisplay } from "@/components/planning/OptimizedRouteDisplay";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { optimizeFullTrip, type FullTripOptimizationOutput } from "@/ai/flows/full-trip-optimization";
import { generateTripImage } from "@/ai/flows/generate-trip-image-flow";
import { generateTripNarrative } from "@/ai/flows/generate-trip-narrative-flow";
import { useToast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";
import type { ActivityItem, ActivityType, FullTripData, PackingListItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";


// Componente para la plantilla imprimible del PDF
const PrintableSummary = React.forwardRef<HTMLDivElement, { 
    tripData: FullTripData; 
    budgetSummary: { totalBudget: number; budgetByCategory: Record<string, number>; };
    packingSummary: { packedItems: PackingListItem[]; unpackedItems: PackingListItem[]; totalItems: number; packedPercentage: number; };
    getActivitiesForDate: (date: string) => ActivityItem[];
}>(({ tripData, budgetSummary, packingSummary, getActivitiesForDate }, ref) => {
    
    const travelers = tripData.travelers;
    const totalTravelers = travelers ? (travelers.men || 0) + (travelers.women || 0) + (travelers.children || 0) + (travelers.seniors || 0) : 0;
    
    const travelersValue = totalTravelers > 0 ? (
      `${totalTravelers} (H:${travelers?.men || 0}, M:${travelers?.women || 0}, N:${travelers?.children || 0}, A:${travelers?.seniors || 0})`
    ) : "No especificado";
    
    const sortedItinerary = [...(tripData.itinerary || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div ref={ref} className="p-10 bg-white text-black font-sans w-[210mm]">
            <style>{`
                @media print {
                    .printable-section { page-break-inside: avoid; }
                    .printable-activity { page-break-inside: avoid; }
                }
            `}</style>
            <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
                <h1 className="text-4xl font-bold">{tripData.destination}</h1>
                <p className="text-lg text-gray-600">Resumen del Viaje</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8 text-sm printable-section">
                <div className="bg-gray-100 p-3 rounded-md">
                    <h3 className="font-bold text-gray-700">Fechas del Viaje</h3>
                    <p>{`${format(parseISO(tripData.startDate), "d MMM", { locale: es })} - ${format(parseISO(tripData.endDate), "d MMM yyyy", { locale: es })}`}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-md">
                    <h3 className="font-bold text-gray-700">Viajeros</h3>
                    <p>{travelersValue}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-md">
                    <h3 className="font-bold text-gray-700">Propósito</h3>
                    <p>{tripData.purpose || "No especificado"}</p>
                </div>
            </div>

            <div className="mb-8 printable-section">
                <h2 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-3">Resumen de Presupuesto</h2>
                {budgetSummary.totalBudget > 0 ? (
                    <div className="flex justify-between items-center text-xl font-bold bg-green-100 text-green-800 p-4 rounded-lg">
                        <span>Presupuesto Total Estimado:</span>
                        <span>${budgetSummary.totalBudget.toLocaleString()}</span>
                    </div>
                ) : <p className="text-gray-500">No se ha asignado presupuesto.</p>}
            </div>

            <div className="mb-8 printable-section">
                <h2 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-3">Lista de Empaque</h2>
                {packingSummary.totalItems > 0 ? (
                    <div>
                        <h3 className="font-bold text-lg mb-2">Por Empacar ({packingSummary.unpackedItems.length})</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {packingSummary.unpackedItems.map(item => <li key={item.id}>{item.name} (x{item.quantity}) - {item.priority}</li>)}
                        </ul>
                        <h3 className="font-bold text-lg mt-4 mb-2">Empacado ({packingSummary.packedItems.length})</h3>
                        <ul className="list-disc list-inside text-gray-500 line-through space-y-1">
                            {packingSummary.packedItems.map(item => <li key={item.id}>{item.name} (x{item.quantity})</li>)}
                        </ul>
                    </div>
                ) : <p className="text-gray-500">Lista de empaque vacía.</p>}
            </div>

            <div>
                <h2 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-3">Itinerario Detallado</h2>
                {sortedItinerary.map((dailyPlan, index) => {
                    const dayActivities = getActivitiesForDate(dailyPlan.date);
                    const sortedDayActivities = [...dayActivities].sort((a, b) => {
                      const aHasTime = !!a.startTime;
                      const bHasTime = !!b.startTime;
                      if (aHasTime && !bHasTime) return -1;
                      if (!aHasTime && bHasTime) return 1;
                      if (aHasTime && bHasTime) {
                          const timeComparison = a.startTime!.localeCompare(b.startTime!);
                          if (timeComparison !== 0) return timeComparison;
                      }
                      return a.name.localeCompare(b.name);
                    });
                    
                    return (
                        <div key={dailyPlan.date} className="mb-6 printable-section">
                            <h3 className="text-xl font-semibold bg-gray-200 p-3 rounded-md">
                                Día {index + 1}: {format(parseISO(dailyPlan.date), "EEEE, d 'de' MMMM", { locale: es })}
                            </h3>
                            <div className="pl-4 mt-3 space-y-3">
                                {sortedDayActivities.length > 0 ? sortedDayActivities.map(activity => (
                                    <div key={activity.id} className="border-l-2 border-blue-300 pl-4 py-2 printable-activity">
                                        <p className="font-bold">{activity.name} <span className="text-sm font-normal text-gray-600">({activity.type}{activity.mealType ? ` - ${activity.mealType}`: ''})</span></p>
                                        <div className="text-sm text-gray-700 space-y-1 mt-1">
                                            {activity.startTime && <p><strong>Horario:</strong> {activity.startTime}{activity.endTime && ` - ${activity.endTime}`}</p>}
                                            {activity.location && <p><strong>Lugar:</strong> {activity.location}</p>}
                                            {activity.cityRegion && <p><strong>Ciudad:</strong> {activity.cityRegion}</p>}
                                            {activity.address && <p><strong>Dirección:</strong> {activity.address}</p>}
                                            {activity.budget && activity.budget > 0 && <p><strong>Presupuesto:</strong> ${activity.budget.toLocaleString()}</p>}
                                            {activity.notes && <p><strong>Notas:</strong> {activity.notes}</p>}
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500">No hay actividades planificadas para este día.</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
PrintableSummary.displayName = 'PrintableSummary';


export default function SummaryPage() {
  const { activeTripData, isLoading, activeTripId, getActivitiesForDate, updateTripSummaryImage } = useTripData();
  const router = useRouter();
  const { toast } = useToast();

  const [isOptimizingFullTrip, setIsOptimizingFullTrip] = useState(false);
  const [fullTripOptimizationResult, setFullTripOptimizationResult] = useState<FullTripOptimizationOutput | null>(null);
  const [isOptimizationDetailsOpen, setIsOptimizationDetailsOpen] = useState(false);

  const [tripNarrative, setTripNarrative] = useState<string | null>(null);
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [isNarrativeDialogOpen, setIsNarrativeDialogOpen] = useState(false);

  const [displayImageUri, setDisplayImageUri] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const placeholderImage = "https://placehold.co/1200x400.png?text=Cargando+imagen...";
  
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (activeTripData) {
      if (activeTripData.summaryImageUri) {
        setDisplayImageUri(activeTripData.summaryImageUri);
        setIsGeneratingImage(false);
      } else if (activeTripData.destination && !isGeneratingImage && !displayImageUri) {
        const generateAndSetImage = async () => {
          setIsGeneratingImage(true);
          try {
            const result = await generateTripImage({ destination: activeTripData.destination });
            if (result.imageDataUri) {
              setDisplayImageUri(result.imageDataUri);
              await updateTripSummaryImage(result.imageDataUri);
            } else {
              setDisplayImageUri("https://placehold.co/1200x400.png?text=Error+AI");
            }
          } catch (error) {
            console.error("Error generating trip image:", error);
            toast({ title: "Error de Imagen", description: "No se pudo generar la imagen del viaje.", variant: "destructive" });
            setDisplayImageUri("https://placehold.co/1200x400.png?text=Error");
          } finally {
            setIsGeneratingImage(false);
          }
        };
        generateAndSetImage();
      } else if (!activeTripData.destination) {
         setDisplayImageUri("https://placehold.co/1200x400.png?text=Viaje");
         setIsGeneratingImage(false);
      }
    } else if (!isLoading) {
        setDisplayImageUri(null);
        setIsGeneratingImage(false);
    }
  }, [activeTripData, updateTripSummaryImage, toast, isGeneratingImage, displayImageUri, isLoading]);

  const budgetSummary = useMemo(() => {
    if (!activeTripData?.activities) {
      return { totalBudget: 0, budgetByCategory: {} };
    }

    const budgetByCategory = activeTripData.activities.reduce((acc, activity) => {
      // General budget for the activity
      if (activity.budget && activity.budget > 0) {
        const type = activity.type === 'Transporte' ? 'Transporte (General)' : activity.type;
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type] += activity.budget;
      }

      // Specific budgets for Transport
      if (activity.type === 'Transporte') {
          if (activity.gasolineBudget && activity.gasolineBudget > 0) {
              if (!acc['Gasolina']) acc['Gasolina'] = 0;
              acc['Gasolina'] += activity.gasolineBudget;
          }
          if (activity.tollsBudget && activity.tollsBudget > 0) {
              if (!acc['Peajes']) acc['Peajes'] = 0;
              acc['Peajes'] += activity.tollsBudget;
          }
      }
      return acc;
    }, {} as Record<ActivityType | 'Gasolina' | 'Peajes' | 'Transporte (General)', number>);

    const totalBudget = Object.values(budgetByCategory).reduce((sum, current) => sum + current, 0);

    return { totalBudget, budgetByCategory };
  }, [activeTripData?.activities]);
  
  const packingSummary = useMemo(() => {
    if (!activeTripData?.packingList) {
      return {
        packedItems: [],
        unpackedItems: [],
        totalItems: 0,
        packedPercentage: 0,
      };
    }
    const currentPackingList = activeTripData.packingList;
    const packedItems = currentPackingList.filter(item => item.packed);
    const unpackedItems = currentPackingList.filter(item => !item.packed);
    const totalItems = currentPackingList.length;
    const packedPercentage = totalItems > 0 ? (packedItems.length / totalItems) * 100 : 0;
    
    const priorityOrder: Record<PackingListItem['priority'], number> = {
      'Alta': 1,
      'Media': 2,
      'Baja': 3,
    };

    const sortedUnpackedItems = unpackedItems.sort((a, b) => {
        const priorityComparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityComparison !== 0) {
            return priorityComparison;
        }
        return a.name.localeCompare(b.name); // Secondary sort by name
    });
    
    const sortedPackedItems = packedItems.sort((a,b) => a.name.localeCompare(b.name));
    
    return {
      packedItems: sortedPackedItems,
      unpackedItems: sortedUnpackedItems,
      totalItems,
      packedPercentage,
    };
  }, [activeTripData?.packingList]);


  if (isLoading && !activeTripData) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <Card className="shadow-xl overflow-hidden">
          <Skeleton className="h-48 md:h-64 w-full" />
          <CardContent className="p-6">
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/2 mb-6" />
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
            <div className="flex gap-2 mb-6">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-48" />
            </div>
            <Separator className="my-6" />
             <Skeleton className="h-8 w-1/3 mb-3" />
             <Skeleton className="h-20 w-full" />
             <Separator className="my-6" />
             <Skeleton className="h-8 w-1/3 mb-3" />
             <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!activeTripData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Plane className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No hay un viaje activo.</h2>
        <p className="mb-4 text-muted-foreground">Por favor, crea o selecciona un viaje para ver el resumen.</p>
        <Button onClick={() => router.push('/plan/new')}>
           <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Viaje
        </Button>
      </div>
    );
  }
  
  const travelers = activeTripData.travelers;
  const totalTravelers = travelers ? (travelers.men || 0) + (travelers.women || 0) + (travelers.children || 0) + (travelers.seniors || 0) : 0;
  
  const travelersValue = totalTravelers > 0 ? (
    <span>
      {totalTravelers}
      <span className="text-xs font-normal text-muted-foreground ml-2">
        (H:{travelers?.men || 0}, M:{travelers?.women || 0}, N:{travelers?.children || 0}, A:{travelers?.seniors || 0})
      </span>
    </span>
  ) : "No especificado";


  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
          toast({ title: "Archivo Demasiado Grande", description: "Por favor, elige una imagen de menos de 2MB.", variant: "destructive"});
          return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        setDisplayImageUri(dataUri);
        await updateTripSummaryImage(dataUri);
        setIsUploading(false);
        toast({title: "Imagen Actualizada", description: "La imagen del viaje ha sido cambiada."})
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

  const handleRemoveCustomImage = async () => {
      if (activeTripData && activeTripData.destination) {
          setIsGeneratingImage(true);
          await updateTripSummaryImage(null);
          try {
              const result = await generateTripImage({ destination: activeTripData.destination });
              if (result.imageDataUri) {
                  setDisplayImageUri(result.imageDataUri);
                  await updateTripSummaryImage(result.imageDataUri);
              } else {
                  setDisplayImageUri("https://placehold.co/1200x400.png?text=Error+Restaurando");
              }
          } catch (error) {
              console.error("Error restoring AI image:", error);
              toast({ title: "Error de Imagen", description: "No se pudo restaurar la imagen generada por IA.", variant: "destructive" });
              setDisplayImageUri("https://placehold.co/1200x400.png?text=Error");
          } finally {
              setIsGeneratingImage(false);
              toast({title: "Imagen Restaurada", description: "Se ha generado una nueva imagen para el viaje."})
          }
      }
  };


  const handleFullTripOptimization = async () => {
    if (!activeTripData) return;
    setIsOptimizingFullTrip(true);
    setFullTripOptimizationResult(null);

    let fullItineraryText = `Itinerario para ${activeTripData.destination} (${format(parseISO(activeTripData.startDate), "PPP", { locale: es })} - ${format(parseISO(activeTripData.endDate), "PPP", { locale: es })}):\n\n`;

    (activeTripData.itinerary || []).forEach(dailyPlan => {
      fullItineraryText += `--- Día: ${format(parseISO(dailyPlan.date), "PPP", { locale: es })} ---\n`;
      if (dailyPlan.notes) {
        fullItineraryText += `  Notas del día: ${dailyPlan.notes}\n`;
      }

      const activitiesForDay: ActivityItem[] = getActivitiesForDate(dailyPlan.date);

      if (activitiesForDay.length > 0) {
        activitiesForDay.forEach(act => {
          let parts = [`- Tipo: ${act.type}`, `Nombre: ${act.name}`];
          if (act.startTime) parts.push(`Hora Inicio: ${act.startTime}`);
          if (act.endTime) parts.push(`Hora Fin: ${act.endTime}`);
          
          let locationInfo = [];
          if (act.type === 'Transporte') {
              if(act.originLocation) locationInfo.push(`Origen: ${act.originLocation}`);
              if(act.destinationLocation) locationInfo.push(`Destino: ${act.destinationLocation}`);
          } else {
            if (act.location) locationInfo.push(act.location);
            if (act.cityRegion) locationInfo.push(act.cityRegion);
            if (act.address) locationInfo.push(act.address);
          }
          if (locationInfo.length > 0) parts.push(`Ubicación: ${locationInfo.join(', ')}`);
          
          if (act.budget && act.budget > 0) parts.push(`Presupuesto General: ${act.budget}`);
          
          // Add type-specific details
          if (act.type === 'Transporte') {
            if (act.transportationMode) parts.push(`Modo: ${act.transportationMode}`);
            if (act.gasolineBudget && act.gasolineBudget > 0) parts.push(`Presupuesto Gasolina: ${act.gasolineBudget}`);
            if (act.tollsBudget && act.tollsBudget > 0) parts.push(`Presupuesto Peajes: ${act.tollsBudget}`);
          }
          if (act.type === 'Comida') {
            if (act.mealType) parts.push(`Tipo: ${act.mealType}`);
            if (act.cuisineType) parts.push(`Cocina: ${act.cuisineType}`);
          }
          if (act.type === 'Actividad' && act.activityCategory) parts.push(`Categoría: ${act.activityCategory}`);
          if (act.type === 'Compras' && act.shoppingCategory) parts.push(`Categoría: ${act.shoppingCategory}`);
          if (act.type === 'Alojamiento' && act.reservationInfo) parts.push(`Reserva: ${act.reservationInfo}`);
          
          if (act.notes) parts.push(`Notas: ${act.notes}`);
          fullItineraryText += `  ${parts.join('; ')}\n`;
        });
      } else {
        fullItineraryText += `  Sin actividades planificadas para este día.\n`;
      }
      fullItineraryText += "\n";
    });

    try {
      const result = await optimizeFullTrip({
        tripDestination: activeTripData.destination,
        tripStartDate: activeTripData.startDate,
        tripEndDate: activeTripData.endDate,
        fullItineraryDescription: fullItineraryText,
      });
      setFullTripOptimizationResult(result);
      setIsOptimizationDetailsOpen(true);
      toast({ title: "Optimización Global Completa", description: "Se han generado recomendaciones para tu viaje." });
    } catch (error) {
      console.error("Error optimizing full trip:", error);
      toast({ title: "Error de Optimización Global", description: "No se pudo optimizar el viaje completo.", variant: "destructive" });
    } finally {
      setIsOptimizingFullTrip(false);
    }
  };
  
  const handleGenerateNarrative = async () => {
    if (!activeTripData) return;
    setIsGeneratingNarrative(true);
    setTripNarrative(null);

    const travelers = activeTripData.travelers;
    const totalTravelers = travelers ? (travelers.men || 0) + (travelers.women || 0) + (travelers.children || 0) + (travelers.seniors || 0) : 0;
    
    let fullTripDetails = `Viaje a: ${activeTripData.destination}\n`;
    fullTripDetails += `Fechas: Desde ${format(parseISO(activeTripData.startDate), "PPP", { locale: es })} hasta ${format(parseISO(activeTripData.endDate), "PPP", { locale: es })}\n`;
    if (totalTravelers > 0) {
      fullTripDetails += `Participantes: ${totalTravelers} personas (Hombres: ${travelers?.men || 0}, Mujeres: ${travelers?.women || 0}, Niños: ${travelers?.children || 0}, Adultos Mayores: ${travelers?.seniors || 0})\n\n`;
    }
    fullTripDetails += `Propósito del viaje: ${activeTripData.purpose || 'No especificado'}\n\n`;

    (activeTripData.itinerary || []).forEach(dailyPlan => {
      fullTripDetails += `--- DÍA: ${format(parseISO(dailyPlan.date), "EEEE, d 'de' MMMM", { locale: es })} ---\n`;
      if (dailyPlan.notes) {
        fullTripDetails += `Notas generales del día: ${dailyPlan.notes}\n`;
      }

      const activitiesForDay: ActivityItem[] = getActivitiesForDate(dailyPlan.date);

      if (activitiesForDay.length > 0) {
        activitiesForDay.forEach(activity => {
          let activityDesc = `* ${activity.type}: ${activity.name}`;
          if (activity.type === 'Comida' && activity.mealType) {
            activityDesc = `* ${activity.mealType}: ${activity.name}`;
          }
          if (activity.location) activityDesc += ` en ${activity.location}`;
          if (activity.cityRegion) activityDesc += `, ${activity.cityRegion}`;
          if (activity.startTime) activityDesc += ` a las ${activity.startTime}`;
          if (activity.notes) activityDesc += ` (Notas: ${activity.notes})`;
          fullTripDetails += `${activityDesc}\n`;
        });
      } else {
        fullTripDetails += `Día libre o sin actividades planificadas.\n`;
      }
      fullTripDetails += "\n";
    });

    try {
      const result = await generateTripNarrative({ fullTripDetails });
      setTripNarrative(result.narrative);
      setIsNarrativeDialogOpen(true);
      toast({ title: "Narración Generada", description: "Tu historia de viaje está lista." });
    } catch (error) {
      console.error("Error generating trip narrative:", error);
      toast({ title: "Error de Narración", description: "No se pudo generar la narración del viaje.", variant: "destructive" });
    } finally {
      setIsGeneratingNarrative(false);
    }
  };
  
  const handleDownloadPdf = async () => {
    if (!printableRef.current) {
        toast({ title: "Error", description: "No se puede encontrar el contenido para imprimir.", variant: "destructive" });
        return;
    }
    setIsDownloadingPdf(true);

    try {
        const { default: jsPDF } = await import('jspdf');
        const { default: html2canvas } = await import('html2canvas');

        const canvas = await html2canvas(printableRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: printableRef.current.scrollWidth,
            windowHeight: printableRef.current.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgHeight = pdfWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
            position = -imgHeight + heightLeft;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }

        if (activeTripData) {
            pdf.save(`Resumen_Viaje_${activeTripData.destination.replace(/ /g, '_')}.pdf`);
        }
        toast({ title: "PDF Generado", description: "La descarga de tu resumen de viaje ha comenzado." });

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
            title: "Error al generar PDF",
            description: "No se pudo crear el archivo PDF. Inténtalo de nuevo.",
            variant: "destructive",
        });
    } finally {
        setIsDownloadingPdf(false);
    }
  };


  const currentItinerary = activeTripData.itinerary || [];
  const sortedItinerary = [...currentItinerary].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-xl overflow-hidden">
         <div className="relative h-48 md:h-64 w-full bg-muted">
            {isGeneratingImage && !displayImageUri ? (
                <Skeleton className="w-full h-full" />
            ) : (
                <Image
                    src={displayImageUri || placeholderImage}
                    alt={`Viaje a ${activeTripData.destination}`}
                    layout="fill"
                    objectFit="cover"
                    priority={!activeTripData.summaryImageUri}
                    key={displayImageUri}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                <h1 className="text-4xl md:text-5xl font-bold font-headline text-white shadow-lg">{activeTripData.destination}</h1>
                 <p className="text-lg text-gray-200 shadow-md">Resumen de tu Aventura</p>
            </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-2 mb-4 justify-between items-start">
            <div className="grid md:grid-cols-3 gap-x-4 gap-y-1 mb-2 text-center md:text-left">
                <InfoItem icon={<CalendarDays className="h-5 w-5 text-primary" />} label="Fechas" value={`${format(parseISO(activeTripData.startDate), "d MMM", { locale: es })} - ${format(parseISO(activeTripData.endDate), "d MMM yyyy", { locale: es })}`} />
                <InfoItem icon={<Users className="h-5 w-5 text-primary" />} label="Viajeros" value={travelersValue} />
                <InfoItem icon={<MapPin className="h-5 w-5 text-primary" />} label="Propósito" value={activeTripData.purpose || "No especificado"} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} />
                <Button onClick={handleUploadButtonClick} disabled={isUploading || isGeneratingImage} variant="outline" size="sm">
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Cambiar Imagen
                </Button>
                {activeTripData.summaryImageUri && (
                  <Button onClick={handleRemoveCustomImage} variant="outline" size="sm" disabled={isGeneratingImage || isUploading}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Restaurar (IA)
                  </Button>
                )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Link href={`/plan/new?edit=${activeTripId}`} passHref>
              <Button variant="outline" className="w-full sm:w-auto">
                <Edit3 className="mr-2 h-4 w-4" /> Modificar Detalles del Viaje
              </Button>
            </Link>
            <Button
                onClick={handleFullTripOptimization}
                disabled={isOptimizingFullTrip || (activeTripData.itinerary || []).length === 0}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
                <Brain className="mr-2 h-4 w-4" />
                {isOptimizingFullTrip ? "Optimizando..." : "Optimizar Viaje (IA)"}
            </Button>
            <Button
                onClick={handleGenerateNarrative}
                disabled={isGeneratingNarrative || (activeTripData.itinerary || []).length === 0}
                className="w-full sm:w-auto"
            >
                <ScrollText className="mr-2 h-4 w-4" />
                {isGeneratingNarrative ? "Generando Narración..." : "Generar Narración (IA)"}
            </Button>
            <Button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                variant="outline"
                className="w-full sm:w-auto"
            >
                {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Descargar PDF
            </Button>
          </div>

          <AlertDialog open={isOptimizationDetailsOpen} onOpenChange={setIsOptimizationDetailsOpen}>
            <AlertDialogContent className="max-w-2xl">
              <AlertDialogHeader>
                <AlertDialogTitleComponent className="flex items-center font-headline text-2xl">
                  <Wand2 className="mr-2 h-6 w-6 text-primary"/> Recomendaciones Globales del Viaje
                </AlertDialogTitleComponent>
                <AlertDialogDescription>
                  Sugerencias de la IA para optimizar tu aventura completa a {activeTripData.destination}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {fullTripOptimizationResult ? (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div>
                    <h4 className="font-semibold text-lg text-primary">Recomendaciones Generales:</h4>
                    <Textarea
                      value={fullTripOptimizationResult.globalRecommendations}
                      readOnly
                      className="mt-1 min-h-[150px] bg-muted/30"
                    />
                  </div>
                  {fullTripOptimizationResult.potentialIssues && (
                    <div>
                      <h4 className="font-semibold text-lg text-destructive">Posibles Inconvenientes:</h4>
                       <Textarea
                        value={fullTripOptimizationResult.potentialIssues}
                        readOnly
                        className="mt-1 min-h-[100px] bg-destructive/10 border-destructive/30"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p>No se han generado recomendaciones o hubo un error.</p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsOptimizationDetailsOpen(false)}>Cerrar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <AlertDialog open={isNarrativeDialogOpen} onOpenChange={setIsNarrativeDialogOpen}>
            <AlertDialogContent className="max-w-2xl">
              <AlertDialogHeader>
                <AlertDialogTitleComponent className="flex items-center font-headline text-2xl">
                  <ScrollText className="mr-2 h-6 w-6 text-primary"/> La Historia de tu Viaje
                </AlertDialogTitleComponent>
                <AlertDialogDescription>
                  Una narración de tu aventura a {activeTripData.destination}, generada por IA.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {isGeneratingNarrative ? (
                  <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : tripNarrative ? (
                  <div className="max-h-[60vh] overflow-y-auto pr-2">
                      <Textarea
                          value={tripNarrative}
                          readOnly
                          className="mt-1 min-h-[300px] bg-muted/30 whitespace-pre-wrap"
                      />
                  </div>
              ) : (
                  <p>No se ha generado la narración o hubo un error.</p>
              )}
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsNarrativeDialogOpen(false)}>Cerrar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>


          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-headline mb-4 flex items-center"><Briefcase className="mr-2 h-6 w-6 text-primary" />Lista de Empaque</h2>
            {packingSummary.totalItems > 0 ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1 text-sm text-muted-foreground">
                    <span>Progreso</span>
                    <span>{packingSummary.packedItems.length} / {packingSummary.totalItems} empacado(s)</span>
                  </div>
                  <Progress value={packingSummary.packedPercentage} className="w-full h-2" />
                </div>

                {packingSummary.unpackedItems.length > 0 && (
                  <Card className="bg-muted/30">
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg font-headline">Por Empacar</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <ul className="space-y-2">
                        {packingSummary.unpackedItems.map(item => (
                          <li key={item.id} className="text-sm flex items-center justify-between p-2 rounded-md bg-background">
                            <div className="flex items-center">
                              <CheckSquare className="inline mr-3 h-4 w-4 text-muted-foreground opacity-50" />
                              {item.name} <span className="text-xs text-muted-foreground ml-2">(x{item.quantity})</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{item.priority}</Badge>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {packingSummary.packedItems.length > 0 && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="packed-items" className="border rounded-lg bg-card">
                      <AccordionTrigger className="text-lg font-semibold hover:no-underline p-4">
                        <div className="flex items-center">
                           <span>Artículos Empacados</span>
                           <Badge variant="secondary" className="ml-3">{packingSummary.packedItems.length}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <ul className="space-y-2">
                          {packingSummary.packedItems.map(item => (
                            <li key={item.id} className="text-sm flex items-center justify-between p-2 rounded-md bg-background text-muted-foreground line-through">
                              <div className="flex items-center">
                                <CheckSquare className="inline mr-3 h-4 w-4 text-green-500" />
                                 {item.name} <span className="text-xs ml-2">(x{item.quantity})</span>
                              </div>
                               <Badge variant="outline" className="text-xs">{item.priority}</Badge>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

              </div>
            ) : (
              <p className="text-muted-foreground">Tu lista de empaque está vacía.</p>
            )}
             <Link href="/plan/packing-list" passHref>
              <Button variant="link" className="mt-4 p-0 h-auto text-primary items-center">
                Ver/Editar Lista de Empaque <ArrowRight className="ml-1 h-3 w-3"/>
              </Button>
            </Link>
          </section>

          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-headline mb-4 flex items-center">
              <PiggyBank className="mr-2 h-6 w-6 text-primary" />
              Resumen de Presupuesto
            </h2>
            {budgetSummary.totalBudget > 0 ? (
              <div className="space-y-4">
                <Card className="bg-primary/5 border-primary/20 shadow-md">
                  <CardHeader className="p-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-headline">
                      Presupuesto Total Estimado
                    </CardTitle>
                    <span className="text-2xl font-bold text-primary">${budgetSummary.totalBudget.toLocaleString()}</span>
                  </CardHeader>
                </Card>
                <div>
                  <h3 className="text-md font-semibold mb-2 mt-4 text-muted-foreground">Desglose por Categoría:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(budgetSummary.budgetByCategory)
                      .sort(([catA], [catB]) => catA.localeCompare(catB))
                      .map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center text-sm p-3 rounded-lg bg-background border">
                        <span className="font-medium text-muted-foreground">{category}</span>
                        <span className="font-semibold text-foreground">${(amount as number).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No se ha asignado presupuesto a ninguna actividad.</p>
            )}
          </section>

          <Separator className="my-6" />

          <section>
            <h2 className="text-2xl font-semibold font-headline mb-4 flex items-center"><CalendarDays className="mr-2 h-6 w-6 text-primary" />Itinerario Detallado</h2>
            {sortedItinerary.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {sortedItinerary.map((dailyPlan, index) => {
                  const dayActivities: ActivityItem[] = getActivitiesForDate(dailyPlan.date);
                  const dayImageSrc = dailyPlan.dayImageUri || `https://placehold.co/64x64.png?text=Día+${index + 1}`;
                  return (
                    <AccordionItem key={dailyPlan.date} value={`day-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                           <Image
                              src={dayImageSrc}
                              alt={`Imagen del Día ${index + 1}`}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                              data-ai-hint="itinerary day small"
                              key={dayImageSrc}
                            />
                          <span className="text-lg font-medium font-headline">
                            Día {index + 1}: {format(parseISO(dailyPlan.date), "EEEE, d 'de' MMMM", { locale: es })}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-4 border-l-2 border-primary/30 ml-5">
                        {dailyPlan.notes && (
                          <p className="text-sm italic text-muted-foreground mb-3 border border-dashed p-2 rounded-md">
                            <FileText className="inline mr-1 h-4 w-4" />Notas del día: {dailyPlan.notes}
                          </p>
                        )}
                        {dayActivities.length > 0 ? (
                          <ul className="space-y-3">
                            {dayActivities.map(activity => (
                              <li key={activity.id} className="text-sm p-3 bg-muted/40 rounded-md shadow-sm">
                                <div className="font-semibold text-base">{activity.name} <span className="text-xs font-normal text-muted-foreground">({activity.type})</span></div>
                                <div className="space-y-1 mt-1 text-muted-foreground">
                                    {activity.startTime && <div className="text-xs flex items-center"><Clock size={14} className="mr-1.5"/> Horario: {activity.startTime}{activity.endTime && ` - ${activity.endTime}`}</div>}
                                    {activity.location && <div className="text-xs flex items-center"><Landmark size={14} className="mr-1.5"/> {activity.location}</div>}
                                    {activity.cityRegion && <div className="text-xs flex items-center"><Building2 size={14} className="mr-1.5"/> {activity.cityRegion}</div>}
                                    {activity.address && <div className="text-xs flex items-center"><MapPin size={14} className="mr-1.5"/> {activity.address}</div>}
                                    {activity.type === 'Comida' && activity.mealType && <div className="text-xs flex items-center"><Info size={14} className="mr-1.5"/> Tipo: {activity.mealType}</div>}
                                    {activity.cuisineType && <div className="text-xs flex items-center"><Info size={14} className="mr-1.5"/> Cocina: {activity.cuisineType}</div>}
                                    {activity.dietaryNotes && <div className="text-xs flex items-center"><Info size={14} className="mr-1.5"/> Dietético: {activity.dietaryNotes}</div>}
                                    {activity.activityCategory && <div className="text-xs flex items-center"><Info size={14} className="mr-1.5"/> Categoría: {activity.activityCategory}</div>}
                                    {activity.shoppingCategory && <div className="text-xs flex items-center"><Info size={14} className="mr-1.5"/> Categoría: {activity.shoppingCategory}</div>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground text-sm">No hay actividades planificadas para este día.</p>
                        )}
                        {dailyPlan.optimizedRoute && (
                          <div className="mt-4">
                             <OptimizedRouteDisplay
                              optimizedRoute={dailyPlan.optimizedRoute}
                              estimatedTimeSavings={dailyPlan.estimatedTimeSavings}
                              estimatedCostSavings={dailyPlan.estimatedCostSavings}
                            />
                          </div>
                        )}
                         <Link href={`/plan/itinerary/${dailyPlan.date}`} passHref>
                          <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-primary items-center">
                            Ver/Editar Día Completo <ArrowRight className="ml-1 h-3 w-3"/>
                          </Button>
                        </Link>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <p className="text-muted-foreground">El itinerario está vacío.</p>
            )}
          </section>
        </CardContent>
      </Card>
      
      {/* Hidden component for PDF generation */}
      <div className="fixed -left-[9999px] top-auto h-auto w-auto opacity-0" aria-hidden="true">
        <PrintableSummary 
            ref={printableRef}
            tripData={activeTripData}
            budgetSummary={budgetSummary}
            packingSummary={packingSummary}
            getActivitiesForDate={getActivitiesForDate}
        />
      </div>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex flex-col items-center md:items-start p-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}


