import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TicketCargadoPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-t-4 border-t-brand">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
            <CheckCircle2 className="size-7" />
          </span>
          <p className="text-lg font-medium text-ink">Tu ticket se cargó correctamente.</p>
          <p className="text-sm text-ink-muted">Pronto recibirás un correo con más información.</p>
          <Button
            render={<Link href="/" />}
            nativeButton={false}
            className="mt-2 bg-brand hover:bg-brand-hover"
          >
            Cargar otro ticket
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
