import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  OFFICE_CATALOG,
  OS_CATALOG,
  SUPPORT_META,
  getSupportState,
  supportEndDate,
  type SoftwareEntry,
} from "@/lib/os";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SoftwareAsset = {
  location: string | null;
  os: string | null;
  office: string | null;
};

type Counted = { label: string | null; count: number };

/** Cuántos equipos hay de cada producto; los sin dato van al final. */
function countBy(assets: SoftwareAsset[], key: "os" | "office"): Counted[] {
  const counts = new Map<string | null, number>();
  for (const a of assets) counts.set(a[key], (counts.get(a[key]) ?? 0) + 1);
  return Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => {
    if (a.label === null) return 1;
    if (b.label === null) return -1;
    return b.count - a.count || a.label.localeCompare(b.label);
  });
}

function formatEnd(date: Date) {
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
}

function ProductTable({
  title,
  rows,
  catalog,
  param,
}: {
  title: string;
  rows: Counted[];
  catalog: SoftwareEntry[];
  param: "os" | "office";
}) {
  return (
    <Card className="py-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title}</TableHead>
              <TableHead className="w-24 text-right">Equipos</TableHead>
              <TableHead className="w-40">Soporte</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ label, count }) => {
              const state = getSupportState(label, catalog);
              const meta = SUPPORT_META[state];
              const ended = label ? supportEndDate(label, catalog) : null;
              return (
                <TableRow key={label ?? "none"}>
                  <TableCell className="text-ink">{label ?? "Sin dato"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {label ? (
                      <Link
                        href={`/admin/equipos?${param}=${encodeURIComponent(label)}`}
                        className="text-brand hover:underline"
                      >
                        {count}
                      </Link>
                    ) : (
                      count
                    )}
                  </TableCell>
                  <TableCell>
                    {label ? (
                      <div className="flex flex-col leading-tight">
                        <Badge className={`w-fit ${meta.badgeClass}`}>{meta.label}</Badge>
                        {state === "ENDED" && ended && (
                          <span className="mt-0.5 text-xs text-slate-400">desde {formatEnd(ended)}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-ink-muted/70">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Qué software hay instalado, contado desde el inventario de equipos. No se carga
 * dos veces: el sistema operativo es un dato de cada equipo y esto lo suma.
 */
export function OsInventory({ assets }: { assets: SoftwareAsset[] }) {
  if (assets.length === 0) return null;

  const osRows = countBy(assets, "os");
  const officeRows = countBy(assets, "office");

  const unsupported = assets.filter(
    (a) => getSupportState(a.os, OS_CATALOG) === "ENDED"
  ).length;
  const unsupportedOffice = assets.filter(
    (a) => getSupportState(a.office, OFFICE_CATALOG) === "ENDED"
  ).length;

  // Por sector: dónde están concentrados los equipos sin soporte.
  const bySector = new Map<string, { total: number; ended: number }>();
  for (const a of assets) {
    const key = a.location?.trim() || "Sin ubicación";
    const row = bySector.get(key) ?? { total: 0, ended: 0 };
    row.total += 1;
    if (getSupportState(a.os, OS_CATALOG) === "ENDED") row.ended += 1;
    bySector.set(key, row);
  }
  const sectors = Array.from(bySector, ([sector, v]) => ({ sector, ...v })).sort(
    (a, b) => b.ended - a.ended || a.sector.localeCompare(b.sector)
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">Sistemas operativos y ofimática</h2>
        <p className="text-xs text-ink-muted">
          Se cuenta desde el inventario de equipos: {assets.length} equipo
          {assets.length === 1 ? "" : "s"} con sistema instalado.
        </p>
      </div>

      {unsupported + unsupportedOffice > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#991B1B]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">
              {unsupported} de {assets.length} equipos tienen un sistema operativo sin soporte
            </span>
            {unsupportedOffice > 0 && ` y ${unsupportedOffice} una ofimática sin soporte`}. Ya no
            reciben actualizaciones de seguridad; con datos de pacientes en la red conviene
            planificar el cambio.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProductTable title="Sistema operativo" rows={osRows} catalog={OS_CATALOG} param="os" />
        <ProductTable title="Ofimática" rows={officeRows} catalog={OFFICE_CATALOG} param="office" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-ink">Por sector</CardTitle>
          <p className="text-xs text-slate-400">primero los que más equipos sin soporte tienen</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sector</TableHead>
                <TableHead className="w-24 text-right">Equipos</TableHead>
                <TableHead className="w-40 text-right">Con SO sin soporte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors.map((s) => (
                <TableRow key={s.sector}>
                  <TableCell className="text-ink">{s.sector}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.total}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      s.ended === 0 ? "text-ink-muted/70" : SUPPORT_META.ENDED.textClass
                    }`}
                  >
                    {s.ended === 0 ? "—" : s.ended}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
