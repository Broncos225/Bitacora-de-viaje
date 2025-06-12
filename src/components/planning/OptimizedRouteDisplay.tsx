import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Clock,Coins } from "lucide-react";

interface OptimizedRouteDisplayProps {
  optimizedRoute?: string;
  estimatedTimeSavings?: string;
  estimatedCostSavings?: string;
}

export function OptimizedRouteDisplay({ 
  optimizedRoute, 
  estimatedTimeSavings, 
  estimatedCostSavings 
}: OptimizedRouteDisplayProps) {
  if (!optimizedRoute) {
    return <p className="text-muted-foreground">No hay una ruta optimizada disponible.</p>;
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center text-primary font-headline">
          <Lightbulb className="mr-2 h-5 w-5" /> Ruta Optimizada Sugerida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-semibold">Ruta y Transporte:</h4>
          <p className="text-sm whitespace-pre-wrap">{optimizedRoute}</p>
        </div>
        {estimatedTimeSavings && (
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-green-600" />
            <p className="text-sm"><span className="font-semibold">Ahorro de tiempo estimado:</span> {estimatedTimeSavings}</p>
          </div>
        )}
        {estimatedCostSavings && (
          <div className="flex items-center">
            <Coins className="mr-2 h-4 w-4 text-green-600" />
            <p className="text-sm"><span className="font-semibold">Ahorro de costo estimado:</span> {estimatedCostSavings}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
