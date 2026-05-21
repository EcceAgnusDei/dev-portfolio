export function DemoPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
      Démo SDK à implémenter : {title}
    </div>
  );
}
