
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
  prompt: `Eres un planificador de viajes experto de renombre mundial, especializado en la optimización holística de itinerarios completos. Tu objetivo es actuar como un supervisor de logística y presupuesto.
IMPORTANTE: TODAS tus respuestas y explicaciones deben ser estrictamente en idioma ESPAÑOL.

Analizarás el siguiente itinerario de viaje completo para el destino: {{{tripDestination}}}, desde {{{tripStartDate}}} hasta {{{tripEndDate}}}.
Descripción completa del itinerario:
{{{fullItineraryDescription}}}

Tu tarea es proporcionar recomendaciones globales para mejorar la eficiencia, el disfrute y la logística del viaje completo. Enfócate en la visión "macro" y la conexión entre los días. Presta especial atención a:
1.  **Flujo General y Logística:** ¿El orden de las ciudades o grandes zonas visitadas es lógico? ¿Hay sugerencias para optimizar grandes traslados entre días?
2.  **Presupuesto (Budget) General:** Analiza la distribución del presupuesto a lo largo de los días. ¿Hay días con un gasto desproporcionado? ¿Puedes sugerir formas de equilibrar o reducir el costo total sin sacrificar la experiencia?
3.  **Ritmo del Viaje (Pacing):** Identifica días demasiado cargados o demasiado vacíos. Busca conflictos de horario entre el final de un día y el comienzo del siguiente (ej. una actividad que termina muy tarde seguida de una que empieza muy temprano).
4.  **Temática y Agrupación:** Sugiere cómo agrupar actividades por tema o geografía a lo largo de varios días para una experiencia más coherente y eficiente.
5.  **Conflictos Ocultos:** Busca problemas que no son obvios a simple vista, como tiempos de viaje poco realistas entre actividades de días diferentes, sobrecarga de un tipo de actividad (ej. demasiados museos seguidos), o falta de tiempo para imprevistos.

Proporciona:
1.  'globalRecommendations': Un resumen en ESPAÑOL con tus sugerencias prácticas y accionables para optimizar el viaje.
2.  'potentialIssues': Una lista en ESPAÑOL de los posibles problemas, conflictos o riesgos que hayas identificado en el plan. Si no hay problemas, puedes omitir este campo.

Evita dar optimizaciones para un solo día (ej. "toma el metro en lugar del taxi para ir al museo"). Enfócate en la estructura general del viaje.
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
