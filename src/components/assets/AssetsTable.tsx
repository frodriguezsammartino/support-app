"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { toast } from "sonner";
import { deleteAsset, updateAssetStatus } from "@/lib/actions/assets";
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
import { Input } from "@/components/ui/input";
import { useIsAdmin } from "@/components/RoleProvider";
import { RetireControl, RetirePendingBadge } from "@/components/requests/RetireControl";
import { RepairTicketDialog, type OpenTicketOption } from "./RepairTicketDialog";
import { OFFICE_CATALOG, OS_CATALOG, SUPPORT_META, getSupportState } from "@/lib/os";

export type AssetRow = {
  id: string;
  code: number;
  name: string;
  type: AssetType;
  status: AssetStatus;
  brand: string | null;
  model: string | null;
  location: string | null;
  owner: string | null;
  os: string | null;
  office: string | null;
  warrantyUntil: Date | null;
  openTickets: number;
  totalTickets: number;
};

/**
 * El estado del equipo, cambiable desde la lista: marcar una PC en reparación son
 * dos clics, sin abrir su ficha. Tiene el color del estado, como el pill de antes.
 */
function StatusSelect({
  status,
  disabled,
  onChange,
}: {
  status: AssetStatus;
  disabled: boolean;
  onChange: (status: AssetStatus) => void;
}) {
  const meta = ASSET_STATUS_META[status];
  return (
    <Select value={status} onValueChange={(v) => v && v !== status && onChange(v as AssetStatus)} disabled={disabled}>
      <SelectTrigger
        size="sm"
        aria-label="Cambiar el estado"
        className={`h-7 w-auto gap-1 rounded-full border-transparent px-2.5 text-xs font-medium ${meta.badgeClass}`}
      >
        <SelectValue>{(v: string) => ASSET_STATUS_META[v as AssetStatus].label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ASSET_STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {ASSET_STATUS_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Sistema operativo y ofimática en una línea, con rojo si alguno ya no tiene soporte. */
function SoftwareLine({ os, office }: { os: string | null; office: string | null }) {
  if (!os && !office) return null;
  const ended =
    getSupportState(os, OS_CATALOG) === "ENDED" || getSupportState(office, OFFICE_CATALOG) === "ENDED";
  return (
    <p className={`mt-0.5 text-xs ${ended ? SUPPORT_META.ENDED.textClass : "text-ink-muted"}`}>
      {[os, office].filter(Boolean).join(" · ")}
    </p>
  );
}

const NO_DATA = "__NO_DATA__";

export function AssetsTable({
  assets,
  initialOs = "ALL",
  initialOffice = "ALL",
  retirePendingIds = [],
  categories = [],
  unassignedTickets = [],
}: {
  assets: AssetRow[];
  /** Equipos con una baja pedida que el admin todavía no resolvió. */
  retirePendingIds?: string[];
  /** Llegar desde el panel de licencias ya filtrado por un sistema operativo. */
  initialOs?: string;
  initialOffice?: string;
  /** Para ofrecer cargar el ticket cuando un equipo pasa a reparación. */
  categories?: { id: string; name: string }[];
  /** Tickets abiertos que todavía no tienen equipo, para vincular uno existente. */
  unassignedTickets?: OpenTicketOption[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const retirePending = useMemo(() => new Set(retirePendingIds), [retirePendingIds]);
  const [isPending, startTransition] = useTransition();
  const [statusOverride, setStatusOverride] = useState<Record<string, AssetStatus>>({});
  const [repairFor, setRepairFor] = useState<AssetRow | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [osFilter, setOsFilter] = useState<string>(initialOs);
  const [officeFilter, setOfficeFilter] = useState<string>(initialOffice);

  // Solo se ofrecen los sistemas que realmente hay cargados.
  const osOptions = useMemo(
    () => Array.from(new Set(assets.map((a) => a.os).filter((v): v is string => !!v))).sort(),
    [assets]
  );
  const officeOptions = useMemo(
    () => Array.from(new Set(assets.map((a) => a.office).filter((v): v is string => !!v))).sort(),
    [assets]
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (osFilter === NO_DATA ? !!a.os : osFilter !== "ALL" && a.os !== osFilter) return false;
      if (officeFilter === NO_DATA ? !!a.office : officeFilter !== "ALL" && a.office !== officeFilter) return false;
      if (!needle) return true;
      return [a.name, a.location, a.brand, a.model, a.os, a.office, `#${a.code}`]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [assets, search, typeFilter, statusFilter, osFilter, officeFilter]);

  function changeStatus(asset: AssetRow, status: AssetStatus) {
    startTransition(async () => {
      const result = await updateAssetStatus(asset.id, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setStatusOverride((current) => ({ ...current, [asset.id]: status }));
      router.refresh();

      // Pasó a reparación y no hay ticket que la siga: se ofrece cargarlo.
      if (status === "REPAIR" && asset.openTickets === 0 && categories.length > 0) {
        setRepairFor(asset);
      }
    });
  }

  function handleDelete(asset: AssetRow) {
    if (!confirm(`¿Eliminar "${asset.name}" del inventario?`)) return;

    startTransition(async () => {
      const result = await deleteAsset(asset.id);

      // Tiene historial: se avisa qué queda y se vuelve a pedir confirmación.
      if (result.code === "HAS_LINKS") {
        const partes = [
          result.tickets ? `${result.tickets} ticket${result.tickets === 1 ? "" : "s"}` : null,
          result.tasks
            ? `${result.tasks} tarea${result.tasks === 1 ? "" : "s"} de mantenimiento`
            : null,
        ].filter(Boolean);

        const ok = confirm(
          `"${asset.name}" tiene ${partes.join(" y ")} asociados.

` +
            "Si lo borrás, ese historial se conserva pero deja de estar vinculado al equipo. " +
            "¿Querés borrarlo igual?"
        );
        if (!ok) return;

        const forced = await deleteAsset(asset.id, true);
        if (forced.error) {
          toast.error(forced.error);
          return;
        }
        toast.success("Equipo eliminado.");
        router.refresh();
        return;
      }

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
            placeholder="Nombre, ubicación, sistema..."
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

        {osOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Sistema operativo</span>
            <Select value={osFilter} onValueChange={(v) => v && setOsFilter(v)}>
              <SelectTrigger size="sm" className="w-48">
                <SelectValue>
                  {(v: string) => (v === "ALL" ? "Todos" : v === NO_DATA ? "Sin dato" : v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {osOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
                <SelectItem value={NO_DATA}>Sin dato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {officeOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Ofimática</span>
            <Select value={officeFilter} onValueChange={(v) => v && setOfficeFilter(v)}>
              <SelectTrigger size="sm" className="w-48">
                <SelectValue>
                  {(v: string) => (v === "ALL" ? "Todas" : v === NO_DATA ? "Sin dato" : v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {officeOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
                <SelectItem value={NO_DATA}>Sin dato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
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
          const shownStatus = statusOverride[asset.id] ?? asset.status;
          const statusMeta = ASSET_STATUS_META[shownStatus];
          const warrantyMeta = WARRANTY_META[getWarrantyState(asset.warrantyUntil)];
          return (
            <RecordCard key={asset.id} className={statusMeta.rowClass}>
              <RecordTop>
                <Link href={`/admin/equipos/${asset.id}`} className="min-w-0 font-medium text-ink">
                  <span className="text-slate-400">#{asset.code}</span> {asset.name}
                </Link>
                <StatusSelect
                  status={shownStatus}
                  disabled={isPending}
                  onChange={(s) => changeStatus(asset, s)}
                />
              </RecordTop>

              <RecordFields>
                <RecordField label="Tipo">{ASSET_TYPE_SHORT[asset.type]}</RecordField>
                <RecordField label="Ubicación">{asset.location ?? "—"}</RecordField>
                {asset.owner && <RecordField label="Responsable">{asset.owner}</RecordField>}
                {(asset.os || asset.office) && (
                  <RecordField label="Sistema">
                    <SoftwareLine os={asset.os} office={asset.office} />
                  </RecordField>
                )}
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

              {retirePending.has(asset.id) && (
                <p className="mt-2">
                  <RetirePendingBadge show />
                </p>
              )}
              {(isAdmin || !retirePending.has(asset.id)) && (
                <RecordActions>
                  <RetireControl
                    target="ASSET"
                    id={asset.id}
                    name={asset.name}
                    variant="button"
                    pending={retirePending.has(asset.id)}
                    disabled={isPending}
                    onDelete={() => handleDelete(asset)}
                  />
                </RecordActions>
              )}
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
                  <TableHead className="w-52">Ubicación / responsable</TableHead>
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
                  const shownStatus = statusOverride[asset.id] ?? asset.status;
                  const statusMeta = ASSET_STATUS_META[shownStatus];
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
                        <SoftwareLine os={asset.os} office={asset.office} />
                        {retirePending.has(asset.id) && (
                          <p className="mt-1">
                            <RetirePendingBadge show />
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-ink-muted">{ASSET_TYPE_SHORT[asset.type]}</TableCell>
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className="text-ink-muted">{asset.location ?? "—"}</span>
                          {asset.owner && (
                            <span className="text-xs text-slate-400">{asset.owner}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusSelect
                          status={shownStatus}
                          disabled={isPending}
                          onChange={(s) => changeStatus(asset, s)}
                        />
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
                        <RetireControl
                          target="ASSET"
                          id={asset.id}
                          name={asset.name}
                          variant="icon"
                          pending={retirePending.has(asset.id)}
                          disabled={isPending}
                          onDelete={() => handleDelete(asset)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DesktopTable>

      {repairFor && (
        <RepairTicketDialog
          key={repairFor.id}
          open
          onOpenChange={(open) => {
            if (!open) setRepairFor(null);
          }}
          assetId={repairFor.id}
          assetName={repairFor.name}
          categories={categories}
          openTickets={unassignedTickets}
        />
      )}
    </div>
  );
}
