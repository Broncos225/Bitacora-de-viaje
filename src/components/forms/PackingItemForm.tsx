"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PackingListItem } from "@/lib/types";
import { Save, X } from "lucide-react";

const packingItemSchema = z.object({
  name: z.string().min(2, "El nombre del artículo debe tener al menos 2 caracteres."),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
  priority: z.enum(['Alta', 'Media', 'Baja'], {
    required_error: "La prioridad es requerida.",
  }),
});

interface PackingItemFormProps {
  onSubmit: (data: PackingListItem) => void;
  initialData?: PackingListItem | null;
  onCancel: () => void;
}

export function PackingItemForm({ onSubmit, initialData, onCancel }: PackingItemFormProps) {
  const form = useForm<z.infer<typeof packingItemSchema>>({
    resolver: zodResolver(packingItemSchema),
    defaultValues: initialData || {
      name: "",
      quantity: 1,
      priority: 'Media',
    },
  });

  function handleSubmit(values: z.infer<typeof packingItemSchema>) {
    const itemData: PackingListItem = {
      id: initialData?.id || `item-${Date.now()}`,
      packed: initialData?.packed || false,
      ...values,
    };
    onSubmit(itemData);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Artículo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Pasaporte, Camisetas, Cargador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
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
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Guardar Cambios" : "Añadir Artículo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
