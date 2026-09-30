import { TicketForm } from "@/components/tickets/TicketForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <Card className="border-t-4 border-t-blue-600 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Reportar un problema técnico</CardTitle>
            <CardDescription>
              Contanos qué está pasando y el técnico lo va a revisar a la brevedad. Vas a recibir un
              email cuando quede resuelto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TicketForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
