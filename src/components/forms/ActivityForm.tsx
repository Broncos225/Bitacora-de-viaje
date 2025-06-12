
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
import type { ActivityItem, ActivityType } from "@/lib/types";
import { Utensils, ShoppingCart, Car, Puzzle, Save, X, CalendarIcon, BedDouble, CalendarRange, MapPinIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { es } from 'date-fns/locale';

// Actualizado para incluir 'Alojamiento' y lat/lon
const activitySchema = z.object({
  type: z.enum(['Actividad', 'Comida', 'Compras', 'Transporte', 'Alojamiento'], {
    required_error: "El tipo de actividad es requerido.",
  }),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  startDate: z.date({ required_error: "La fecha de inicio es requerida." }),
  endDate: z.date({ required_error: "La fecha de fin es requerida." }),
  location: z.string().optional(),
  cityRegion: z.string().optional(),
  address: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  reservationInfo: z.string().optional(),
  budget: z.coerce.number().nonnegative("El presupuesto no puede ser negativo.").optional().default(0),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
  path: ["endDate"],
}).refine(data => (data.latitude === undefined && data.longitude === undefined) || (data.latitude !== undefined && data.longitude !== undefined), {
  message: "Si se proporciona latitud, también se debe proporcionar longitud, y viceversa.",
  path: ["latitude"], // O "longitude", el error se puede asociar a uno de ellos o ser general
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

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: initialData ? {
      ...initialData,
      startDate: parseISO(initialData.startDate),
      endDate: parseISO(initialData.endDate),
      budget: initialData.budget !== undefined && initialData.budget !== null ? initialData.budget : 0,
      cityRegion: initialData.cityRegion || "",
      latitude: initialData.latitude,
      longitude: initialData.longitude,
    } : {
      type: 'Actividad', 
      name: "",
      startDate: tripStartDate ? parseISO(tripStartDate) : new Date(),
      endDate: tripStartDate ? parseISO(tripStartDate) : new Date(),
      location: "",
      cityRegion: "",
      address: "",
      latitude: undefined,
      longitude: undefined,
      reservationInfo: "",
      budget: 0,
      startTime: "",
      endTime: "",
      notes: "",
    },
  });

  const currentActivityType = useWatch({
    control: form.control,
    name: "type",
    defaultValue: initialData?.type || 'Actividad'
  });
  
  const isAccommodationType = currentActivityType === 'Alojamiento';

  function handleSubmit(values: z.infer<typeof activitySchema>) {
    const activityData: ActivityItem = {
      id: initialData?.id || `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: values.type as ActivityType, 
      name: values.name,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      endDate: format(values.endDate, "yyyy-MM-dd"),
      location: values.location || "",
      cityRegion: values.cityRegion || "",
      address: values.address || "",
      latitude: values.latitude,
      longitude: values.longitude,
      reservationInfo: values.reservationInfo || "",
      budget: (typeof values.budget === 'number' && !isNaN(values.budget)) ? values.budget : undefined,
      startTime: values.startTime || "",
      endTime: values.endTime || "",
      notes: values.notes || "",
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
              <FormLabel>Tipo de Actividad</FormLabel>
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
              <FormLabel>Nombre de la Actividad</FormLabel>
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
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Punto de Interés (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Museo del Louvre, Restaurante El Cielo, Hotel Hilton" {...field} />
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
              <FormDescription>Ciudad, provincia o región donde se encuentra el punto de interés.</FormDescription>
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
              <FormDescription>Dirección postal completa, si la tienes.</FormDescription>
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
                      type="number" 
                      step="any" 
                      placeholder="Ej: 48.8584" 
                      {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      value={field.value === undefined ? '' : String(field.value)}
                    />
                  </FormControl>
                  <FormDescription>Coordenada geográfica Norte/Sur.</FormDescription>
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
                      type="number" 
                      step="any" 
                      placeholder="Ej: 2.2945" 
                      {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      value={field.value === undefined ? '' : String(field.value)}
                    />
                  </FormControl>
                  <FormDescription>Coordenada geográfica Este/Oeste.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="budget"
          render={({ field }) => ( 
            <FormItem>
              <FormLabel>Presupuesto Estimado (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Ej: 50 (en tu moneda local)" 
                  {...field}
                  onChange={e => {
                    const value = e.target.value;
                    field.onChange(value === '' ? undefined : parseFloat(value));
                  }}
                  value={field.value === undefined ? '' : String(field.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Guardar Cambios" : "Añadir Actividad"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
