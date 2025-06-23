

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ClipboardList, ListChecks, LogOut, Settings, Plane, UserCircle, LogIn, Trash2, PlusCircle, List, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle as SheetTitleComponent } from "@/components/ui/sheet"; 
import { useIsMobile } from "@/hooks/use-mobile";
import { useTripData } from "@/hooks/use-trip-data"; 
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMobileNav } from "@/contexts/mobile-nav-context"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponentImport, 
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const planningNavItems = [
  { href: "/plan/itinerary", label: "Itinerario", icon: CalendarDays },
  { href: "/plan/preparations", label: "Preparativos", icon: ClipboardList },
  { href: "/plan/packing-list", label: "Lista de Empaque", icon: ListChecks },
  { href: "/plan/summary", label: "Resumen del Viaje", icon: FileText },
];

const generalNavItems = [
   { href: "/plan/trips", label: "Mis Viajes", icon: List },
   { href: "/plan/new", label: "Nuevo Viaje", icon: PlusCircle },
];

function PlanningLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { isMobileNavOpen, setIsMobileNavOpen } = useMobileNav(); 
  const { 
    allUserTrips,
    activeTripData, 
    activeTripId,
    isLoading: isTripDataLoading, 
    deselectActiveTrip,
    deleteActiveTrip, // Renamed from deleteActiveTrip to deleteTripForUser for clarity
    isOperating 
  } = useTripData(); 
  const { user, loading: isAuthLoading, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(`/auth?redirect=${pathname}`);
    }
  }, [isAuthLoading, user, router, pathname]);

  if (isAuthLoading || (user && isTripDataLoading)) {
    return (
      <div className="flex h-screen">
        <aside className="hidden md:flex flex-col w-64 border-r p-4 space-y-4 bg-sidebar">
          <Skeleton className="h-10 w-full bg-sidebar-border" />
          <Skeleton className="h-8 w-full bg-sidebar-border" />
          <Skeleton className="h-8 w-full bg-sidebar-border" />
          <Skeleton className="h-8 w-full bg-sidebar-border" />
          <div className="mt-auto space-y-2">
            <Skeleton className="h-8 w-full bg-sidebar-border" />
            <Skeleton className="h-8 w-full bg-sidebar-border" />
          </div>
        </aside>
        <main className="flex-1 p-6 bg-background">
          <Skeleton className="h-full w-full bg-muted" />
        </main>
      </div>
    );
  }
  
  if (!isAuthLoading && !user) {
     return <div className="flex justify-center items-center h-screen"><p>Redirigiendo a inicio de sesión...</p></div>;
  }

  const rawDisplayUsername = user?.email?.split('@')[0] || "Usuario";
  const displayUsername = rawDisplayUsername.charAt(0).toUpperCase() + rawDisplayUsername.slice(1);
  const canAccessPlanningTools = !!activeTripData; // Define canAccessPlanningTools here

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Link href={user ? "/plan/trips" : "/"} className="flex items-center gap-2 text-xl font-bold text-sidebar-primary-foreground font-headline mb-4">
          <Plane className="h-7 w-7" />
          Bitácora de Viaje
        </Link>
        {user && (
           <div className="text-sm text-sidebar-foreground/90 mb-1 flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-sidebar-accent" /> 
            <span className="font-semibold text-base">{displayUsername}</span>
           </div>
        )}
        {activeTripData && (
          <p className="text-xs text-sidebar-foreground/80 mt-1 ml-1 truncate" title={activeTripData.destination}>
            <span className="font-medium">Destino Activo:</span> {activeTripData.destination}
          </p>
        )}
        {!activeTripData && user && (
            <p className="text-sm text-sidebar-foreground/70 mt-1 italic ml-1">Ningún viaje activo</p>
        )}
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex-grow px-2 py-4 space-y-1 overflow-y-auto">
        {generalNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => isMobile && setIsMobileNavOpen(false)} 
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
              ${pathname.startsWith(item.href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
              }
              `}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        <Separator className="my-3 bg-sidebar-border" />
         <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/70">Herramientas de Planificación</p>
        {planningNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => isMobile && setIsMobileNavOpen(false)} 
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
              ${pathname.startsWith(item.href) && canAccessPlanningTools
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
              }
              ${!canAccessPlanningTools ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}
              `}
            aria-disabled={!canAccessPlanningTools}
            
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator className="bg-sidebar-border" />
      <div className="p-4 space-y-2 mt-auto">
        {activeTripData && (
          <>
            <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground" 
                onClick={() => { router.push(`/plan/new?edit=${activeTripId}`); if (isMobile) setIsMobileNavOpen(false); }}
            >
                <Settings className="h-5 w-5" />
                Modificar Viaje Actual
            </Button>
            <Button 
                variant="outline" 
                className="w-full justify-start gap-3 border-sidebar-border text-foreground bg-background hover:bg-accent/10 hover:border-accent hover:text-accent dark:text-sidebar-foreground dark:hover:bg-sidebar-accent/80 dark:hover:text-sidebar-accent-foreground"
                onClick={() => { deselectActiveTrip(); if (isMobile) setIsMobileNavOpen(false); }}
            >
                <LogOut className="h-5 w-5" />
                Deseleccionar Viaje
            </Button>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start gap-3" disabled={isOperating}>
                    <Trash2 className="h-5 w-5" />
                    {isOperating ? "Eliminando..." : "Eliminar Viaje Actual"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitleComponentImport>¿Estás absolutamente seguro?</AlertDialogTitleComponentImport>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente el viaje a 
                      <strong> {activeTripData.destination} </strong>
                       y todos sus datos asociados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => { deleteActiveTrip(); if (isMobile) setIsMobileNavOpen(false); }} 
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Sí, eliminar viaje
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
        )}
        {user && (
           <Button 
            variant="outline" 
            className="w-full justify-start gap-3 border-sidebar-border text-foreground bg-background hover:bg-destructive/10 hover:text-destructive dark:text-sidebar-foreground dark:hover:bg-destructive/80 dark:hover:text-destructive-foreground" 
            onClick={() => { signOutUser(); if (isMobile) setIsMobileNavOpen(false); }}
           >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </Button>
        )}
        {!user && (
          <Button variant="default" className="w-full justify-start gap-3 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
            onClick={() => { router.push('/auth'); if (isMobile) setIsMobileNavOpen(false); }}
          >
            <LogIn className="h-5 w-5" />
            Iniciar Sesión
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height,4rem))]">
      {isMobile ? (
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
            <SheetHeader className="p-4 border-b border-sidebar-border"> 
              <SheetTitleComponent className="sr-only">Navegación Principal</SheetTitleComponent> 
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      ) : (
        <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:block">
          {sidebarContent}
        </aside>
      )}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-background">
        {user && !isTripDataLoading && !activeTripData && !pathname.startsWith('/plan/new') && !pathname.startsWith('/plan/trips') && !pathname.startsWith('/plan/preparations') && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Plane className="w-24 h-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">No hay un viaje activo seleccionado</h2>
            <p className="mb-4 text-muted-foreground">Crea un nuevo viaje o selecciona uno existente para empezar a planificar.</p>
            <div className="flex gap-4">
              <Button onClick={() => router.push('/plan/new')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Viaje
              </Button>
               {allUserTrips && Object.keys(allUserTrips).length > 0 && (
                 <Button onClick={() => router.push('/plan/trips')} variant="outline">
                    <List className="mr-2 h-4 w-4" /> Ver Mis Viajes
                  </Button>
               )}
            </div>
          </div>
        )}
        {/* Render children if user is authenticated AND (
            is on /plan/new OR 
            is on /plan/trips OR 
            has an active trip selected
           )
           OR if user is not authenticated yet but auth is still loading (to prevent flicker)
        */}
         { (user && (pathname.startsWith('/plan/new') || pathname.startsWith('/plan/trips') || pathname.startsWith('/plan/preparations') || activeTripData)) || (isAuthLoading && !user) ? children : null }
      </main>
    </div>
  );
}

export default function PlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlanningLayoutContent>{children}</PlanningLayoutContent>;
}

export { AlertDialogTitleComponentImport as AlertDialogTitle };
export const canAccessPlanningTools = false; // This export is not actually used by the component internally now
