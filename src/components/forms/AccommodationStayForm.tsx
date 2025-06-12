
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays, isBefore } from "date-fns";
import { es } from 'date-fns/locale';
import type { AccommodationStay } from "@/lib/types";

// Esquema de validación para el formulario de estancia de alojamiento
const accommodationStaySchema = z.object({
  name: z.string().min(2, "El nombre del alojamiento debe tener al menos 2 caracteres."),
  startDate: z.date({ required_error: "La fecha de check-in es requerida." }),
  endDate: z.date({ required_error: "La fecha de check-out es requerida." }),
  location: z.string().optional(),
  cityRegion: z.string().optional(),
  address: z.string().optional(),
  reservationInfo: z.string().optional(),
  budget: z.coerce.number().nonnegative("El presupuesto no puede ser negativo.").optional().default(0),
  notes: z.string().optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: "La fecha de check-out no puede ser anterior a la fecha de check-in.",
  path: ["endDate"],
});

interface AccommodationStayFormProps {
  onSubmit: (data: AccommodationStay) => void;
  initialData?: AccommodationStay | null;
  onCancel: () => void;
  tripStartDate: string; // YYYY-MM-DD del viaje general
  tripEndDate: string;   // YYYY-MM-DD del viaje general
}

export function AccommodationStayForm({ 
    onSubmit, 
    initialData, 
    onCancel,
    tripStartDate,
    tripEndDate
}: AccommodationStayFormProps) {

  const parsedTripStartDate = parseISO(tripStartDate);
  const parsedTripEndDate = parseISO(tripEndDate);

  const form = useForm<z.infer<typeof accommodationStaySchema>>({
    resolver: zodResolver(accommodationStaySchema),
    defaultValues: initialData ? {
      ...initialData,
      startDate: parseISO(initialData.startDate),
      endDate: parseISO(initialData.endDate),
      budget: initialData.budget !== undefined ? initialData.budget : 0,
    } : {
      name: "",
      startDate: parsedTripStartDate, // Default to trip start date
      endDate: addDays(parsedTripStartDate,1), // Default to one day after trip start
      location: "",
      cityRegion: "",
      address: "",
      reservationInfo: "",
      budget: 0,
      notes: "",
    },
  });

  function handleSubmit(values: z.infer<typeof accommodationStaySchema>) {
    const stayData: AccommodationStay = {
      id: initialData?.id || `stay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...values,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      endDate: format(values.endDate, "yyyy-MM-dd"),
      budget: (typeof values.budget === 'number' && !isNaN(values.budget)) ? values.budget : undefined,
    };
    onSubmit(stayData);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Alojamiento</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Hotel Paraíso, Cabaña del Bosque" {...field} />
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
                <FormLabel>Fecha de Check-in</FormLabel>
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
                      disabled={(date) => isBefore(date, parsedTripStartDate) || isBefore(parsedTripEndDate, date) }
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
                <FormLabel>Fecha de Check-out</FormLabel>
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
                        isBefore(parsedTripEndDate, date)
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
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Punto de Interés (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Hotel Hilton Centro" {...field} />
              </FormControl>
              <FormDescription>Nombre específico del lugar, si aplica.</FormDescription>
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
                <Input placeholder="Ej: Cartagena, Colombia" {...field} />
              </FormControl>
              <FormDescription>Ciudad o región del alojamiento.</FormDescription>
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
                <Input placeholder="Ej: Av. Siempreviva 123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="budget"
          render={({ field }) => ( 
            <FormItem>
              <FormLabel>Presupuesto Estimado (Total o por noche, opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Ej: 300" 
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
          name="reservationInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Información de Reserva (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Confirmación #ABCDE123, Booking.com" {...field} />
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
                <Textarea placeholder="Cualquier detalle extra: tipo de habitación, servicios incluidos, etc." {...field} />
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
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Guardar Cambios" : "Añadir Alojamiento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
