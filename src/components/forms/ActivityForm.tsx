
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActivityItem, ActivityType, TransportationMode, MealType } from "@/lib/types";
import { Utensils, ShoppingCart, Car, Puzzle, Save, X, CalendarIcon, BedDouble, MapPinIcon, Pin, PinOff, LocateFixed, Loader2, ClipboardPaste } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { es } from 'date-fns/locale';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// !!! IMPORTANTE: Mueve esta API Key a una variable de entorno en producción !!!
const GEOCODE_API_KEY = "685493c04da47469635928gol67d3c2";

const activitySchemaBase = z.object({
  type: z.enum(['Actividad', 'Comida', 'Compras', 'Transporte', 'Alojamiento'], {
    required_error: "El tipo de actividad es requerido.",
  }),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  startDate: z.date({ required_error: "La fecha de inicio es requerida." }),
  endDate: z.date({ required_error: "La fecha de fin es requerida." }),
  
  reservationInfo: z.string().optional(),
  budget: z.coerce.number().nonnegative("El presupuesto no puede ser negativo.").optional().default(0),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),

  location: z.string().optional(),
  cityRegion: z.string().optional(),
  address: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),

  originLocation: z.string().optional(),
  originCityRegion: z.string().optional(),
  originAddress: z.string().optional(),
  originLatitude: z.coerce.number().optional(),
  originLongitude: z.coerce.number().optional(),

  destinationLocation: z.string().optional(),
  destinationCityRegion: z.string().optional(),
  destinationAddress: z.string().optional(),
  destinationLatitude: z.coerce.number().optional(),
  destinationLongitude: z.coerce.number().optional(),

  // New specific fields
  mealType: z.enum(['Desayuno', 'Almuerzo', 'Comida', 'Mecato', 'Otro']).optional(),
  cuisineType: z.string().optional(),
  dietaryNotes: z.string().optional(),
  activityCategory: z.string().optional(),
  shoppingCategory: z.string().optional(),
  transportationMode: z.enum(['Carro', 'Autobús', 'Avión', 'Tren', 'Barco', 'A pie', 'Otro']).optional(),
  gasolineBudget: z.coerce.number().nonnegative("El presupuesto no puede ser negativo.").optional().default(0),
  tollsBudget: z.coerce.number().nonnegative("El presupuesto no puede ser negativo.").optional().default(0),
});

const activitySchema = activitySchemaBase.refine(data => data.endDate >= data.startDate, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
  path: ["endDate"],
}).refine(data => {
  if (data.type === 'Transporte') return true;
  return (data.latitude === undefined && data.longitude === undefined) || (data.latitude !== undefined && data.longitude !== undefined);
}, {
  message: "Si se proporciona latitud (general), también se debe proporcionar longitud (general), y viceversa.",
  path: ["latitude"],
}).refine(data => {
  if (data.type !== 'Transporte') return true;
  return (data.originLatitude === undefined && data.originLongitude === undefined) || (data.originLatitude !== undefined && data.originLongitude !== undefined);
}, {
  message: "Si se proporciona latitud de origen, también se debe proporcionar longitud de origen, y viceversa.",
  path: ["originLatitude"],
}).refine(data => {
  if (data.type !== 'Transporte') return true;
  return (data.destinationLatitude === undefined && data.destinationLongitude === undefined) || (data.destinationLatitude !== undefined && data.destinationLongitude !== undefined);
}, {
  message: "Si se proporciona latitud de destino, también se debe proporcionar longitud de destino, y viceversa.",
  path: ["destinationLatitude"],
});


interface ActivityFormProps {
  activityTypes: ActivityType[];
  onSubmit: (data: ActivityItem) => void;
  initialData?: ActivityItem | null;
  onCancel: () => void;
  tripStartDate?: string; 
  tripEndDate?: string;   
}

const activityIcons: Record<ActivityType, React.ElementType> = {
  'Actividad': Puzzle,
  'Comida': Utensils,
  'Compras': ShoppingCart,
  'Transporte': Car,
  'Alojamiento': BedDouble,
};

const transportationModes: TransportationMode[] = ['Carro', 'Autobús', 'Avión', 'Tren', 'Barco', 'A pie', 'Otro'];
const mealTypes: MealType[] = ['Desayuno', 'Almuerzo', 'Comida', 'Mecato', 'Otro'];

export function ActivityForm({ 
    activityTypes, 
    onSubmit, 
    initialData, 
    onCancel,
    tripStartDate,
    tripEndDate 
}: ActivityFormProps) {
  
  const parsedTripStartDate = tripStartDate ? parseISO(tripStartDate) : new Date(0); 
  const parsedTripEndDate = tripEndDate ? parseISO(tripEndDate) : addDays(new Date(), 365*5); 
  const { toast } = useToast();

  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [isGeocodingOrigin, setIsGeocodingOrigin] = useState(false);
  const [isGeocodingDestination, setIsGeocodingDestination] = useState(false);
  
  const [isPastingLocation, setIsPastingLocation] = useState(false);
  const [isPastingOrigin, setIsPastingOrigin] = useState(false);
  const [isPastingDestination, setIsPastingDestination] = useState(false);


  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: initialData ? {
      ...initialData,
      startDate: parseISO(initialData.startDate),
      endDate: parseISO(initialData.endDate),
      budget: initialData.budget !== undefined && initialData.budget !== null ? initialData.budget : 0,
      location: initialData.location || "",
      cityRegion: initialData.cityRegion || "",
      address: initialData.address || "",
      latitude: initialData.latitude,
      longitude: initialData.longitude,
      originLocation: initialData.originLocation || "",
      originCityRegion: initialData.originCityRegion || "",
      originAddress: initialData.originAddress || "",
      originLatitude: initialData.originLatitude,
      originLongitude: initialData.originLongitude,
      destinationLocation: initialData.destinationLocation || "",
      destinationCityRegion: initialData.destinationCityRegion || "",
      destinationAddress: initialData.destinationAddress || "",
      destinationLatitude: initialData.destinationLatitude,
      destinationLongitude: initialData.destinationLongitude,
      mealType: initialData.mealType || undefined,
      cuisineType: initialData.cuisineType || "",
      dietaryNotes: initialData.dietaryNotes || "",
      activityCategory: initialData.activityCategory || "",
      shoppingCategory: initialData.shoppingCategory || "",
      transportationMode: initialData.transportationMode || undefined,
      gasolineBudget: initialData.gasolineBudget ?? 0,
      tollsBudget: initialData.tollsBudget ?? 0,
    } : {
      type: 'Actividad', 
      name: "",
      startDate: tripStartDate ? parseISO(tripStartDate) : new Date(),
      endDate: tripStartDate ? parseISO(tripStartDate) : new Date(),
      location: "", cityRegion: "", address: "", latitude: undefined, longitude: undefined,
      originLocation: "", originCityRegion: "", originAddress: "", originLatitude: undefined, originLongitude: undefined,
      destinationLocation: "", destinationCityRegion: "", destinationAddress: "", destinationLatitude: undefined, destinationLongitude: undefined,
      reservationInfo: "", budget: 0, startTime: "", endTime: "", notes: "",
      mealType: undefined,
      cuisineType: "", dietaryNotes: "", activityCategory: "", shoppingCategory: "", transportationMode: undefined,
      gasolineBudget: 0,
      tollsBudget: 0,
    },
  });

  const currentActivityType = useWatch({
    control: form.control,
    name: "type",
    defaultValue: initialData?.type || 'Actividad'
  });
  
  const isAccommodationType = currentActivityType === 'Alojamiento';
  const isTransportType = currentActivityType === 'Transporte';
  
  const handlePasteCoordinates = async (type: 'location' | 'origin' | 'destination') => {
    let latField: "latitude" | "originLatitude" | "destinationLatitude" = "latitude";
    let lonField: "longitude" | "originLongitude" | "destinationLongitude" = "longitude";
    let setLoadingState: React.Dispatch<React.SetStateAction<boolean>>;

    if (type === 'location') {
      latField = "latitude";
      lonField = "longitude";
      setLoadingState = setIsPastingLocation;
    } else if (type === 'origin') {
      latField = "originLatitude";
      lonField = "originLongitude";
      setLoadingState = setIsPastingOrigin;
    } else { // destination
      latField = "destinationLatitude";
      lonField = "destinationLongitude";
      setLoadingState = setIsPastingDestination;
    }

    setLoadingState(true);
    try {
      const text = await navigator.clipboard.readText();
      const parts = text.split(',');
      if (parts.length !== 2) {
        throw new Error("El formato esperado es 'latitud, longitud'.");
      }
      const lat = parseFloat(parts[0].trim());
      const lon = parseFloat(parts[1].trim());

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Las coordenadas no son números válidos.");
      }

      form.setValue(latField, lat, { shouldValidate: true });
      form.setValue(lonField, lon, { shouldValidate: true });
      toast({ title: "Coordenadas Pegadas", description: `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)} actualizadas.` });

    } catch (error) {
      console.error("Error al pegar coordenadas:", error);
      let message = "No se pudo leer el portapapeles. Asegúrate de haber otorgado permiso.";
      if (error instanceof Error) {
          message = error.message;
      }
      toast({ title: "Error al Pegar", description: message, variant: "destructive" });
    } finally {
      setLoadingState(false);
    }
  };

  const handleGeocode = async (type: 'location' | 'origin' | 'destination') => {
    let queryParts: string[] = [];
    let locationField = "";
    let addressField = "";
    let cityRegionField = "";
    let latField: "latitude" | "originLatitude" | "destinationLatitude" = "latitude";
    let lonField: "longitude" | "originLongitude" | "destinationLongitude" = "longitude";
    let setLoadingState: React.Dispatch<React.SetStateAction<boolean>> = setIsGeocodingLocation;

    if (type === 'location') {
      locationField = form.getValues("location") || "";
      addressField = form.getValues("address") || "";
      cityRegionField = form.getValues("cityRegion") || "";
      latField = "latitude";
      lonField = "longitude";
      setLoadingState = setIsGeocodingLocation;
    } else if (type === 'origin') {
      locationField = form.getValues("originLocation") || "";
      addressField = form.getValues("originAddress") || "";
      cityRegionField = form.getValues("originCityRegion") || "";
      latField = "originLatitude";
      lonField = "originLongitude";
      setLoadingState = setIsGeocodingOrigin;
    } else { // destination
      locationField = form.getValues("destinationLocation") || "";
      addressField = form.getValues("destinationAddress") || "";
      cityRegionField = form.getValues("destinationCityRegion") || "";
      latField = "destinationLatitude";
      lonField = "destinationLongitude";
      setLoadingState = setIsGeocodingDestination;
    }

    if (locationField) queryParts.push(locationField);
    if (addressField) queryParts.push(addressField);
    if (cityRegionField) queryParts.push(cityRegionField);

    const queryString = queryParts.join(", ").trim();

    if (!queryString) {
      toast({ title: "Información Insuficiente", description: "Por favor, ingresa un nombre de lugar, dirección o ciudad.", variant: "destructive" });
      return;
    }

    setLoadingState(true);
    try {
      const response = await fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(queryString)}&api_key=${GEOCODE_API_KEY}`);
      if (!response.ok) {
        throw new Error(`Error de red: ${response.statusText}`);
      }
      const data = await response.json();

      if (data && data.length > 0) {
        const firstResult = data[0];
        const lat = parseFloat(firstResult.lat);
        const lon = parseFloat(firstResult.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          form.setValue(latField, lat);
          form.setValue(lonField, lon);
          toast({ title: "Coordenadas Encontradas", description: `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)} actualizadas.` });
        } else {
          throw new Error("Coordenadas inválidas recibidas.");
        }
      } else {
        toast({ title: "Sin Resultados", description: "No se encontraron coordenadas para la ubicación proporcionada.", variant: "destructive" });
        form.setValue(latField, undefined);
        form.setValue(lonField, undefined);
      }
    } catch (error) {
      console.error("Error de geocodificación:", error);
      toast({ title: "Error de Geocodificación", description: (error as Error).message || "No se pudo obtener las coordenadas.", variant: "destructive" });
      form.setValue(latField, undefined);
      form.setValue(lonField, undefined);
    } finally {
      setLoadingState(false);
    }
  };


  function handleSubmit(values: z.infer<typeof activitySchema>) {
    const activityData: ActivityItem = {
      id: initialData?.id || `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: values.type as ActivityType, 
      name: values.name,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      endDate: format(values.endDate, "yyyy-MM-dd"),
      
      location: values.location || undefined,
      cityRegion: values.cityRegion || undefined,
      address: values.address || undefined,
      latitude: values.latitude,
      longitude: values.longitude,

      originLocation: values.originLocation || undefined,
      originCityRegion: values.originCityRegion || undefined,
      originAddress: values.originAddress || undefined,
      originLatitude: values.originLatitude,
      originLongitude: values.originLongitude,

      destinationLocation: values.destinationLocation || undefined,
      destinationCityRegion: values.destinationCityRegion || undefined,
      destinationAddress: values.destinationAddress || undefined,
      destinationLatitude: values.destinationLatitude,
      destinationLongitude: values.destinationLongitude,
      
      reservationInfo: values.reservationInfo || undefined,
      budget: (typeof values.budget === 'number' && !isNaN(values.budget)) ? values.budget : undefined,
      startTime: values.startTime || "",
      endTime: values.endTime || "",
      notes: values.notes || "",
      
      // New specific fields
      mealType: values.mealType || undefined,
      cuisineType: values.cuisineType || undefined,
      dietaryNotes: values.dietaryNotes || undefined,
      activityCategory: values.activityCategory || undefined,
      shoppingCategory: values.shoppingCategory || undefined,
      transportationMode: values.transportationMode || undefined,
      gasolineBudget: (typeof values.gasolineBudget === 'number' && !isNaN(values.gasolineBudget)) ? values.gasolineBudget : undefined,
      tollsBudget: (typeof values.tollsBudget === 'number' && !isNaN(values.tollsBudget)) ? values.tollsBudget : undefined,
    };
    
    onSubmit(activityData);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activityTypes.map(type => {
                    const Icon = activityIcons[type];
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                          {type}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Evento/Actividad</FormLabel>
              <FormControl>
                <Input placeholder={isAccommodationType ? "Ej: Hotel Paraíso Central" : "Ej: Visita al Museo, Cena en Restaurante"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Inicio</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => 
                        (tripStartDate && isBefore(date, parsedTripStartDate)) || 
                        (tripEndDate && isBefore(parsedTripEndDate, date)) 
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Fin</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => 
                        isBefore(date, form.getValues("startDate") || parsedTripStartDate) || 
                        (tripEndDate && isBefore(parsedTripEndDate, date))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isAccommodationType ? "Hora Check-in / Inicio" : "Hora de Inicio"} (Opcional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormDescription>
                  {isAccommodationType 
                    ? "Hora de entrada al alojamiento, si aplica."
                    : "Si la actividad tiene una hora específica."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isAccommodationType ? "Hora Check-out / Fin" : "Hora de Fin"} (Opcional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                 <FormDescription>
                  {isAccommodationType 
                    ? "Hora de salida del alojamiento, si aplica."
                    : "Si la actividad tiene hora de finalización."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* --- START: TYPE-SPECIFIC FIELDS --- */}
        {currentActivityType === 'Transporte' && (
             <div className="space-y-4 pt-4 border-t mt-4">
                <h3 className="text-md font-medium text-primary">Detalles de Transporte</h3>
                 <FormField
                    control={form.control}
                    name="transportationMode"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Medio de Transporte (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecciona un medio" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {transportationModes.map(mode => (
                                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="gasolineBudget"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Presupuesto Gasolina</FormLabel>
                            <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Ej: 150" 
                                  {...field}
                                  onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                  value={field.value === undefined ? '' : String(field.value)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tollsBudget"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Presupuesto Peajes</FormLabel>
                            <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Ej: 50" 
                                  {...field}
                                  onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                  value={field.value === undefined ? '' : String(field.value)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>
        )}

        {currentActivityType === 'Comida' && (
            <div className="space-y-4 pt-4 border-t mt-4">
                <h3 className="text-md font-medium text-primary">Detalles de Comida</h3>
                <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Comida (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {mealTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="cuisineType"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Cocina (Opcional)</FormLabel>
                            <FormControl><Input placeholder="Ej: Italiana, Local, Fusión" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="dietaryNotes"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas Dietéticas (Opcional)</FormLabel>
                            <FormControl><Input placeholder="Ej: Vegetariano, sin gluten" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>
        )}

        {currentActivityType === 'Actividad' && (
            <div className="space-y-4 pt-4 border-t mt-4">
                <h3 className="text-md font-medium text-primary">Detalles de Actividad</h3>
                <FormField
                    control={form.control}
                    name="activityCategory"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Categoría de Actividad (Opcional)</FormLabel>
                        <FormControl><Input placeholder="Ej: Cultural, Aventura, Relajación" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        )}

        {currentActivityType === 'Compras' && (
            <div className="space-y-4 pt-4 border-t mt-4">
                <h3 className="text-md font-medium text-primary">Detalles de Compras</h3>
                <FormField
                    control={form.control}
                    name="shoppingCategory"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Categoría de Compras (Opcional)</FormLabel>
                        <FormControl><Input placeholder="Ej: Souvenirs, Ropa, Artesanías" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        )}
        {/* --- END: TYPE-SPECIFIC FIELDS --- */}

        {!isTransportType && (
          <div className="space-y-6 pt-4 border-t mt-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary flex items-center"><MapPinIcon className="mr-2 h-5 w-5" />Ubicación General</h3>
                <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => handlePasteCoordinates('location')} disabled={isPastingLocation}>
                        {isPastingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4" />}
                        Pegar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleGeocode('location')} disabled={isGeocodingLocation}>
                      {isGeocodingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                      Buscar
                    </Button>
                </div>
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Punto de Interés (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Museo del Louvre, Restaurante El Cielo" {...field} />
                  </FormControl>
                  <FormDescription>Nombre del lugar o sitio específico.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cityRegion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad / Región (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: París, Francia" {...field} />
                  </FormControl>
                  <FormDescription>Ciudad, provincia o región.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección Específica (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Rue de Rivoli, 75001 Paris, Francia" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs text-accent/80 mt-1">
                    Para la visualización en el mapa, es ideal proveer Latitud y Longitud, o asegurar que la dirección sea clara para una posible geocodificación futura.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitud (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" step="any" placeholder="Ej: 48.8584" {...field} 
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          value={field.value === undefined ? '' : String(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitud (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" step="any" placeholder="Ej: 2.2945" {...field} 
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          value={field.value === undefined ? '' : String(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
          </div>
        )}

        {isTransportType && (
          <>
            <div className="space-y-6 pt-4 border-t mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary flex items-center"><PinOff className="mr-2 h-5 w-5"/>Origen del Transporte</h3>
                <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => handlePasteCoordinates('origin')} disabled={isPastingOrigin}>
                        {isPastingOrigin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4" />}
                        Pegar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleGeocode('origin')} disabled={isGeocodingOrigin}>
                      {isGeocodingOrigin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                      Buscar
                    </Button>
                </div>
              </div>
              <FormField
                control={form.control} name="originLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar de Origen (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Ej: Aeropuerto El Dorado" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="originCityRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad/Región de Origen (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Ej: Bogotá, Colombia" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="originAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección de Origen (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Ej: Ac. 26 #103-9" {...field} /></FormControl>
                     <FormDescription className="text-xs text-accent/80 mt-1">
                      Para la visualización en el mapa, es ideal proveer Latitud y Longitud, o asegurar que la dirección sea clara.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control} name="originLatitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitud Origen (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Ej: 4.7014" {...field} 
                               onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                               value={field.value === undefined ? '' : String(field.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control} name="originLongitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitud Origen (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Ej: -74.1433" {...field} 
                               onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                               value={field.value === undefined ? '' : String(field.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="space-y-6 pt-4 border-t mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary flex items-center"><Pin className="mr-2 h-5 w-5"/>Destino del Transporte</h3>
                <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => handlePasteCoordinates('destination')} disabled={isPastingDestination}>
                        {isPastingDestination ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4" />}
                        Pegar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleGeocode('destination')} disabled={isGeocodingDestination}>
                      {isGeocodingDestination ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                      Buscar
                    </Button>
                </div>
              </div>
              <FormField
                control={form.control} name="destinationLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar de Destino (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Ej: Hotel Tequendama" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="destinationCityRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad/Región de Destino (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Ej: Bogotá, Colombia" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="destinationAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección de Destino (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Ej: Cra. 10 #26-21" {...field} /></FormControl>
                     <FormDescription className="text-xs text-accent/80 mt-1">
                      Para la visualización en el mapa, es ideal proveer Latitud y Longitud, o asegurar que la dirección sea clara.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control} name="destinationLatitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitud Destino (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Ej: 4.6097" {...field} 
                               onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                               value={field.value === undefined ? '' : String(field.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control} name="destinationLongitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitud Destino (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Ej: -74.0817" {...field} 
                               onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                               value={field.value === undefined ? '' : String(field.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </>
        )}
        
        <div className="space-y-6 pt-4 border-t mt-6">
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Presupuesto Estimado (General)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" placeholder="Ej: 50 (en tu moneda local)" {...field}
                      onChange={e => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : parseFloat(value));
                      }}
                      value={field.value === undefined ? '' : String(field.value)}
                    />
                  </FormControl>
                  <FormDescription>Costo principal (ej: tiquete de avión, entrada al parque).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAccommodationType && (
              <FormField
                control={form.control}
                name="reservationInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Información de Reserva (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ej: Confirmación #12345, Tel: +33 1 23 45 67 89" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cualquier detalle extra, recordatorio, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Guardar Cambios" : "Añadir"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
