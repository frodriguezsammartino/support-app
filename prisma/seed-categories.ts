/**
 * Desglosa la categoría "Hardware" y agrega "Problema con proveedor".
 *
 *   npx tsx prisma/seed-categories.ts            -> solo muestra qué haría
 *   npx tsx prisma/seed-categories.ts --apply    -> aplica
 *
 * "Hardware" se renombra a "Equipos (PC / Notebooks)" (conserva sus tickets). Es
 * idempotente y nunca borra nada.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });

const EQUIPOS = "Equipos (PC / Notebooks)";
const NEW: { name: string; askAsset?: boolean; askProvider?: boolean }[] = [
  { name: EQUIPOS, askAsset: true },
  { name: "Monitor", askAsset: true },
  { name: "Periféricos (mouse, teclado, cables)", askAsset: true },
  { name: "Problema con proveedor", askProvider: true },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const hardware = await db.category.findUnique({ where: { name: "Hardware" } });
  console.log(hardware ? `Renombrar "Hardware" -> "${EQUIPOS}"` : `No hay "Hardware": se crea "${EQUIPOS}"`);
  for (const c of NEW.slice(1)) console.log(`Crear (si falta): ${c.name}`);
  console.log(`Pedir equipo también en: Impresoras`);
  if (!apply) return console.log("\nNo se escribió nada. Para aplicar: --apply");

  if (hardware && !(await db.category.findUnique({ where: { name: EQUIPOS } }))) {
    await db.category.update({ where: { id: hardware.id }, data: { name: EQUIPOS } });
  }
  for (const c of NEW) {
    await db.category.upsert({
      where: { name: c.name },
      create: { name: c.name, askAsset: !!c.askAsset, askProvider: !!c.askProvider },
      update: { askAsset: !!c.askAsset, askProvider: !!c.askProvider },
    });
  }
  await db.category.updateMany({ where: { name: "Impresoras" }, data: { askAsset: true } });
  console.log("\nAplicado.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
