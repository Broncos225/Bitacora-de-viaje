
export interface Travelers {
  men?: number;
  women?: number;
  children?: number;
  seniors?: number;
}

export interface TripBase {
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  purpose: string;
  travelers?: Travelers;
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

export type ActivityType = 'Actividad' | 'Comida' | 'Compras' | 'Transporte' | 'Alojamiento';
export type TransportationMode = 'Carro' | 'Autobús' | 'Avión' | 'Tren' | 'Barco' | 'A pie' | 'Otro';
export type MealType = 'Desayuno' | 'Almuerzo' | 'Comida' | 'Mecato' | 'Otro';

export interface ActivityItem {
  id: string; // UUID para la actividad
  type: ActivityType;
  name:string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD

  // Campos generales de ubicación (para actividades NO de transporte o como fallback)
  location?: string;
  cityRegion?: string;
  address?: string;
  latitude?: number;
  longitude?: number;

  // --- Campos específicos para Transporte: Origen ---
  originLocation?: string;
  originCityRegion?: string;
  originAddress?: string;
  originLatitude?: number;
  originLongitude?: number;

  // --- Campos específicos para Transporte: Destino ---
  destinationLocation?: string;
  destinationCityRegion?: string;
  destinationAddress?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;

  // --- Otros campos comunes ---
  reservationInfo?: string;
  budget?: number;
  startTime?: string; // Hora específica de inicio dentro del rango de fechas
  endTime?: string; // Hora específica de fin dentro del rango de fechas
  notes?: string;

  // --- NUEVOS CAMPOS ESPECÍFICOS POR TIPO ---
  mealType?: MealType; // Para 'Comida'
  cuisineType?: string; // Para 'Comida'
  dietaryNotes?: string; // Para 'Comida'
  activityCategory?: string; // Para 'Actividad'
  shoppingCategory?: string; // Para 'Compras'
  transportationMode?: TransportationMode; // Para 'Transporte'
  gasolineBudget?: number; // Para 'Transporte'
  tollsBudget?: number; // Para 'Transporte'
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  notes?: string;
  optimizedRoute?: string;
  estimatedTimeSavings?: string;
  estimatedCostSavings?: string;
  dayImageUri?: string; // Nuevo campo para la imagen del día
}

export interface FullTripData extends Trip {
  packingList: PackingListItem[];
  itinerary: DailyPlan[];
  activities: ActivityItem[];
  summaryImageUri?: string; // Imagen del resumen general del viaje
}

export type UserTrips = Record<string, FullTripData>;
