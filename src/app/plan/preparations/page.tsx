
"use client";

import { useState, useMemo } from "react";
import { useTripData } from "@/hooks/use-trip-data";
import type { PreparationItem, PreparationCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PreparationItemForm } from "@/components/forms/PreparationItemForm";
import { PreparationListItemRow } from "@/components/planning/PreparationListItemRow";
import { PlusCircle, Plane, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const PREPARATION_CATEGORIES: PreparationCategory[] = ['Reservas', 'Documentos', 'Finanzas', 'Salud', 'Hogar', 'Vehículo', 'Otro'];

export default function PreparationsPage() {
  const { 
    activeTripData, 
    addPreparationItem, 
    updatePreparationItem, 
    removePreparationItem, 
    isLoading 
  } = useTripData();
  const router = useRouter();

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PreparationItem | null>(null);

  if (isLoading) {
    return <div>Cargando preparativos...</div>;
  }

  if (!activeTripData) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Plane className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No hay un viaje activo.</h2>
        <p className="mb-4 text-muted-foreground">Por favor, crea o selecciona un viaje para gestionar los preparativos.</p>
        <Button onClick={() => router.push('/plan/new')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Viaje
        </Button>
      </div>
    );
  }

  const handleSaveItem = (item: PreparationItem) => {
    if (editingItem) {
      updatePreparationItem(item);
    } else {
      const { id, ...itemData } = item;
      addPreparationItem(itemData as Omit<PreparationItem, 'id'>);
    }
    setEditingItem(null);
    setIsItemFormOpen(false);
  };

  const handleEditItem = (item: PreparationItem) => {
    setEditingItem(item);
    setIsItemFormOpen(true);
  };

  const currentPreparations = activeTripData.preparations || [];

  const groupedItems = useMemo(() => {
    const groups: Record<PreparationCategory, { pending: PreparationItem[], completed: PreparationItem[] }> = {} as any;

    PREPARATION_CATEGORIES.forEach(cat => {
        groups[cat] = { pending: [], completed: [] };
    });

    currentPreparations.forEach(item => {
        if (item.completed) {
            groups[item.category].completed.push(item);
        } else {
            groups[item.category].pending.push(item);
        }
    });

    // Sort items alphabetically within each group
    Object.values(groups).forEach(group => {
        group.pending.sort((a,b) => a.name.localeCompare(b.name));
        group.completed.sort((a,b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [currentPreparations]);
  
  const totalItems = currentPreparations.length;
  const completedItems = currentPreparations.filter(item => item.completed).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-3xl font-headline text-primary">Preparativos del Viaje</CardTitle>
                <CardDescription className="text-lg">
                  Gestiona todas las tareas pendientes para tu viaje a {activeTripData.destination}.
                </CardDescription>
              </div>
            </div>
            <Dialog open={isItemFormOpen} onOpenChange={(isOpen) => {
                setIsItemFormOpen(isOpen);
                if (!isOpen) setEditingItem(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingItem(null)} className="mt-4 md:mt-0">
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Tarea
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">
                    {editingItem ? "Editar Tarea" : "Añadir Nueva Tarea"}
                  </DialogTitle>
                </DialogHeader>
                <PreparationItemForm
                  onSubmit={handleSaveItem}
                  initialData={editingItem}
                  onCancel={() => { setEditingItem(null); setIsItemFormOpen(false);}}
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            {totalItems > 0 ? `${completedItems} de ${totalItems} tareas completadas.` : 'Aún no has añadido ninguna tarea a tu lista.'}
          </div>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Tu lista de preparativos está vacía. ¡Añade tu primera tarea!
            </p>
          ) : (
            <div className="space-y-6">
              {PREPARATION_CATEGORIES.map(category => {
                const group = groupedItems[category];
                if (group.pending.length === 0 && group.completed.length === 0) {
                    return null;
                }
                return (
                  <div key={category}>
                    <h3 className="text-xl font-semibold font-headline mb-3 border-b pb-1.5 flex justify-between items-center">
                      {category}
                      <Badge variant="outline">{group.pending.length + group.completed.length}</Badge>
                    </h3>
                    <div className="space-y-2">
                      {group.pending.map(item => (
                        <PreparationListItemRow
                          key={item.id}
                          item={item}
                          onUpdateItem={updatePreparationItem}
                          onEdit={() => handleEditItem(item)}
                          onRemove={() => removePreparationItem(item.id)}
                        />
                      ))}
                    </div>
                    {group.completed.length > 0 && (
                        <Accordion type="single" collapsible className="w-full mt-3">
                            <AccordionItem value="completed" className="border rounded-md bg-muted/50 px-3">
                                <AccordionTrigger className="text-sm font-medium py-2">
                                    {group.completed.length} Tareas Completadas
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="space-y-2">
                                        {group.completed.map(item => (
                                            <PreparationListItemRow
                                                key={item.id}
                                                item={item}
                                                onUpdateItem={updatePreparationItem}
                                                onEdit={() => handleEditItem(item)}
                                                onRemove={() => removePreparationItem(item.id)}
                                            />
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
