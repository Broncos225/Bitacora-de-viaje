
export interface TripBase {
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  purpose: string;
}

export interface Trip extends TripBase {
  id: string; // ID generado por Firebase o UUID
  userId: string; // UID del propietario del viaje
  createdAt: number; // timestamp
}

export interface PackingListItem {
  id: string; // UUID para el item
  name: string;
  quantity: number;
  priority: 'Alta' | 'Media' | 'Baja';
  packed: boolean;
}

// ActivityType ahora incluye 'Alojamiento'
export type ActivityType = 'Actividad' | 'Comida' | 'Compras' | 'Transporte' | 'Alojamiento';

export interface ActivityItem {
  id: string; // UUID para la actividad
  type: ActivityType;
  name:string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  location?: string;
  cityRegion?: string;
  address?: string;
  reservationInfo?: string;
  budget?: number;
  startTime?: string; // Hora específica de inicio dentro del rango de fechas
  endTime?: string; // Hora específica de fin dentro del rango de fechas
  notes?: string;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  notes?: string;
  optimizedRoute?: string;
  estimatedTimeSavings?: string;
  estimatedCostSavings?: string;
  dayImageUri?: string; // Nuevo campo para la imagen del día
}

// AccommodationStay ya no es necesaria, se usa ActivityItem con type: 'Alojamiento'

export interface FullTripData extends Trip {
  packingList: PackingListItem[];
  itinerary: DailyPlan[];
  activities: ActivityItem[];
  summaryImageUri?: string; // Imagen del resumen general del viaje
}

export type UserTrips = Record<string, FullTripData>;
