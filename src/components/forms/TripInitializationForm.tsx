
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
import { CalendarIcon, Rocket, Save } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { useTripData } from "@/hooks/use-trip-data";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { TripBase, FullTripData } from "@/lib/types";
import { useEffect } from "react";

const tripFormSchema = z.object({
  destination: z.string().min(2, {
    message: "El destino debe tener al menos 2 caracteres.",
  }),
  startDate: z.date({
    required_error: "La fecha de inicio es requerida.",
  }),
  endDate: z.date({
    required_error: "La fecha de fin es requerida.",
  }),
  purpose: z.string().optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
  path: ["endDate"],
});

type TripFormValues = z.infer<typeof tripFormSchema>;

interface TripInitializationFormProps {
  // initialData is passed when editing an existing trip
  initialData?: FullTripData | null; 
}

export function TripInitializationForm({ initialData }: TripInitializationFormProps) {
  const { createAndSetActiveTrip, updateActiveTripDetails, isOperating } = useTripData();
  const router = useRouter();
  const { toast } = useToast();
  
  const isEditMode = !!initialData;

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: initialData ? {
      destination: initialData.destination,
      startDate: parseISO(initialData.startDate),
      endDate: parseISO(initialData.endDate),
      purpose: initialData.purpose || "",
    } : {
      destination: "",
      purpose: "",
      // startDate and endDate will be undefined by default, user must pick
    },
  });
  
  useEffect(() => {
    // If initialData changes (e.g., navigating between edit forms or props update)
    // reset the form with new initialData
    if (initialData) {
      form.reset({
        destination: initialData.destination,
        startDate: parseISO(initialData.startDate),
        endDate: parseISO(initialData.endDate),
        purpose: initialData.purpose || "",
      });
    } else {
      form.reset({
        destination: "",
        startDate: undefined,
        endDate: undefined,
        purpose: "",
      });
    }
  }, [initialData, form]);


  async function onSubmit(values: TripFormValues) {
    const tripBaseDetails: TripBase = {
      destination: values.destination,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      endDate: format(values.endDate, "yyyy-MM-dd"),
      purpose: values.purpose || "",
    };

    if (isEditMode && initialData) {
      // Update existing trip
      await updateActiveTripDetails(tripBaseDetails);
      // router.push(`/plan/summary`); // Or wherever appropriate after edit
      router.push(`/plan/itinerary`);
    } else {
      // Create new trip
      const newTrip = await createAndSetActiveTrip(tripBaseDetails);
      if (newTrip) {
        router.push(`/plan/itinerary`); // Navigate to itinerary of the new active trip
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destino</FormLabel>
              <FormControl>
                <Input placeholder="Ej: París, Francia" {...field} disabled={isOperating}/>
              </FormControl>
              <FormDescription>¿A dónde te diriges en esta aventura?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isOperating}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: es })
                        ) : (
                          <span>Elige una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                         // Disable past dates only if not in edit mode with a past start date
                         if (isEditMode && initialData && parseISO(initialData.startDate) < new Date(new Date().setHours(0,0,0,0))) {
                            return false; // Allow selection if editing an old trip
                         }
                         return date < new Date(new Date().setHours(0,0,0,0));
                       }
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
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isOperating}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: es })
                        ) : (
                          <span>Elige una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const startDate = form.getValues("startDate");
                        if (isEditMode && initialData && parseISO(initialData.endDate) < (startDate || new Date(new Date().setHours(0,0,0,0)))) {
                           return false; // Allow selection if editing an old trip
                        }
                        return startDate ? date < startDate : date < new Date(new Date().setHours(0,0,0,0));
                        }
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
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Propósito del Viaje (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej: Vacaciones familiares, viaje de negocios, exploración cultural..."
                  className="resize-none"
                  {...field}
                  disabled={isOperating}
                />
              </FormControl>
              <FormDescription>
                Describe brevemente el motivo de tu viaje.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isOperating}>
          {isOperating ? (isEditMode ? "Guardando..." : "Creando...") : 
            (isEditMode ? <><Save className="mr-2 h-4 w-4" /> Guardar Cambios del Viaje</> : <><Rocket className="mr-2 h-4 w-4" /> Crear Viaje y Empezar a Planificar</>)
          }
        </Button>
      </form>
    </Form>
  );
}
