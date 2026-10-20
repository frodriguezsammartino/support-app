/**
 * Carga lo que surgió del informe de Alfonso (octubre 2026): categorías de tickets
 * para las áreas que no tenían la suya, la infraestructura que el informe nombra
 * (para que él complete marca y ubicación), los dos incidentes recientes y la
 * corrección del día del test del grupo electrógeno.
 *
 *   npx tsx prisma/seed-infra.ts            -> solo muestra qué haría (no escribe)
 *   npx tsx prisma/seed-infra.ts --apply    -> lo aplica
 *
 * Es idempotente: cada cosa se identifica por nombre (o título), así que correrlo
 * dos veces no duplica nada. Nunca borra nada.
 */
import "dotenv/config";
import { PrismaClient, type AssetType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const db = new PrismaClient({ adapter });

const REPORTER = "Alfonso Araujo";
const FROM_REPORT = "Cargado desde el informe de Alfonso (20/10/2026). Completar marca, modelo y ubicación.";

const NEW_CATEGORIES = [
  "Rayos / PACS (Agfa)",
  "Firma digital",
  "Turnos online",
  "Fichadas / biométrico",
  "Archivo externo (MP BOX)",
];

type InfraAsset = { name: string; type: AssetType; location: string; notes: string };

/** Solo lo que el informe nombra de forma explícita; las cantidades las completa Alfonso. */
const INFRA: InfraAsset[] = [
  {
    name: "Grupo electrógeno 70 KVA",
    type: "OTHER",
    location: "Edificio (general)",
    notes: `Abastece toda la red eléctrica: ascensores, quirófano, UTI y el resto de los sistemas. Se prueba los sábados. ${FROM_REPORT}`,
  },
  {
    name: "Proyector",
    type: "OTHER",
    location: "Sin ubicar",
    notes: `El informe cuenta 1 proyector. ${FROM_REPORT}`,
  },
  {
    name: "Servidor Agfa (PACS / DICOM)",
    type: "SERVER",
    location: "Datacenter",
    notes: `Plataforma de imágenes médicas de Agfa. Soporte: ingenieros de Agfa; migración con ISF. ${FROM_REPORT}`,
  },
  {
    name: "Servidor Accis",
    type: "SERVER",
    location: "Datacenter",
    notes: `Sistema de gestión local Accis. ${FROM_REPORT}`,
  },
  {
    name: "Servidores de virtualización",
    type: "SERVER",
    location: "Datacenter",
    notes: `Hay un servidor principal y un segundo servidor de réplica (tarea de Virtualización). Cargar uno por uno con su sistema. ${FROM_REPORT}`,
  },
  {
    name: "Storage (almacenamiento)",
    type: "SERVER",
    location: "Datacenter",
    notes: `El informe habla de servidores y storages. Completar cantidad. ${FROM_REPORT}`,
  },
  {
    name: "Switches y patch panels (red LAN)",
    type: "NETWORK",
    location: "Datacenter",
    notes: `Incluye los enlaces de fibra óptica internos. Cargar cada switch por separado. ${FROM_REPORT}`,
  },
  {
    name: "Central telefónica (rack)",
    type: "PHONE",
    location: "Datacenter",
    notes: `Soporte externo: Plustel (acceso remoto seguro). ${FROM_REPORT}`,
  },
  {
    name: "Terminales biométricas de fichadas",
    type: "OTHER",
    location: "Sin ubicar",
    notes: `Fichero de personal para el registro de ingresos y egresos (Recursos Humanos). Completar cantidad y dónde está cada una. ${FROM_REPORT}`,
  },
];

const now = new Date();

const INCIDENTS = [
  {
    title: "Cartel de Guardia dañado por cortes de luz de Edea",
    categoryName: "Energía / UPS",
    assetName: "PC Llamador Guardia",
    description:
      "Edea cortó la luz de calle en 2 ocasiones y se dañó el hardware del cartel llamador de Guardia. Hubo que rearmar el puesto desde cero. Cargado el 20/10/2026 a partir del informe de Alfonso.",
    status: "COMPLETED" as const,
    createdAt: now,
    resolutionNote: "Se rearmó el puesto desde cero.",
    assetStatus: null,
  },
  {
    title: "Inundación en consultorios de ART: se dañó la PC del consultorio 3",
    categoryName: "Hardware",
    assetName: "PC Consultorio ART 3",
    description:
      "El miércoles 14/10 se inundaron los consultorios de ART por las abundantes lluvias y el agua alcanzó y dañó la PC del consultorio 3. Se está terminando de rearmar.",
    status: "IN_PROGRESS" as const,
    // 14/10/2026 al mediodía, hora de la clínica (UTC-3).
    createdAt: new Date("2026-10-14T15:00:00Z"),
    resolutionNote: null,
    assetStatus: "REPAIR" as const,
  },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const log: string[] = [];

  // ---- categorías
  const haveCategories = new Set((await db.category.findMany({ select: { name: true } })).map((c) => c.name));
  const categoriesToAdd = NEW_CATEGORIES.filter((name) => !haveCategories.has(name));
  log.push(`Categorías nuevas: ${categoriesToAdd.length ? categoriesToAdd.join(", ") : "ninguna (ya estaban)"}`);

  // ---- infraestructura
  const haveAssets = new Set(
    (await db.asset.findMany({ select: { name: true, location: true } })).map((a) => `${a.name}||${a.location ?? ""}`)
  );
  const assetsToAdd = INFRA.filter((a) => !haveAssets.has(`${a.name}||${a.location}`));
  log.push(`Equipos de infraestructura a crear: ${assetsToAdd.length} de ${INFRA.length}`);
  for (const a of assetsToAdd) log.push(`   - ${a.name} (${a.type}, ${a.location})`);

  // ---- grupo electrógeno: el test es los sábados (6), no los jueves (4)
  const generator = await db.maintenanceTask.findFirst({
    where: { title: { contains: "Grupo Electrogeno", mode: "insensitive" } },
  });
  const fixGenerator = !!generator && generator.freq === "WEEK" && generator.weekdays.join(",") === "4";
  log.push(
    generator
      ? `Grupo electrógeno: "${generator.title}" está los días [${generator.weekdays.join(",")}] ${
          fixGenerator ? "-> se cambia a sábado [6]" : "(no se toca)"
        }`
      : "Grupo electrógeno: no se encontró la tarea"
  );

  // ---- incidentes
  const incidentPlans = [];
  for (const incident of INCIDENTS) {
    const exists = await db.ticket.count({ where: { title: incident.title } });
    const asset = await db.asset.findFirst({ where: { name: incident.assetName } });
    const category = await db.category.findFirst({ where: { name: incident.categoryName } });
    const note = exists ? "ya existe" : !asset ? "NO se encontró el equipo" : !category ? "NO se encontró la categoría" : "se crea";
    log.push(`Ticket "${incident.title}" -> ${incident.assetName}: ${note}`);
    if (!exists && asset && category) incidentPlans.push({ incident, assetId: asset.id, categoryId: category.id });
  }

  console.log(log.join("\n"));

  if (!apply) {
    console.log("\nNo se escribió nada. Para aplicar: --apply");
    return;
  }

  if (categoriesToAdd.length) {
    await db.category.createMany({ data: categoriesToAdd.map((name) => ({ name })), skipDuplicates: true });
  }
  if (assetsToAdd.length) {
    await db.asset.createMany({
      data: assetsToAdd.map((a) => ({
        name: a.name,
        type: a.type,
        status: "ACTIVE" as const,
        location: a.location,
        notes: a.notes,
      })),
    });
  }
  if (fixGenerator && generator) {
    await db.maintenanceTask.update({ where: { id: generator.id }, data: { weekdays: [6] } });
  }

  for (const { incident, assetId, categoryId } of incidentPlans) {
    const started = new Date(incident.createdAt.getTime() + 60_000);
    const completed = incident.status === "COMPLETED";
    await db.ticket.create({
      data: {
        reporterName: REPORTER,
        reporterEmail: null,
        title: incident.title,
        description: incident.description,
        categoryId,
        assetId,
        priority: "HIGH",
        status: incident.status,
        createdAt: incident.createdAt,
        startedAt: started,
        completedAt: completed ? started : null,
        resolutionNote: incident.resolutionNote,
        statusHistory: {
          create: [
            { toStatus: "BACKLOG", changedAt: incident.createdAt },
            { fromStatus: "BACKLOG", toStatus: "IN_PROGRESS", changedAt: started },
            ...(completed
              ? [{ fromStatus: "IN_PROGRESS" as const, toStatus: "COMPLETED" as const, note: incident.resolutionNote, changedAt: started }]
              : []),
          ],
        },
      },
    });
    if (incident.assetStatus) {
      await db.asset.update({ where: { id: assetId }, data: { status: incident.assetStatus } });
    }
  }

  console.log("\nAplicado.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
