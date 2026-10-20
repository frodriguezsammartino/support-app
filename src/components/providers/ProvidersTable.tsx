"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProvider } from "@/lib/actions/providers";
import { ESCALATION_META, type EscalationStatus } from "@/lib/escalation";
import { useIsAdmin } from "@/components/RoleProvider";
import { ProviderDialog, type EditableProvider } from "./ProviderDialog";
import {
  DesktopTable,
  EmptyRecords,
  MobileRecords,
  RecordActions,
  RecordCard,
  RecordField,
  RecordFields,
  RecordTop,
} from "@/components/ui/record-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ProviderRow = EditableProvider & {
  /** Tickets escalados a este proveedor que todavía no resolvió. */
  open: { id: string; number: number; status: EscalationStatus }[];
};

function Contact({ provider }: { provider: ProviderRow }) {
  if (!provider.contactName && !provider.phone && !provider.email) {
    return <span className="text-ink-muted/70">Sin datos de contacto</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      {provider.contactName && <span className="text-ink">{provider.contactName}</span>}
      {provider.phone && (
        <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-xs text-brand hover:underline">
          <Phone className="size-3" />
          {provider.phone}
        </a>
      )}
      {provider.email && (
        <a href={`mailto:${provider.email}`} className="flex items-center gap-1.5 text-xs text-brand hover:underline">
          <Mail className="size-3" />
          {provider.email}
        </a>
      )}
    </div>
  );
}

function InProgress({ provider }: { provider: ProviderRow }) {
  if (provider.open.length === 0) return <span className="text-ink-muted/70">Nada pendiente</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {provider.open.map((t) => (
        <Link key={t.id} href={`/admin/tickets/${t.id}`}>
          <Badge className={ESCALATION_META[t.status].badgeClass}>
            #{t.number} · {ESCALATION_META[t.status].short}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

/**
 * La lista de proveedores externos: quién es, qué cubre y con quién se habla, y
 * qué tickets están hoy esperando algo de cada uno.
 */
export function ProvidersTable({ providers }: { providers: ProviderRow[] }) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();

  function handleDelete(provider: ProviderRow) {
    if (!confirm(`¿Eliminar a "${provider.name}" de la lista de proveedores?`)) return;
    startTransition(async () => {
      const result = await deleteProvider(provider.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const editButton = (
    <Button variant="ghost" size="icon-sm" title="Editar" aria-label="Editar">
      <Pencil className="size-4" />
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">
          Proveedores <span className="font-normal text-ink-muted">({providers.length})</span>
        </h2>
        <ProviderDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              Nuevo proveedor
            </Button>
          }
        />
      </div>

      <MobileRecords>
        {providers.length === 0 && (
          <EmptyRecords>Todavía no cargaste ningún proveedor.</EmptyRecords>
        )}
        {providers.map((provider) => (
          <RecordCard key={provider.id}>
            <RecordTop>
              <span className="min-w-0 font-medium text-ink">{provider.name}</span>
            </RecordTop>
            {provider.covers && <p className="mt-0.5 text-xs text-ink-muted">{provider.covers}</p>}
            <RecordFields>
              <RecordField label="Contacto">
                <Contact provider={provider} />
              </RecordField>
              <RecordField label="En curso">
                <InProgress provider={provider} />
              </RecordField>
            </RecordFields>
            <RecordActions>
              <ProviderDialog provider={provider} trigger={editButton} />
              {isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(provider)}
                  className="text-[#991B1B] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              )}
            </RecordActions>
          </RecordCard>
        ))}
      </MobileRecords>

      <DesktopTable>
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="w-64">Contacto</TableHead>
                  <TableHead className="w-64">En curso</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-ink-muted">
                      Todavía no cargaste ningún proveedor.
                    </TableCell>
                  </TableRow>
                )}
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="align-top">
                      <span className="font-medium text-ink">{provider.name}</span>
                      {provider.covers && (
                        <p className="mt-0.5 text-xs text-ink-muted">{provider.covers}</p>
                      )}
                      {provider.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">{provider.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Contact provider={provider} />
                    </TableCell>
                    <TableCell className="align-top">
                      <InProgress provider={provider} />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center justify-end gap-1">
                        <ProviderDialog provider={provider} trigger={editButton} />
                        {isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Eliminar"
                            disabled={isPending}
                            onClick={() => handleDelete(provider)}
                            className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DesktopTable>
    </div>
  );
}
