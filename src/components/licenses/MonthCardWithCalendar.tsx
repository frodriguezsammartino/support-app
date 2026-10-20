"use client";

import { useState } from "react";
import { CalendarDays, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { MoneyCard, type MoneyRow } from "./LicensesSummary";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * "A pagar este mes" que, al tocarlo, abre el calendario de los próximos 12 meses
 * como una ventana grande por encima de la pantalla. El calendario ocupa lugar
 * solo cuando se lo pide, y tiene un botón para llevarlo a pantalla completa.
 */
export function MonthCardWithCalendar({
  title,
  subtitle,
  rows,
  children,
}: {
  title: string;
  subtitle: string;
  rows: MoneyRow[];
  /** El calendario ya armado en el servidor. */
  children: React.ReactNode;
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
          <button
            type="button"
            className="block w-full cursor-pointer rounded-xl text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand"
          />
        }
      >
        <MoneyCard
          title={title}
          subtitle={subtitle}
          rows={rows}
          footer={
            <span className="mt-auto flex items-center gap-1.5 text-xs font-medium text-brand">
              <CalendarDays className="size-3.5" />
              Ver los próximos 12 meses
              <ChevronRight className="size-3.5" />
            </span>
          }
        />
      </DialogTrigger>

      <DialogContent
        showCloseButton
        className={
          expanded
            ? "h-dvh max-h-dvh w-screen max-w-none rounded-none sm:max-w-none"
            : "w-[95vw] sm:max-w-5xl"
        }
      >
        <DialogTitle className="sr-only">Pagos de los próximos 12 meses</DialogTitle>
        <DialogDescription className="sr-only">
          Qué se paga cada mes, por moneda.
        </DialogDescription>

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
