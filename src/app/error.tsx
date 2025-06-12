"use client"; 

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="text-4xl font-bold font-headline mb-4">Algo salió mal</h1>
      <p className="text-lg text-muted-foreground mb-8">
        {error.message || "Ocurrió un error inesperado. Por favor, intenta de nuevo."}
      </p>
      <Button
        onClick={() => reset()}
        className="bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        Intentar de nuevo
      </Button>
    </div>
  );
}
