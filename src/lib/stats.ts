import { Prisma } from "@prisma/client";
import { db } from "./db";
import { PRIORITY_META, PRIORITY_ORDER, STATUS_LABELS } from "./priority";

export type StatsFilters = {
  from?: Date;
  categoryId?: string;
};

export function rangeToFromDate(range: string): Date | undefined {
  if (range === "all") return undefined;
  const days = Number(range);
  if (Number.isNaN(days)) return undefined;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function baseWhere(filters: StatsFilters) {
  const conditions: Prisma.Sql[] = [];
  if (filters.from) conditions.push(Prisma.sql`t."createdAt" >= ${filters.from}`);
  if (filters.categoryId) conditions.push(Prisma.sql`t."categoryId" = ${filters.categoryId}`);
  return conditions;
}

function whereClause(conditions: Prisma.Sql[]) {
  if (conditions.length === 0) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export async function getKpis(filters: StatsFilters = {}) {
  const prismaWhere: Record<string, unknown> = {};
  if (filters.from) prismaWhere.createdAt = { gte: filters.from };
  if (filters.categoryId) prismaWhere.categoryId = filters.categoryId;

  const [total, backlog, inProgress, completed] = await Promise.all([
    db.ticket.count({ where: prismaWhere }),
    db.ticket.count({ where: { ...prismaWhere, status: "BACKLOG" } }),
    db.ticket.count({ where: { ...prismaWhere, status: "IN_PROGRESS" } }),
    db.ticket.count({ where: { ...prismaWhere, status: "COMPLETED" } }),
  ]);

  const conditions = [Prisma.sql`status = 'COMPLETED'`, Prisma.sql`"completedAt" IS NOT NULL`, ...baseWhere(filters)];
  const avg = await db.$queryRaw<{ avg_hours: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 3600)::float AS avg_hours
    FROM "Ticket" t
    ${whereClause(conditions)}
  `;

  return {
    total,
    backlog,
    inProgress,
    completed,
    avgResolutionHours: avg[0]?.avg_hours ?? null,
  };
}

export async function getTicketsByCategory(filters: StatsFilters = {}) {
  const conditions = baseWhere(filters);
  const rows = await db.$queryRaw<{ name: string; count: bigint }[]>`
    SELECT COALESCE(c.name, 'Sin categoría') AS name, COUNT(*)::bigint AS count
    FROM "Ticket" t
    LEFT JOIN "Category" c ON c.id = t."categoryId"
    ${whereClause(conditions)}
    GROUP BY c.name
    ORDER BY count DESC
  `;
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

export async function getTicketsByStatus(filters: StatsFilters = {}) {
  const prismaWhere: Record<string, unknown> = {};
  if (filters.from) prismaWhere.createdAt = { gte: filters.from };
  if (filters.categoryId) prismaWhere.categoryId = filters.categoryId;

  const rows = await db.ticket.groupBy({ by: ["status"], where: prismaWhere, _count: true });
  return rows.map((r) => ({ status: STATUS_LABELS[r.status] ?? r.status, count: r._count }));
}

export async function getResolutionTimeByCategory(filters: StatsFilters = {}) {
  const conditions = [
    Prisma.sql`t.status = 'COMPLETED'`,
    Prisma.sql`t."completedAt" IS NOT NULL`,
    ...baseWhere(filters),
  ];
  const rows = await db.$queryRaw<{ name: string; avg_hours: number | null }[]>`
    SELECT COALESCE(c.name, 'Sin categoría') AS name,
           AVG(EXTRACT(EPOCH FROM (t."completedAt" - t."createdAt")) / 3600)::float AS avg_hours
    FROM "Ticket" t
    LEFT JOIN "Category" c ON c.id = t."categoryId"
    ${whereClause(conditions)}
    GROUP BY c.name
    ORDER BY avg_hours DESC
  `;
  return rows.map((r) => ({ name: r.name, avgHours: r.avg_hours ? Math.round(r.avg_hours * 10) / 10 : 0 }));
}

export async function getTicketsByPriority(filters: StatsFilters = {}) {
  const prismaWhere: Record<string, unknown> = {};
  if (filters.from) prismaWhere.createdAt = { gte: filters.from };
  if (filters.categoryId) prismaWhere.categoryId = filters.categoryId;

  const rows = await db.ticket.groupBy({ by: ["priority"], where: prismaWhere, _count: true });
  const counts = new Map(rows.map((r) => [r.priority, r._count]));

  const byPriority = PRIORITY_ORDER.map((p) => ({
    priority: PRIORITY_META[p].label,
    count: counts.get(p) ?? 0,
  }));

  const sinClasificar = counts.get(null) ?? 0;
  if (sinClasificar > 0) byPriority.push({ priority: "Sin clasificar", count: sinClasificar });

  return byPriority;
}

/** Antigüedad del ticket abierto más viejo, en horas. Null si no hay ninguno abierto. */
export async function getOldestOpenTicketAgeHours(filters: StatsFilters = {}) {
  const prismaWhere: Record<string, unknown> = { status: { in: ["BACKLOG", "IN_PROGRESS"] } };
  if (filters.from) prismaWhere.createdAt = { gte: filters.from };
  if (filters.categoryId) prismaWhere.categoryId = filters.categoryId;

  const oldest = await db.ticket.findFirst({
    where: prismaWhere,
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (!oldest) return null;
  return (Date.now() - oldest.createdAt.getTime()) / 3_600_000;
}

/** Los mantenimientos no se filtran por categoría: no tienen. Solo por período. */
export async function getMaintenanceCompletionCount(filters: StatsFilters = {}) {
  return db.maintenanceCompletion.count({
    where: filters.from ? { completedAt: { gte: filters.from } } : undefined,
  });
}

export async function getMaintenanceWeeklyTrend(filters: StatsFilters = {}) {
  const where = filters.from
    ? Prisma.sql`WHERE "completedAt" >= ${filters.from}`
    : Prisma.empty;

  const rows = await db.$queryRaw<{ week: Date; count: bigint }[]>`
    SELECT date_trunc('week', "completedAt") AS week, COUNT(*)::bigint AS count
    FROM "MaintenanceCompletion"
    ${where}
    GROUP BY week
    ORDER BY week ASC
  `;
  return rows.map((r) => ({
    week: r.week.toISOString().slice(0, 10),
    count: Number(r.count),
  }));
}

/** Equipos con más tickets: los que más laburo generan. */
export async function getTicketsByAsset(filters: StatsFilters = {}, limit = 8) {
  const conditions = [Prisma.sql`t."assetId" IS NOT NULL`, ...baseWhere(filters)];
  const rows = await db.$queryRaw<{ name: string; count: bigint }[]>`
    SELECT a.name AS name, COUNT(*)::bigint AS count
    FROM "Ticket" t
    JOIN "Asset" a ON a.id = t."assetId"
    ${whereClause(conditions)}
    GROUP BY a.name
    ORDER BY count DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

export async function getWeeklyTrend(filters: StatsFilters = {}) {
  const conditions = baseWhere(filters);
  const rows = await db.$queryRaw<{ week: Date; count: bigint }[]>`
    SELECT date_trunc('week', "createdAt") AS week, COUNT(*)::bigint AS count
    FROM "Ticket" t
    ${whereClause(conditions)}
    GROUP BY week
    ORDER BY week ASC
  `;
  return rows.map((r) => ({
    week: r.week.toISOString().slice(0, 10),
    count: Number(r.count),
  }));
}
