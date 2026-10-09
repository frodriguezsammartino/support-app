"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAsset } from "@/lib/actions/assets";
import {
  ASSET_STATUS_META,
  ASSET_STATUS_ORDER,
  ASSET_TYPE_ORDER,
  ASSET_TYPE_SHORT,
  WARRANTY_META,
  getWarrantyState,
  type AssetStatus,
  type AssetType,
} from "@/lib/assets";
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

export type AssetRow = {
  id: string;
  code: number;
  name: string;
  type: AssetType;
  status: AssetStatus;
  brand: string | null;
  model: string | null;
  location: string | null;
  warrantyUntil: Date | null;
  openTickets: number;
  totalTickets: number;
};

export function AssetsTable({ assets }: { assets: AssetRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (!needle) return true;
      return [a.name, a.location, a.brand, a.model, `#${a.code}`]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [assets, search, typeFilter, statusFilter]);

  function handleDelete(asset: AssetRow) {
    if (!confirm(`¿Eliminar "${asset.name}" del inventario?`)) return;
    startTransition(async () => {
      const result = await deleteAsset(asset.id);
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
            placeholder="Nombre, ubicación, marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Tipo</span>
          <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue>
                {(v: string) => (v === "ALL" ? "Todos" : ASSET_TYPE_SHORT[v as AssetType])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {ASSET_TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {ASSET_TYPE_SHORT[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Estado</span>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue>
                {(v: string) => (v === "ALL" ? "Todos" : ASSET_STATUS_META[v as AssetStatus].label)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {ASSET_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {ASSET_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MobileRecords>
        {visible.length === 0 && (
          <EmptyRecords>
            {assets.length === 0
              ? "Todavía no cargaste ningún equipo."
              : "Ningún equipo coincide con estos filtros."}
          </EmptyRecords>
        )}

        {visible.map((asset) => {
          const statusMeta = ASSET_STATUS_META[asset.status];
          const warrantyMeta = WARRANTY_META[getWarrantyState(asset.warrantyUntil)];
          return (
            <RecordCard key={asset.id} className={statusMeta.rowClass}>
              <RecordTop>
                <Link href={`/admin/equipos/${asset.id}`} className="min-w-0 font-medium text-ink">
                  <span className="text-slate-400">#{asset.code}</span> {asset.name}
                </Link>
                <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
              </RecordTop>

              <RecordFields>
                <RecordField label="Tipo">{ASSET_TYPE_SHORT[asset.type]}</RecordField>
                <RecordField label="Ubicación">{asset.location ?? "—"}</RecordField>
                {(asset.brand || asset.model) && (
                  <RecordField label="Marca">
                    {[asset.brand, asset.model].filter(Boolean).join(" ")}
                  </RecordField>
                )}
                <RecordField label="Garantía">
                  <span className={warrantyMeta.className}>{warrantyMeta.label}</span>
                  {asset.warrantyUntil && (
                    <span className="block text-xs text-slate-400">
                      {format(asset.warrantyUntil, "dd/MM/yyyy")}
                    </span>
                  )}
                </RecordField>
                <RecordField label="Tickets">
                  {asset.openTickets} abierto{asset.openTickets === 1 ? "" : "s"} de {asset.totalTickets}
                </RecordField>
              </RecordFields>

              <RecordActions>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(asset)}
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
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead className="w-44">Ubicación</TableHead>
                  <TableHead className="w-36">Estado</TableHead>
                  <TableHead className="w-40">Garantía</TableHead>
                  <TableHead className="w-28">Tickets</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-ink-muted">
                      {assets.length === 0
                        ? "Todavía no cargaste ningún equipo."
                        : "Ningún equipo coincide con estos filtros."}
                    </TableCell>
                  </TableRow>
                )}

                {visible.map((asset) => {
                  const statusMeta = ASSET_STATUS_META[asset.status];
                  const warranty = getWarrantyState(asset.warrantyUntil);
                  const warrantyMeta = WARRANTY_META[warranty];
                  return (
                    <TableRow key={asset.id} className={statusMeta.rowClass}>
                      <TableCell className="text-slate-400">#{asset.code}</TableCell>
                      <TableCell>
                        <Link href={`/admin/equipos/${asset.id}`} className="font-medium text-ink hover:underline">
                          {asset.name}
                        </Link>
                        {(asset.brand || asset.model) && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {[asset.brand, asset.model].filter(Boolean).join(" ")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-ink-muted">{ASSET_TYPE_SHORT[asset.type]}</TableCell>
                      <TableCell className="text-ink-muted">{asset.location ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className={warrantyMeta.className}>{warrantyMeta.label}</span>
                          {asset.warrantyUntil && (
                            <span className="text-xs text-slate-400">
                              {format(asset.warrantyUntil, "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className={asset.openTickets > 0 ? "font-medium text-brand" : "text-ink-muted"}>
                            {asset.openTickets} abierto{asset.openTickets === 1 ? "" : "s"}
                          </span>
                          <span className="text-xs text-slate-400">{asset.totalTickets} en total</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Eliminar"
                          disabled={isPending}
                          onClick={() => handleDelete(asset)}
                          className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
