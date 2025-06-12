
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/LoginForm";
import { Lock } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-3">
            <Lock className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Acceso a tu Bitácora</CardTitle>
          <CardDescription>
            Inicia sesión para planificar tus viajes.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}

