
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, X, Plus, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import type { PreparationItem, PreparationCategory, ChecklistItem } from "@/lib/types";
import { Separator } from "../ui/separator";

const PREPARATION_CATEGORIES: PreparationCategory[] = ['Reservas', 'Documentos', 'Finanzas', 'Salud', 'Hogar', 'Vehículo', 'Otro'];

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "La subtarea no puede estar vacía."),
  completed: z.boolean(),
});

const preparationItemSchema = z.object({
  name: z.string().min(2, "El nombre de la tarea debe tener al menos 2 caracteres."),
  category: z.enum(PREPARATION_CATEGORIES, {
    required_error: "La categoría es requerida.",
  }),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  checklist: z.array(checklistItemSchema).optional(),
});

interface PreparationItemFormProps {
  onSubmit: (data: PreparationItem) => void;
  initialData?: PreparationItem | null;
  onCancel: () => void;
}

export function PreparationItemForm({ onSubmit, initialData, onCancel }: PreparationItemFormProps) {
  const form = useForm<z.infer<typeof preparationItemSchema>>({
    resolver: zodResolver(preparationItemSchema),
    defaultValues: initialData ? {
      ...initialData,
      dueDate: initialData.dueDate ? parseISO(initialData.dueDate) : undefined,
      checklist: initialData.checklist || [],
    } : {
      name: "",
      category: 'Otro',
      dueDate: undefined,
      notes: "",
      checklist: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "checklist",
  });

  function handleSubmit(values: z.infer<typeof preparationItemSchema>) {
    const capitalizedName = values.name.charAt(0).toUpperCase() + values.name.slice(1);
    
    // Si hay subtareas, el estado `completed` principal se determina por si todas las subtareas están completas.
    // Si no hay subtareas, se mantiene el estado `completed` original o `false` para un nuevo item.
    const isCompleted = values.checklist && values.checklist.length > 0
      ? values.checklist.every(item => item.completed)
      : (initialData?.completed || false);

    const itemData: PreparationItem = {
      id: initialData?.id || `prep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      completed: isCompleted,
      ...values,
      name: capitalizedName,
      dueDate: values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : undefined,
    };
    onSubmit(itemData);
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
              <FormLabel>Nombre de la Tarea</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Confirmar reserva del hotel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PREPARATION_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha Límite (Opcional)</FormLabel>
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Adicionales (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Añade detalles, números de confirmación, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />

        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-primary">Sub-tareas (Opcional)</h3>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => append({ id: `sub-${Date.now()}`, text: '', completed: false })}>
                    <Plus className="mr-2 h-4 w-4" /> Añadir
                </Button>
            </div>
            <div className="space-y-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                         <FormField
                            control={form.control}
                            name={`checklist.${index}.text`}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input placeholder={`Sub-tarea ${index + 1}`} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
                {fields.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No hay sub-tareas añadidas.</p>
                )}
            </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
           <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Guardar Cambios" : "Añadir Tarea"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
