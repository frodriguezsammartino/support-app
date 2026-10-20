/**
 * Carga los proveedores que nombra el informe de Alfonso (octubre 2026).
 *
 *   npx tsx prisma/seed-providers.ts            -> solo muestra qué haría (no escribe)
 *   npx tsx prisma/seed-providers.ts --apply    -> crea los que falten
 *
 * Solo van los datos que el informe dice de forma explícita: los teléfonos y mails
 * los completa Alfonso. Es idempotente por nombre y nunca modifica ni borra nada.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const db = new PrismaClient({ adapter });

type Seed = { name: string; covers: string; contactName?: string; notes?: string };

const PROVIDERS: Seed[] = [
  {
    name: "Agfa",
    covers: "Sistema de imágenes médicas (PACS / DICOM) y equipos de rayos digitales",
    notes:
      "Los servicios de rayos son digitales y conectados por wifi. El informe menciona la supervisión de los ingenieros Sergio Cotón y Juan Carlos Rodríguez.",
  },
  {
    name: "ISF",
    covers: "Migración obligatoria del sistema de imágenes médicas",
    contactName: "María Elina Meaca",
    notes: "Ingeniera en Sistemas.",
  },
  {
    name: "Datatech S.A.",
    covers: "Sistema de gestión, módulos operativos y plataforma de turnos online",
    notes:
      "Módulos en áreas críticas: Quirófano, Clínicas, Farmacia y Admisión. Altas y bajas de usuarios y permisos. Los turnos online se sincronizan con su motor central.",
  },
  {
    name: "Plustel",
    covers: "Central telefónica (rack) y acceso remoto de soporte",
    contactName: "Maximiliano Furfuro",
    notes: "Ingeniero. Se le escalan las fallas de la central para no dejar sin comunicación a la Guardia y la internación.",
  },
  {
    name: "Lakaut / Polo Tecnológico",
    covers: "Firma digital regulada (ONTI): tokens, renovaciones y biometría",
    contactName: "Marina Cabrero",
    notes: "Perito Forense Informática del Polo Tecnológico.",
  },
  {
    name: "MP BOX",
    covers: "Archivo externo de la clínica y sistema con máquinas virtuales en terminales",
  },
  {
    name: "Edea",
    covers: "Suministro de energía eléctrica de la calle",
    notes: "Los cortes de luz de calle ya dañaron equipos (cartel de Guardia).",
  },
  {
    name: "Electricista de planta",
    covers: "Recambio de tendido y mantenimiento electromecánico físico",
    notes: "Recibe el reporte técnico de fallas de cableado estructurado.",
  },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const have = new Set((await db.provider.findMany({ select: { name: true } })).map((p) => p.name));
  const toCreate = PROVIDERS.filter((p) => !have.has(p.name));

  console.log(`Proveedores a crear: ${toCreate.length} de ${PROVIDERS.length}`);
  for (const p of toCreate) console.log(`   - ${p.name}: ${p.covers}`);

  if (!apply) {
    console.log("\nNo se escribió nada. Para aplicar: --apply");
    return;
  }

  await db.provider.createMany({
    data: toCreate.map((p) => ({
      name: p.name,
      covers: p.covers,
      contactName: p.contactName ?? null,
      notes: p.notes ?? null,
    })),
    skipDuplicates: true,
  });
  console.log("\nAplicado.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
