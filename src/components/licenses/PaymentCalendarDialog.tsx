"use client";

import { useState } from "react";
import { CalendarDays, Maximize2, Minimize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * El calendario de pagos de los próximos 12 meses no ocupa lugar en la pantalla:
 * se abre como una ventana grande por encima cuando se toca el botón, y se puede
 * pasar a pantalla completa.
 */
export function PaymentCalendarDialog({
  children,
  label = "Pagos de los próximos 12 meses",
}: {
  /** El calendario ya armado en el servidor. */
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setExpanded(false);
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <CalendarDays className="size-4" />
            {label}
          </Button>
        }
      />

      <DialogContent
        className={
          expanded
            ? "h-dvh max-h-dvh w-screen max-w-none rounded-none sm:max-w-none"
            : "w-[95vw] sm:max-w-5xl"
        }
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <DialogDescription className="sr-only">Qué se paga cada mes, por moneda.</DialogDescription>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-11"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Achicar" : "Pantalla completa"}
          aria-label={expanded ? "Achicar la ventana" : "Pasar a pantalla completa"}
        >
          {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>

        {children}
      </DialogContent>
    </Dialog>
  );
}
