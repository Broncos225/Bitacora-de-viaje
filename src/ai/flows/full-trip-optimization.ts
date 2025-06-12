
'use server';
/**
 * @fileOverview Un agente de IA para la optimización global de itinerarios de viaje.
 *
 * - optimizeFullTrip - Una función que maneja el proceso de optimización del viaje completo.
 * - FullTripOptimizationInput - El tipo de entrada para la función optimizeFullTrip.
 * - FullTripOptimizationOutput - El tipo de retorno para la función optimizeFullTrip.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FullTripOptimizationInputSchema = z.object({
  tripDestination: z.string().describe('El destino principal del viaje.'),
  tripStartDate: z.string().describe('La fecha de inicio del viaje (YYYY-MM-DD).'),
  tripEndDate: z.string().describe('La fecha de fin del viaje (YYYY-MM-DD).'),
  fullItineraryDescription: z.string().describe('Una descripción detallada de todo el itinerario del viaje, incluyendo actividades planificadas para cada día, con sus nombres, tipos, ubicaciones (punto de interés, ciudad/región, dirección si existe), horarios, presupuestos y notas. También debe incluir información sobre los alojamientos planificados para cada noche.'),
});
export type FullTripOptimizationInput = z.infer<typeof FullTripOptimizationInputSchema>;

const FullTripOptimizationOutputSchema = z.object({
  globalRecommendations: z.string().describe('Sugerencias y recomendaciones generales en ESPAÑOL para optimizar el flujo completo del viaje. Esto puede incluir orden de ciudades a visitar (si aplica), días temáticos, consejos de transporte entre múltiples puntos, o cómo agrupar actividades a lo largo de varios días para minimizar tiempos muertos o costos. Si el itinerario es muy simple o corto, la recomendación puede ser breve.'),
  potentialIssues: z.string().optional().describe('Posibles problemas o conflictos identificados en el itinerario completo (ej. tiempos de viaje poco realistas entre actividades de días diferentes, sobrecarga de actividades, etc.). En ESPAÑOL.'),
});
export type FullTripOptimizationOutput = z.infer<typeof FullTripOptimizationOutputSchema>;

export async function optimizeFullTrip(input: FullTripOptimizationInput): Promise<FullTripOptimizationOutput> {
  return fullTripOptimizationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fullTripOptimizationPrompt',
  input: {schema: FullTripOptimizationInputSchema},
  output: {schema: FullTripOptimizationOutputSchema},
  prompt: `Eres un planificador de viajes experto de renombre mundial, especializado en la optimización holística de itinerarios completos.
IMPORTANTE: TODAS tus respuestas y explicaciones deben ser estrictamente en idioma ESPAÑOL.

Analizarás el siguiente itinerario de viaje completo para el destino: {{{tripDestination}}}, desde {{{tripStartDate}}} hasta {{{tripEndDate}}}.
Descripción completa del itinerario:
{{{fullItineraryDescription}}}

Tu tarea es proporcionar recomendaciones globales para mejorar la eficiencia, disfrute y logística del viaje completo.
Considera:
- El flujo general del viaje: ¿Hay un orden más lógico para visitar lugares o realizar actividades a lo largo de los días?
- Transporte entre diferentes puntos/ciudades (si aplica en el itinerario).
- Posibilidad de agrupar actividades temáticas o geográficamente cercanas a lo largo de varios días.
- Identificar días demasiado cargados o demasiado vacíos.
- Si se mencionan alojamientos repetidos en días consecutivos, considéralos como base de operaciones para esas fechas.
- Posibles conflictos o tiempos de viaje poco realistas entre actividades, especialmente si implican traslados largos entre días.

Proporciona:
1.  'globalRecommendations': Sugerencias prácticas y accionables en ESPAÑOL para optimizar el viaje.
2.  'potentialIssues': Si identificas problemas significativos, descríbelos brevemente en ESPAÑOL. Si no hay problemas obvios, puedes omitir este campo o indicar que no se encontraron.

Evita dar optimizaciones hiper-detalladas para un solo día, ya que para eso existe otra función. Enfócate en la visión general y las interconexiones entre los días del viaje.
Si el itinerario es muy breve (ej. un solo día con pocas actividades), tus recomendaciones pueden ser concisas y adaptadas a esa simplicidad.
Asegúrate de que todos los campos de salida estén en ESPAÑOL.
`,
});

const fullTripOptimizationFlow = ai.defineFlow(
  {
    name: 'fullTripOptimizationFlow',
    inputSchema: FullTripOptimizationInputSchema,
    outputSchema: FullTripOptimizationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
