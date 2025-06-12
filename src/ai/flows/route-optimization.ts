
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
  prompt: `Eres un planificador de viajes experto especializado en la optimización de rutas.
IMPORTANTE: TODAS tus respuestas y explicaciones deben ser estrictamente en idioma ESPAÑOL. Esto incluye cualquier texto en los campos optimizedRoute, estimatedTimeSavings, y estimatedCostSavings.

Utilizarás la información del itinerario diario proporcionado para sugerir las rutas y opciones de transporte más eficientes.
Si en el itinerario se mencionan nombres de ciudades o lugares que podrían ser ambiguos o demasiado generales (ej. solo el nombre de una ciudad), intenta contextualizarlos con mayor precisión geográfica (ej. Ciudad, Región/Estado, País) para ofrecer una optimización más precisa y relevante.

Si una actividad de 'Alojamiento' con el mismo nombre y/o ubicación aparece en días consecutivos dentro del itinerario que se te proporciona (si abarca varios días), considera ese lugar como la base de operaciones para esos días al optimizar otras actividades.

Considera factores como el tiempo de viaje, el costo y la conveniencia.

Itinerario: {{{dailyItinerary}}}

Proporciona una ruta optimizada detallada, incluyendo sugerencias de transporte, estimaciones de ahorro de tiempo y estimaciones de ahorro de costos.
Si el itinerario proporcionado contiene muy pocas actividades (por ejemplo, solo una, especialmente si es solo de alojamiento sin otras actividades que requieran desplazamiento) o no permite una optimización de ruta significativa entre múltiples puntos, indícalo claramente en el campo 'optimizedRoute' explicando qué información adicional se necesitaría (por ejemplo, un punto de partida y destino, o más actividades). En tales casos, para 'estimatedTimeSavings' y 'estimatedCostSavings', puedes usar "No aplica" o una breve explicación, siempre en español.
Asegúrate de que todos los campos de salida estén en español.
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

