
"use client";

import Link from 'next/link';
import { Plane, LogIn, LogOut, UserCircle, Menu as MenuIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from './ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileNav } from '@/contexts/mobile-nav-context';
import { usePathname } from 'next/navigation';

export function SiteHeader() {
  const { user, loading, signOutUser } = useAuth();
  const { setIsMobileNavOpen } = useMobileNav();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const displayUsername = user?.email?.split('@')[0];
  // Ensure showMobileMenuToggle is strictly boolean based on isMobile being true,
  // to prevent rendering differences between server (isMobile=undefined) and client (isMobile=true/false after mount)
  const showMobileMenuToggle = isMobile === true && pathname.startsWith('/plan');

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-[1001] shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {showMobileMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileNavOpen(true)}
              className="mr-1 hover:bg-primary/80 focus-visible:ring-primary-foreground"
              aria-label="Abrir menú de navegación"
            >
              <MenuIcon className="h-6 w-6" />
            </Button>
          )}
          <Link href={user ? "/plan/trips" : "/"} className="flex items-center gap-2 text-xl md:text-2xl font-headline font-bold">
            <Plane className="h-7 w-7 md:h-8 md:w-8" />
            Bitácora de Viaje
          </Link>
        </div>
        <nav>
          {loading ? (
            <Skeleton className="h-8 w-24 bg-primary/50" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hover:bg-primary/80 focus-visible:ring-primary-foreground">
                  <UserCircle className="mr-2 h-5 w-5" />
                  <span className="hidden sm:inline">{displayUsername}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Mi Cuenta ({displayUsername})</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOutUser} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button variant="ghost" className="hover:bg-primary/80 focus-visible:ring-primary-foreground">
                <LogIn className="mr-2 h-5 w-5" />
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
