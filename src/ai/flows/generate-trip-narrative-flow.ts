'use server';
/**
 * @fileOverview Un agente de IA para generar una narración de un viaje.
 *
 * - generateTripNarrative - Una función que genera una narración para un itinerario de viaje completo.
 * - GenerateTripNarrativeInput - El tipo de entrada para la función generateTripNarrative.
 * - GenerateTripNarrativeOutput - El tipo de retorno para la función generateTripNarrative.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTripNarrativeInputSchema = z.object({
  fullTripDetails: z.string().describe('Una descripción completa y detallada de todo el itinerario del viaje, incluyendo destino, fechas, viajeros, actividades diarias, alojamientos y transportes.'),
  preparationsList: z.string().optional().describe('Un resumen de los preparativos previos al viaje, indicando qué está completado y qué está pendiente.'),
});
export type GenerateTripNarrativeInput = z.infer<typeof GenerateTripNarrativeInputSchema>;

const GenerateTripNarrativeOutputSchema = z.object({
  narrative: z.string().describe('La narración generada del viaje en formato de historia, en español.'),
});
export type GenerateTripNarrativeOutput = z.infer<typeof GenerateTripNarrativeOutputSchema>;

export async function generateTripNarrative(input: GenerateTripNarrativeInput): Promise<GenerateTripNarrativeOutput> {
  return generateTripNarrativeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTripNarrativePrompt',
  input: {schema: GenerateTripNarrativeInputSchema},
  output: {schema: GenerateTripNarrativeOutputSchema},
  prompt: `Eres un narrador de viajes elocuente y cautivador. Tu tarea es crear una narración fluida y atractiva del siguiente plan de viaje.
IMPORTANTE: TODA la narración debe ser estrictamente en idioma ESPAÑOL.

Primero, menciona los preparativos clave del viaje para sentar las bases de la aventura. Luego, comienza con una introducción sobre el destino y los viajeros. Finalmente, detalla el itinerario día por día de forma cronológica, describiendo las actividades, los transportes y los alojamientos de manera natural y conectada, como si contaras una historia. Usa un tono amigable y emocionante.

No te limites a listar los eventos; enlázalos para que la lectura sea amena. Por ejemplo, en lugar de "Actividad: Museo. Transporte: Bus. Alojamiento: Hotel.", podrías decir "El día comenzará con una inmersión cultural en el museo, para luego tomar un autobús que nos llevará a nuestro acogedor hotel donde descansaremos.".

Aquí están los detalles del viaje:

Preparativos:
{{{preparationsList}}}

Itinerario y Detalles del Viaje:
{{{fullTripDetails}}}

Genera la narración en el campo 'narrative'.
`,
});

const generateTripNarrativeFlow = ai.defineFlow(
  {
    name: 'generateTripNarrativeFlow',
    inputSchema: GenerateTripNarrativeInputSchema,
    outputSchema: GenerateTripNarrativeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
