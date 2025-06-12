
import type { ActivityItem, ActivityType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, ShoppingCart, Car, Puzzle, MapPin, Clock, DollarSign, FileText, Edit3, Trash2, Landmark, Building2, BedDouble, CalendarRange, LogIn, LogOut } from "lucide-react";
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

interface ActivityCardProps {
  activity: ActivityItem;
  currentDate?: string; // YYYY-MM-DD, optional, for context within a specific day's view
  onEdit: () => void;
  onRemove: () => void;
}

const activityIcons: Record<ActivityType, React.ElementType> = {
  'Actividad': Puzzle,
  'Comida': Utensils,
  'Compras': ShoppingCart,
  'Transporte': Car,
  'Alojamiento': BedDouble,
};

export function ActivityCard({ activity, currentDate, onEdit, onRemove }: ActivityCardProps) {
  const Icon = activityIcons[activity.type] || Puzzle; 
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
    <Card className="overflow-hidden shadow-md transition-all-subtle hover:shadow-lg">
      <CardHeader className="flex flex-row items-start bg-muted/50 p-4">
        <div className="flex items-center gap-3 flex-grow">
          <Icon className="h-6 w-6 text-primary" />
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
        {activity.budget !== undefined && activity.budget > 0 && (
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="mr-2 h-4 w-4" />
            Presupuesto: ${activity.budget.toLocaleString()}
          </div>
        )}
        {activity.reservationInfo && (
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

