import { TicketForm } from "@/components/tickets/TicketForm";

export default function Home() {
  return (
    <main className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-ink">Reportar un problema técnico</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Contanos qué está pasando y el técnico lo va a revisar a la brevedad. Vas a recibir un
            email cuando quede resuelto.
          </p>

          <div className="mt-6">
            <TicketForm />
          </div>
        </div>
      </div>
    </main>
  );
}
