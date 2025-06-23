
import type { PreparationItem, ChecklistItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Calendar, Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface PreparationListItemRowProps {
  item: PreparationItem;
  onUpdateItem: (item: PreparationItem) => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function PreparationListItemRow({ item, onUpdateItem, onEdit, onRemove }: PreparationListItemRowProps) {

  const checklist = item.checklist || [];
  const hasChecklist = checklist.length > 0;
  
  const completedChecklistItems = hasChecklist ? checklist.filter(sub => sub.completed).length : 0;
  const checklistProgress = hasChecklist ? (completedChecklistItems / checklist.length) * 100 : 0;

  const handleMasterToggle = (checked: boolean) => {
    const updatedChecklist = hasChecklist ? checklist.map(sub => ({ ...sub, completed: checked })) : undefined;
    onUpdateItem({ ...item, completed: checked, checklist: updatedChecklist });
  };

  const handleSubItemToggle = (subItemId: string, checked: boolean) => {
    const updatedChecklist = checklist.map(sub => 
      sub.id === subItemId ? { ...sub, completed: checked } : sub
    );
    // Master is completed only if all sub-items are completed
    const isMasterCompleted = updatedChecklist.every(sub => sub.completed);
    onUpdateItem({ ...item, completed: isMasterCompleted, checklist: updatedChecklist });
  };
  
  return (
    <div className={cn(
      "flex flex-col gap-3 p-3 rounded-md border transition-all-subtle",
      item.completed ? "bg-muted/70" : "bg-card hover:bg-muted/50"
    )}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
            <Checkbox
              id={`item-${item.id}`}
              checked={item.completed}
              onCheckedChange={(checked) => handleMasterToggle(Boolean(checked))}
              aria-label={`Marcar ${item.name} como ${item.completed ? 'no completado' : 'completado'}`}
            />
        </div>
        <div className="flex-grow space-y-1">
          <label
              htmlFor={`item-${item.id}`}
              className={cn(
              "font-medium text-sm cursor-pointer",
              item.completed && "line-through text-muted-foreground"
              )}
          >
              {item.name}
          </label>
          {item.notes && <p className={cn("text-xs text-muted-foreground", item.completed && "line-through")}>{item.notes}</p>}
          {item.dueDate && (
               <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  Vence: {format(parseISO(item.dueDate), "PPP", { locale: es })}
               </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar tarea" className="h-7 w-7">
                <Edit3 className="h-4 w-4" />
              </Button>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Eliminar tarea" className="h-7 w-7">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea "{item.name}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onRemove} className="bg-destructive hover:bg-destructive/90">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
          </div>
        </div>
      </div>
      {hasChecklist && (
        <div className="pl-8 pr-1 space-y-2">
            <div className="space-y-2">
                {checklist.map(subItem => (
                    <div key={subItem.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                            id={`subitem-${subItem.id}`}
                            checked={subItem.completed}
                            onCheckedChange={(checked) => handleSubItemToggle(subItem.id, Boolean(checked))}
                            aria-label={`Marcar subtarea ${subItem.text}`}
                        />
                         <label
                            htmlFor={`subitem-${subItem.id}`}
                            className={cn(
                            "flex-grow cursor-pointer text-xs",
                            subItem.completed && "line-through text-muted-foreground"
                            )}
                        >
                            {subItem.text}
                        </label>
                    </div>
                ))}
            </div>
            <div>
              <Progress value={checklistProgress} className="h-1.5 mt-2" />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {completedChecklistItems} de {checklist.length} completadas
              </p>
            </div>
        </div>
      )}
    </div>
  );
}
