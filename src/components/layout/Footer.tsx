import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn(
      "border-t bg-background", 
      className
    )}>
      <div className="container flex h-14 items-center justify-center">
        <p className="text-sm text-muted-foreground">Aaditya Bisaria</p>
      </div>
    </footer>
  );
}