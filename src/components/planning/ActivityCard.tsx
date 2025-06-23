
import type { ActivityItem, ActivityType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, ShoppingCart, Car, Puzzle, MapPin, Clock, DollarSign, FileText, Edit3, Trash2, Landmark, Building2, BedDouble, CalendarRange, LogIn, LogOut, Info } from "lucide-react";
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
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: ActivityItem;
  currentDate?: string; // YYYY-MM-DD, optional, for context within a specific day's view
  onEdit: () => void;
  onRemove: () => void;
}

const activityTypeVisuals: Record<ActivityType, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  Actividad: { bg: "bg-purple-100/60 dark:bg-purple-900/30", border: "border-purple-500", text: "text-purple-700 dark:text-purple-300", icon: Puzzle },
  Comida: { bg: "bg-orange-100/60 dark:bg-orange-900/30", border: "border-orange-500", text: "text-orange-700 dark:text-orange-300", icon: Utensils },
  Compras: { bg: "bg-pink-100/60 dark:bg-pink-900/30", border: "border-pink-500", text: "text-pink-700 dark:text-pink-300", icon: ShoppingCart },
  Transporte: { bg: "bg-teal-100/60 dark:bg-teal-900/30", border: "border-teal-500", text: "text-teal-700 dark:text-teal-300", icon: Car },
  Alojamiento: { bg: "bg-blue-100/60 dark:bg-blue-900/30", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300", icon: BedDouble },
};


export function ActivityCard({ activity, currentDate, onEdit, onRemove }: ActivityCardProps) {
  const visuals = activityTypeVisuals[activity.type] || activityTypeVisuals['Actividad'];
  const Icon = visuals.icon;
  const isAccommodation = activity.type === 'Alojamiento';

  const activityStartDate = parseISO(activity.startDate);
  const activityEndDate = parseISO(activity.endDate);
  const currentViewDate = currentDate ? parseISO(currentDate) : null;

  const isMultiDay = format(activityStartDate, 'yyyy-MM-dd') !== format(activityEndDate, 'yyyy-MM-dd');
  
  let timeDisplay = "";
  if (isAccommodation) {
    if (currentViewDate && format(currentViewDate, 'yyyy-MM-dd') === format(activityStartDate, 'yyyy-MM-dd') && activity.startTime) {
      timeDisplay = `Check-in: ${activity.startTime}`;
    } else if (currentViewDate && format(currentViewDate, 'yyyy-MM-dd') === format(activityEndDate, 'yyyy-MM-dd') && activity.endTime) {
      timeDisplay = `Check-out: ${activity.endTime}`;
    }
  } else {
    if (activity.startTime) {
      timeDisplay = `${activity.startTime}`;
      if (activity.endTime) {
        timeDisplay += ` - ${activity.endTime}`;
      }
    }
  }


  return (
    <Card className={cn("overflow-hidden shadow-md transition-all-subtle hover:shadow-lg border-l-4", visuals.border)}>
      <CardHeader className={cn("flex flex-row items-start p-4", visuals.bg)}>
        <div className="flex items-center gap-3 flex-grow">
          <Icon className={cn("h-6 w-6", visuals.text)} />
          <div>
            <CardTitle className="text-xl font-headline">{activity.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <Badge variant="secondary">{activity.type}</Badge>
              <Badge variant="outline" className="text-xs font-normal">
                <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
                {format(activityStartDate, "d MMM", { locale: es })}
                {isMultiDay && ` - ${format(activityEndDate, "d MMM ''yy", { locale: es })}`}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar actividad">
            <Edit3 className="h-5 w-5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Eliminar actividad">
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente la actividad "{activity.name}".
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
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {timeDisplay && (
          <div className="flex items-center text-sm text-muted-foreground">
            {isAccommodation && format(currentViewDate || new Date(), 'yyyy-MM-dd') === format(activityStartDate, 'yyyy-MM-dd') && activity.startTime && <LogIn className="mr-2 h-4 w-4" />}
            {isAccommodation && format(currentViewDate || new Date(), 'yyyy-MM-dd') === format(activityEndDate, 'yyyy-MM-dd') && activity.endTime && <LogOut className="mr-2 h-4 w-4" />}
            {!isAccommodation && activity.startTime && <Clock className="mr-2 h-4 w-4" />}
            {timeDisplay}
          </div>
        )}
        
        {activity.location && (
          <div className="flex items-start text-sm text-muted-foreground">
            <Landmark className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
            <div>
                <span className="font-medium">Punto de Interés: </span>{activity.location}
            </div>
          </div>
        )}
        {activity.cityRegion && (
          <div className="flex items-start text-sm text-muted-foreground">
            <Building2 className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
             <div>
                <span className="font-medium">Ciudad/Región: </span>{activity.cityRegion}
            </div>
          </div>
        )}
        {activity.address && (
          <div className="flex items-start text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
            <div>
                <span className="font-medium">Dirección: </span>{activity.address}
            </div>
          </div>
        )}

        {/* --- START: TYPE-SPECIFIC DETAILS --- */}
        {activity.type === 'Transporte' && (
            <>
                {activity.transportationMode && (
                    <div className="flex items-start text-sm text-muted-foreground">
                        <Info className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                        <div><span className="font-medium">Medio: </span>{activity.transportationMode}</div>
                    </div>
                )}
                {activity.gasolineBudget && activity.gasolineBudget > 0 && (
                    <div className="flex items-start text-sm text-muted-foreground">
                        <DollarSign className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                        <div><span className="font-medium">Gasolina: </span>${activity.gasolineBudget.toLocaleString()}</div>
                    </div>
                )}
                {activity.tollsBudget && activity.tollsBudget > 0 && (
                    <div className="flex items-start text-sm text-muted-foreground">
                        <DollarSign className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                        <div><span className="font-medium">Peajes: </span>${activity.tollsBudget.toLocaleString()}</div>
                    </div>
                )}
            </>
        )}
        {activity.type === 'Comida' && activity.mealType && (
            <div className="flex items-start text-sm text-muted-foreground">
                <Info className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                <div><span className="font-medium">Tipo: </span>{activity.mealType}</div>
            </div>
        )}
        {activity.type === 'Comida' && activity.cuisineType && (
            <div className="flex items-start text-sm text-muted-foreground">
                <Info className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                <div><span className="font-medium">Tipo de Cocina: </span>{activity.cuisineType}</div>
            </div>
        )}
        {activity.type === 'Comida' && activity.dietaryNotes && (
            <div className="flex items-start text-sm text-muted-foreground">
                <Info className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                <div><span className="font-medium">Notas Dietéticas: </span>{activity.dietaryNotes}</div>
            </div>
        )}
        {activity.type === 'Actividad' && activity.activityCategory && (
            <div className="flex items-start text-sm text-muted-foreground">
                <Info className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                <div><span className="font-medium">Categoría: </span>{activity.activityCategory}</div>
            </div>
        )}
        {activity.type === 'Compras' && activity.shoppingCategory && (
            <div className="flex items-start text-sm text-muted-foreground">
                <Info className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                <div><span className="font-medium">Categoría: </span>{activity.shoppingCategory}</div>
            </div>
        )}
        {/* --- END: TYPE-SPECIFIC DETAILS --- */}

        {activity.budget !== undefined && activity.budget > 0 && (
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="mr-2 h-4 w-4" />
            Presupuesto (General): ${activity.budget.toLocaleString()}
          </div>
        )}
        
        {activity.type === 'Alojamiento' && activity.reservationInfo && (
          <div className="flex items-start text-sm text-muted-foreground">
            <FileText className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Reserva:</span>
              <p className="whitespace-pre-wrap">{activity.reservationInfo}</p>
            </div>
          </div>
        )}

        {activity.notes && (
          <div className="flex items-start text-sm text-muted-foreground">
            <FileText className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
             <div>
              <span className="font-medium">Notas:</span>
              <p className="whitespace-pre-wrap">{activity.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
