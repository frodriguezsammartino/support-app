/**
 * Carga el inventario real de PCs, impresoras y otros equipos de la clínica, por
 * piso y sector, con su sistema operativo y ofimática.
 *
 *   npx tsx prisma/seed-inventory.ts            -> solo muestra qué haría (no escribe)
 *   npx tsx prisma/seed-inventory.ts --apply    -> crea lo que falte
 *
 * Es idempotente: un equipo se identifica por nombre + ubicación, así que
 * correrlo dos veces no duplica nada. Nunca borra ni modifica equipos existentes.
 */
import "dotenv/config";
import { PrismaClient, type AssetType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const db = new PrismaClient({ adapter });

type Spec = { name: string; type: AssetType; os: string | null; office: string | null };

const W11 = "Windows 11 Pro";
const W10 = "Windows 10 Pro";
const W81 = "Windows 8.1";
const W7 = "Windows 7 Pro";
const OO = "OpenOffice";
const O10S = "Office 2010 Starter";
const O10 = "Office 2010";
const O16 = "Office 2016";

const pc = (name: string, os: string, office: string | null = null): Spec => ({
  name,
  type: "PC",
  os,
  office,
});
const printer = (name: string): Spec => ({ name, type: "PRINTER", os: null, office: null });
const other = (name: string): Spec => ({ name, type: "OTHER", os: null, office: null });

/** Varias PCs iguales numeradas: pcs("PC Consultorio ART", 4, W10, OO). */
const pcs = (base: string, count: number, os: string, office: string | null = null): Spec[] =>
  Array.from({ length: count }, (_, i) => pc(`${base} ${i + 1}`, os, office));
const printers = (base: string, count: number): Spec[] =>
  Array.from({ length: count }, (_, i) => printer(count === 1 ? base : `${base} ${i + 1}`));

const INVENTORY: Record<string, Spec[]> = {
  "2° Subsuelo - Archivo": [
    pc("PC Archivo 1", W11, OO),
    pc("PC Archivo 2", W7, O10S),
    printer("Fotocopiadora Ricoh 301"),
  ],
  "1° Subsuelo - Consultorios ART": [...pcs("PC Consultorio ART", 4, W10, OO)],
  "1° Subsuelo - Secretaría ART": [pc("PC Secretaría ART", W10, OO), printer("Impresora Secretaría ART")],
  "1° Subsuelo - Cartel Llamador ART": [pc("PC Cartel Llamador ART", W11)],
  "1° Subsuelo - Mesa de Entradas ART": [
    pc("PC Mesa de Entradas ART 1", W10, OO),
    pc("PC Mesa de Entradas ART 2", W7, O10S),
    pc("PC Mesa de Entradas ART 3", W7, O10S),
    ...printers("Impresora Mesa de Entradas ART", 2),
  ],
  "1° Subsuelo - Autorizaciones": [
    pc("PC Autorizaciones 1", W10, OO),
    pc("PC Autorizaciones 2", W7, O10S),
    pc("PC Autorizaciones 3", W7, O10S),
    pc("PC Autorizaciones 4", W7, O10S),
    ...printers("Impresora Autorizaciones", 3),
  ],
  "1° Subsuelo - Terapia Ocupacional (TO)": [pc("PC Terapia Ocupacional", W10, OO)],
  "1° Subsuelo - Kinesiología": [
    ...pcs("PC Kinesiología", 2, W7, O10S),
    ...printers("Impresora Kinesiología", 2),
  ],
  "Planta Baja - Consultorios y Secretaría": [
    pc("PC Consultorio 1", W7, O10S),
    pc("PC Consultorio 6 Guardia", W7, O10S),
    pc("PC Secretaría 2", W7, O10S),
    pc("PC Consultorio 2", W10, OO),
    pc("PC Consultorio 3", W10, OO),
    pc("PC Consultorio 4", W10, OO),
    pc("PC Consultorio 5", W10, OO),
    pc("PC Secretaría 1", W10, OO),
    pc("PC Llamador OOSS", W10, OO),
    pc("PC Llamador Guardia", W10, OO),
    ...printers("Impresora Consultorios y Secretaría", 2),
  ],
  "Planta Baja - Mesa de Entradas OOSS": [
    pc("PC Mesa de Entradas OOSS 1", W7, O10S),
    pc("PC Mesa de Entradas OOSS 2", W10, OO),
    ...printers("Impresora Mesa de Entradas OOSS", 2),
  ],
  "Planta Baja - Conmutador": [pc("PC Conmutador", W10, OO)],
  "Planta Baja - Rayos": [pc("PC Rayos", W10, OO), other("Equipamiento radiológico digital")],
  "Planta Baja - Administración": [
    ...pcs("PC Administración", 3, W7, O10S),
    pc("PC Administración 4", W81, O16),
    pc("PC Administración 5", W11, OO),
    pc("PC Administración 6", W11, OO),
    printer("Fotocopiadora Ricoh 600"),
  ],
  "1° Piso - Quirófano": [
    pc("PC Quirófano 1", W81),
    pc("PC Quirófano 2", W10, OO),
    pc("PC Quirófano 3", W10, OO),
    pc("PC Quirófano 4", W10, OO),
    pc("PC Quirófano 5", W11),
  ],
  "1° Piso - UTI": [...pcs("PC UTI", 2, W10)],
  "3° Piso - Biblioteca": [pc("PC Biblioteca", W10, OO)],
  "3° Piso - Recursos Humanos": [pc("PC Recursos Humanos", W7, O16)],
  "3° Piso - Facturación": [
    ...pcs("PC Facturación", 3, W7, O10),
    pc("PC Facturación 4", W10, OO),
    pc("PC Facturación 5", W10, OO),
    pc("PC Facturación 6", W11),
    pc("PC Facturación 7", W11),
  ],
};

async function main() {
  const apply = process.argv.includes("--apply");

  const existing = await db.asset.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { tickets: true, maintenanceTasks: true } } },
  });
  console.log(`Equipos que ya hay cargados: ${existing.length}`);
  for (const a of existing) {
    console.log(
      `  #${a.code} ${a.name} | ${a.location ?? "sin ubicación"} | ${a._count.tickets} tickets, ${a._count.maintenanceTasks} tareas`
    );
  }

  const key = (name: string, location: string | null) => `${name}||${location ?? ""}`;
  const have = new Set(existing.map((a) => key(a.name, a.location)));

  const toCreate: (Spec & { location: string })[] = [];
  for (const [location, specs] of Object.entries(INVENTORY)) {
    for (const spec of specs) {
      if (!have.has(key(spec.name, location))) toCreate.push({ ...spec, location });
    }
  }

  const all = Object.values(INVENTORY).flat();
  const count = (t: AssetType) => all.filter((s) => s.type === t).length;
  console.log(
    `\nInventario a cargar: ${all.length} equipos (${count("PC")} PCs, ${count("PRINTER")} impresoras/fotocopiadoras, ${count("OTHER")} otros) en ${Object.keys(INVENTORY).length} sectores.`
  );
  console.log(`Faltan crear: ${toCreate.length}. Ya estaban: ${all.length - toCreate.length}.`);

  if (!apply) {
    console.log("\nNo se escribió nada. Para crear los equipos que faltan: --apply");
    return;
  }

  // Un solo createMany: o entran todos o ninguno.
  const result = await db.asset.createMany({
    data: toCreate.map((s) => ({
      name: s.name,
      type: s.type,
      status: "ACTIVE" as const,
      location: s.location,
      os: s.os,
      office: s.office,
    })),
  });
  console.log(`\nCreados: ${result.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
