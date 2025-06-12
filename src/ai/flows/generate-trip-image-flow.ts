
'use server';
/**
 * @fileOverview Un agente de IA para generar imágenes de banner para viajes.
 *
 * - generateTripImage - Una función que genera una imagen para un destino de viaje.
 * - GenerateTripImageInput - El tipo de entrada para la función generateTripImage.
 * - GenerateTripImageOutput - El tipo de retorno para la función generateTripImage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTripImageInputSchema = z.object({
  destination: z.string().describe('El nombre del destino del viaje para el cual generar la imagen.'),
});
export type GenerateTripImageInput = z.infer<typeof GenerateTripImageInputSchema>;

const GenerateTripImageOutputSchema = z.object({
  imageDataUri: z.string().describe("La imagen generada como un data URI, incluyendo el MIME type y codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateTripImageOutput = z.infer<typeof GenerateTripImageOutputSchema>;

export async function generateTripImage(input: GenerateTripImageInput): Promise<GenerateTripImageOutput> {
  return generateTripImageFlow(input);
}

const generateTripImageFlow = ai.defineFlow(
  {
    name: 'generateTripImageFlow',
    inputSchema: GenerateTripImageInputSchema,
    outputSchema: GenerateTripImageOutputSchema,
  },
  async (input: GenerateTripImageInput) => {
    const promptString = `Genera una imagen de banner vibrante y atractiva, de estilo fotorealista y en orientación apaisada (landscape), para un viaje a ${input.destination}. La imagen debe ser escénica, icónica del lugar y adecuada para un resumen de viaje. Evita incluir cualquier texto superpuesto en la imagen.`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Modelo específico para generación de imágenes
      prompt: promptString,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Debe incluir IMAGE
        // Puedes añadir safetySettings aquí si es necesario
      },
    });

    if (!media?.url) {
      throw new Error('La IA no pudo generar una imagen.');
    }
    // La URL ya viene como data URI
    return {imageDataUri: media.url};
  }
);
