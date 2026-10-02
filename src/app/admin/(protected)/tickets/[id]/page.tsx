import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { PriorityBadge } from "@/components/tickets/PriorityBadge";
import { CommentForm } from "@/components/tickets/CommentForm";
import { TicketAdminControls } from "@/components/tickets/TicketAdminControls";
import { TicketTitleEditor } from "@/components/tickets/TicketTitleEditor";
import { TicketAssetEditor } from "@/components/assets/TicketAssetEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function TicketDetailPage(props: PageProps<"/admin/tickets/[id]">) {
  const { id } = await props.params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) notFound();

  const [categories, assets] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.asset.findMany({
      where: { status: { not: "RETIRED" } },
      select: { id: true, code: true, name: true, location: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link href="/admin" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" />
        Volver al inicio
      </Link>

      <Card className="border-t-4 border-t-blue-600">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">
              <span className="text-zinc-400">#{ticket.number}</span>{" "}
              <TicketTitleEditor
                ticketId={ticket.id}
                title={ticket.title}
                inputClassName="h-9 min-w-64 text-xl font-semibold"
                buttonClassName="text-left text-xl font-semibold hover:underline"
              />
            </CardTitle>
            <div className="flex gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap text-sm text-zinc-700">
            {ticket.description || "Sin descripción adicional."}
          </p>
          <Separator />
          <div className="grid gap-1 text-sm text-zinc-500 sm:grid-cols-2">
            <p>Reportado por: {ticket.reporterName}</p>
            <p>Email: {ticket.reporterEmail}</p>
            <p>Categoría: {ticket.category?.name ?? "Sin categoría"}</p>
            <p>Creado: {ticket.createdAt.toLocaleString("es-AR")}</p>
            {ticket.completedAt && <p>Resuelto: {ticket.completedAt.toLocaleString("es-AR")}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500">Equipo:</span>
            <TicketAssetEditor ticketId={ticket.id} assetId={ticket.assetId} assets={assets} />
          </div>
          {ticket.resolutionNote && (
            <div className="rounded-lg bg-zinc-50 p-3 text-sm">
              <p className="font-medium">Nota de resolución</p>
              <p className="whitespace-pre-wrap text-zinc-700">{ticket.resolutionNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TicketAdminControls ticket={ticket} categories={categories} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas internas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ticket.comments.length === 0 && (
            <p className="text-sm text-zinc-500">Todavía no hay notas.</p>
          )}
          {ticket.comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 text-xs text-zinc-500">{comment.createdAt.toLocaleString("es-AR")}</div>
              <p className="whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}
          <Separator />
          <CommentForm ticketId={ticket.id} />
        </CardContent>
      </Card>
    </div>
  );
}
