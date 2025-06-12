export function SiteFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-6 text-center">
      <div className="container mx-auto px-4">
        <p className="text-sm">
          © {new Date().getFullYear()} Bitácora de Viaje. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
