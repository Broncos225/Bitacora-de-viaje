
"use client";

import { useTripData } from "@/hooks/use-trip-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Briefcase, CalendarDays, CheckSquare, MapPin, Plane, FileText, Edit3, PlusCircle, Landmark, Building2, Brain, Wand2, ArrowRight, Upload, RefreshCcw, Loader2 } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { es } from 'date-fns/locale';
import Link from "next/link";
import Image from "next/image";
import { OptimizedRouteDisplay } from "@/components/planning/OptimizedRouteDisplay";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { optimizeFullTrip, type FullTripOptimizationOutput } from "@/ai/flows/full-trip-optimization";
import { generateTripImage } from "@/ai/flows/generate-trip-image-flow";
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
import type { ActivityItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";


export default function SummaryPage() {
  const { activeTripData, isLoading, activeTripId, getActivitiesForDate, updateTripSummaryImage } = useTripData();
  const router = useRouter();
  const { toast } = useToast();

  const [isOptimizingFullTrip, setIsOptimizingFullTrip] = useState(false);
  const [fullTripOptimizationResult, setFullTripOptimizationResult] = useState<FullTripOptimizationOutput | null>(null);
  const [isOptimizationDetailsOpen, setIsOptimizationDetailsOpen] = useState(false);

  const [displayImageUri, setDisplayImageUri] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const placeholderImage = "https://placehold.co/1200x400.png?text=Cargando+imagen...";

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
      fullItineraryText += `Día: ${format(parseISO(dailyPlan.date), "PPP", { locale: es })}\n`;
      if (dailyPlan.notes) {
        fullItineraryText += `  Notas del día: ${dailyPlan.notes}\n`;
      }

      const activitiesForDay: ActivityItem[] = getActivitiesForDate(dailyPlan.date);

      if (activitiesForDay.length > 0) {
        fullItineraryText += `  Actividades:\n`;
        activitiesForDay.forEach(activity => {
          let activityDesc = `    - ${activity.type}: ${activity.name}`;
          if (activity.location) activityDesc += ` en ${activity.location}`;
          if (activity.cityRegion) activityDesc += `, ${activity.cityRegion}`;
          if (activity.address) activityDesc += ` (Dirección: ${activity.address})`;
          if (activity.startTime) activityDesc += ` de ${activity.startTime}`;
          if (activity.endTime) activityDesc += ` a ${activity.endTime}`;
          if (activity.budget) activityDesc += ` (Presupuesto: ${activity.budget})`;
          if (activity.notes) activityDesc += ` - Notas Adicionales: ${activity.notes}`;
          if (activity.reservationInfo) activityDesc += ` - Reserva: ${activity.reservationInfo}`;
          fullItineraryText += `${activityDesc}\n`;
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

  const currentPackingList = activeTripData.packingList || [];
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

          <div className="flex flex-col sm:flex-row gap-2 mb-6">
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
                {isOptimizingFullTrip ? "Optimizando Viaje Completo..." : "Optimizar Viaje Completo (IA)"}
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


          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className="text-2xl font-semibold font-headline mb-3 flex items-center"><Briefcase className="mr-2 h-6 w-6 text-primary" />Lista de Empaque</h2>
            {currentPackingList.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 pl-2 columns-1 sm:columns-2 md:columns-3">
                {currentPackingList.map(item => (
                  <li key={item.id} className="text-sm">
                    {item.packed ? <CheckSquare className="inline mr-1 h-4 w-4 text-green-500" /> : <CheckSquare className="inline mr-1 h-4 w-4 text-muted-foreground opacity-50" />}
                    {item.name} (x{item.quantity}) - <span className="text-xs italic">{item.priority}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Tu lista de empaque está vacía.</p>
            )}
             <Link href="/plan/packing-list" passHref>
              <Button variant="link" className="mt-2 p-0 h-auto text-primary items-center">
                Ver/Editar Lista de Empaque <ArrowRight className="ml-1 h-3 w-3"/>
              </Button>
            </Link>
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
                                {activity.startTime && <div className="text-xs text-muted-foreground">Horario: {activity.startTime}{activity.endTime && ` - ${activity.endTime}`}</div>}
                                {activity.location && <div className="text-xs mt-1 flex items-center"><Landmark size={14} className="mr-1.5"/> {activity.location}</div>}
                                {activity.cityRegion && <div className="text-xs mt-1 flex items-center"><Building2 size={14} className="mr-1.5"/> {activity.cityRegion}</div>}
                                {activity.address && <div className="text-xs mt-1 flex items-center"><MapPin size={14} className="mr-1.5"/> {activity.address}</div>}
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
    </div>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
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
