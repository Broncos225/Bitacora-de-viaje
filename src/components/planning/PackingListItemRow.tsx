import type { PackingListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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


interface PackingListItemRowProps {
  item: PackingListItem;
  onTogglePacked: (packed: boolean) => void;
  onEdit: () => void;
  onRemove: () => void;
}

const priorityStyles: Record<PackingListItem['priority'], string> = {
  'Alta': 'border-red-500 bg-red-50 text-red-700',
  'Media': 'border-yellow-500 bg-yellow-50 text-yellow-700',
  'Baja': 'border-green-500 bg-green-50 text-green-700',
};

export function PackingListItemRow({ item, onTogglePacked, onEdit, onRemove }: PackingListItemRowProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-md border transition-all-subtle",
      item.packed ? "bg-muted/70" : "bg-card hover:bg-muted/50"
    )}>
      <Checkbox
        id={`item-${item.id}`}
        checked={item.packed}
        onCheckedChange={(checked) => onTogglePacked(Boolean(checked))}
        aria-label={`Marcar ${item.name} como ${item.packed ? 'no empacado' : 'empacado'}`}
      />
      <label
        htmlFor={`item-${item.id}`}
        className={cn(
          "flex-grow text-sm cursor-pointer",
          item.packed && "line-through text-muted-foreground"
        )}
      >
        {item.name} <span className="text-xs text-muted-foreground"> (x{item.quantity})</span>
      </label>
      <Badge variant="outline" className={cn("hidden sm:inline-flex", priorityStyles[item.priority])}>{item.priority}</Badge>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar artículo">
          <Edit3 className="h-4 w-4" />
        </Button>
        <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Eliminar artículo">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente el artículo "{item.name}".
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
  );
}
