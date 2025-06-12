
import { config } from 'dotenv';
config();

import '@/ai/flows/route-optimization.ts';
import '@/ai/flows/full-trip-optimization.ts'; 
import '@/ai/flows/generate-trip-image-flow.ts'; // Añadir el nuevo flujo de generación de imágenes

