"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { AlertTriangle, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adjustAssignedSeats, deleteLicense } from "@/lib/actions/licenses";
import {
  ALERT_META,
  BILLING_LABELS,
  KIND_ORDER,
  KIND_SHORT,
  PRICING_LABELS,
  formatAmount,
  hasSeats,
  totalCostCents,
  wastedCostCents,
  LICENSE_STATUS_META,
  LICENSE_STATUS_ORDER,
  getLicenseAlert,
  type LicenseBilling,
  type LicenseKind,
  type LicenseStatus,
} from "@/lib/licenses";
import { EditLicenseDialog, type EditableLicense } from "./EditLicenseDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";

export type LicenseRow = EditableLicense & { code: number };

export function LicensesTable({ licenses }: { licenses: LicenseRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [kindFilter, setKindFilter] = useState<string>("ALL");

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return licenses.filter((l) => {
      if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
      if (kindFilter !== "ALL" && l.kind !== kindFilter) return false;
      if (!needle) return true;
      return [l.name, l.vendor, `#${l.code}`]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [licenses, search, statusFilter, kindFilter]);

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Buscar</span>
          <Input
            className="h-9 w-56"
            placeholder="Nombre o proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Tipo</span>
          <Select value={kindFilter} onValueChange={(v) => v && setKindFilter(v)}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue>
                {(v: string) => (v === "ALL" ? "Todos" : KIND_SHORT[v as LicenseKind])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {KIND_ORDER.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_SHORT[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Estado</span>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue>
                {(v: string) => (v === "ALL" ? "Todas" : LICENSE_STATUS_META[v as LicenseStatus].label)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {LICENSE_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {LICENSE_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MobileRecords>
        {visible.length === 0 && (
          <EmptyRecords>
            {licenses.length === 0
              ? "Todavía no cargaste ninguna licencia ni servicio."
              : "Nada coincide con estos filtros."}
          </EmptyRecords>
        )}

        {visible.map((license) => {
          const statusMeta = LICENSE_STATUS_META[license.status];
          const alertMeta = ALERT_META[getLicenseAlert(license)];
          const available = license.seatsTotal - license.seatsAssigned;
          return (
            <RecordCard key={license.id} className={statusMeta.rowClass}>
              <RecordTop>
                <span className="min-w-0 font-medium text-ink">
                  <span className="text-slate-400">#{license.code}</span> {license.name}
                </span>
                <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
              </RecordTop>
              <p className="mt-0.5 text-xs text-ink-muted">
                {KIND_SHORT[license.kind]}
                {license.vendor && ` · ${license.vendor}`}
              </p>

              <RecordFields>
                <RecordField label="Puestos">
                  {!hasSeats(license.pricing) ? (
                    <span className="text-ink-muted">Sin límite</span>
                  ) : (
                  <>
                  <span className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Liberar un puesto"
                      disabled={isPending || license.seatsAssigned === 0}
                      onClick={() => run(() => adjustAssignedSeats(license.id, -1))}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="tabular-nums">
                      {license.seatsAssigned} / {license.seatsTotal}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Asignar un puesto"
                      disabled={isPending}
                      onClick={() => run(() => adjustAssignedSeats(license.id, 1))}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </span>
                  <span
                    className={`block text-xs ${
                      available < 0 ? "font-medium text-[#991B1B]" : "text-ink-muted"
                    }`}
                  >
                    {available < 0
                      ? `${Math.abs(available)} de más en uso`
                      : `${available} disponible${available === 1 ? "" : "s"}`}
                  </span>
                  </>
                  )}
                </RecordField>

                <RecordField label="Costo">
                  {license.currency} {formatAmount(totalCostCents(license))}
                  <span className="block text-xs text-slate-400">
                    {BILLING_LABELS[license.billing as LicenseBilling]} ·{" "}
                    {PRICING_LABELS[license.pricing]}
                  </span>
                  {wastedCostCents(license) > 0 && (
                    <span className="mt-0.5 block text-xs font-medium text-[#991B1B]">
                      {license.currency} {formatAmount(wastedCostCents(license))} sin usar
                    </span>
                  )}
                </RecordField>

                <RecordField label="Vence">
                  <span className={`flex items-center justify-end gap-1.5 ${alertMeta.className}`}>
                    {license.autoRenew && <RefreshCw className="size-3.5" />}
                    {alertMeta.label}
                  </span>
                  {license.expiresAt && (
                    <span className="block text-xs text-slate-400">
                      {format(license.expiresAt, "dd/MM/yyyy")}
                    </span>
                  )}
                </RecordField>
              </RecordFields>

              <RecordActions>
                <EditLicenseDialog license={license} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm(`¿Eliminar la licencia "${license.name}"?`)) return;
                    run(() => deleteLicense(license.id));
                  }}
                  className="text-[#991B1B] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              </RecordActions>
            </RecordCard>
          );
        })}
      </MobileRecords>

      <DesktopTable>
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Licencia / servicio</TableHead>
                  <TableHead className="w-56">Puestos</TableHead>
                  <TableHead className="w-44">Costo</TableHead>
                  <TableHead className="w-48">Vence / se renueva</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-ink-muted">
                      {licenses.length === 0
                        ? "Todavía no cargaste ninguna licencia ni servicio."
                        : "Nada coincide con estos filtros."}
                    </TableCell>
                  </TableRow>
                )}

                {visible.map((license) => {
                  const statusMeta = LICENSE_STATUS_META[license.status];
                  const alertMeta = ALERT_META[getLicenseAlert(license)];
                  const available = license.seatsTotal - license.seatsAssigned;
                  return (
                    <TableRow key={license.id} className={statusMeta.rowClass}>
                      <TableCell className="text-slate-400">#{license.code}</TableCell>

                      <TableCell>
                        <span className="font-medium">{license.name}</span>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {KIND_SHORT[license.kind]}
                          {license.vendor && ` · ${license.vendor}`}
                        </p>
                      </TableCell>

                      <TableCell>
                        {!hasSeats(license.pricing) ? (
                          <span className="text-sm text-ink-muted">Sin límite</span>
                        ) : (
                        <>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Liberar un puesto"
                            disabled={isPending || license.seatsAssigned === 0}
                            onClick={() => run(() => adjustAssignedSeats(license.id, -1))}
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="text-sm tabular-nums">
                            {license.seatsAssigned} / {license.seatsTotal}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Asignar un puesto"
                            disabled={isPending}
                            onClick={() => run(() => adjustAssignedSeats(license.id, 1))}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                        <p
                          className={`mt-0.5 text-xs ${
                            available < 0
                              ? "font-medium text-[#991B1B]"
                              : available === 0
                                ? "text-[#92400E]"
                                : "text-ink-muted"
                          }`}
                        >
                          {available < 0
                            ? `${Math.abs(available)} de más en uso`
                            : `${available} disponible${available === 1 ? "" : "s"}`}
                        </p>
                        </>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className="text-ink">
                            {license.currency} {formatAmount(totalCostCents(license))}
                          </span>
                          <span className="text-xs text-slate-400">
                            {BILLING_LABELS[license.billing as LicenseBilling]} ·{" "}
                            {PRICING_LABELS[license.pricing]}
                          </span>
                          {wastedCostCents(license) > 0 && (
                            <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#991B1B]">
                              <AlertTriangle className="size-3" />
                              {license.currency} {formatAmount(wastedCostCents(license))} sin usar
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className={`flex items-center gap-1.5 ${alertMeta.className}`}>
                            {license.autoRenew && <RefreshCw className="size-3.5" />}
                            {alertMeta.label}
                          </span>
                          {license.expiresAt && (
                            <span className="text-xs text-slate-400">
                              {format(license.expiresAt, "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <EditLicenseDialog license={license} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Eliminar"
                            disabled={isPending}
                            onClick={() => {
                              if (!confirm(`¿Eliminar la licencia "${license.name}"?`)) return;
                              run(() => deleteLicense(license.id));
                            }}
                            className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DesktopTable>
    </div>
  );
}
