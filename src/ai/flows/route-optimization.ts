
// src/ai/flows/route-optimization.ts
'use server';
/**
 * @fileOverview A route optimization AI agent.
 *
 * - routeOptimization - A function that handles the route optimization process.
 * - RouteOptimizationInput - The input type for the routeOptimization function.
 * - RouteOptimizationOutput - The return type for the routeOptimization function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RouteOptimizationInputSchema = z.object({
  dailyItinerary: z.string().describe('A description of the daily itinerary, including activities, locations, and time estimates.'),
});
export type RouteOptimizationInput = z.infer<typeof RouteOptimizationInputSchema>;

const RouteOptimizationOutputSchema = z.object({
  optimizedRoute: z.string().describe('La ruta optimizada sugerida y las opciones de transporte para el día. Si no hay suficientes datos para optimizar, explica por qué en español.'),
  estimatedTimeSavings: z.string().describe('Una estimación del tiempo ahorrado al usar la ruta optimizada. Si no aplica, indica "No aplica" o una breve explicación en español.'),
  estimatedCostSavings: z.string().describe('Una estimación del costo ahorrado al usar la ruta optimizada. Si no aplica, indica "No aplica" o una breve explicación en español.'),
});
export type RouteOptimizationOutput = z.infer<typeof RouteOptimizationOutputSchema>;

export async function routeOptimization(input: RouteOptimizationInput): Promise<RouteOptimizationOutput> {
  return routeOptimizationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'routeOptimizationPrompt',
  input: {schema: RouteOptimizationInputSchema},
  output: {schema: RouteOptimizationOutputSchema},
  prompt: `Eres un planificador de viajes experto y un asistente logístico de élite, especializado en la optimización de rutas diarias.
IMPORTANTE: TODAS tus respuestas y explicaciones deben ser estrictamente en idioma ESPAÑOL.

Tu tarea es analizar en detalle el siguiente itinerario de un día y proponer la ruta más eficiente posible. Presta especial atención a:
1.  **Orden de las Actividades:** Sugiere un orden lógico para minimizar el tiempo y costo de desplazamiento.
2.  **Tiempos y Horarios:** Verifica si los horarios (startTime, endTime) son realistas. ¿Hay suficiente tiempo para ir de un lugar a otro? ¿Hay conflictos de solapamiento?
3.  **Presupuesto (Budget):** Considera los presupuestos asignados a cada actividad. Si ves una opción de transporte o una ruta que pueda reducir costos, menciónala.
4.  **Ubicaciones:** Utiliza los nombres de lugares, direcciones y ciudades para entender la geografía del día. Si se proveen coordenadas, úsalas como referencia principal.
5.  **Contexto Adicional:** Toma en cuenta los detalles extra como el tipo de cocina, categoría de la actividad, etc., para dar recomendaciones más inteligentes (ej. no sugerir un almuerzo pesado justo antes de una actividad física intensa).

Itinerario del Día:
{{{dailyItinerary}}}

Basado en tu análisis, proporciona:
- **optimizedRoute:** Una descripción detallada de la ruta optimizada sugerida, el orden de las actividades y las opciones de transporte recomendadas. Si encuentras conflictos de tiempo o presupuesto, explícalos aquí.
- **estimatedTimeSavings:** Una estimación del tiempo que se podría ahorrar.
- **estimatedCostSavings:** Una estimación del ahorro en costos (si aplica).

Si el itinerario es demasiado simple para optimizar (ej. una sola actividad), explícalo en 'optimizedRoute' y pon "No aplica" en los otros campos. Asegúrate de que todas tus respuestas estén en español.
`,
});

const routeOptimizationFlow = ai.defineFlow(
  {
    name: 'routeOptimizationFlow',
    inputSchema: RouteOptimizationInputSchema,
    outputSchema: RouteOptimizationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
