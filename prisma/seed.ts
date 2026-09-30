import "dotenv/config";
import { PrismaClient, TicketPriority, TicketStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const db = new PrismaClient({ adapter });

const CATEGORY_NAMES = ["Hardware", "Software", "Redes / Internet", "Telefonía / Intercomunicador", "Otros"];

const REPORTERS = [
  { name: "Dr. Gómez", email: "gomez@clinica.com" },
  { name: "Dra. Pérez", email: "perez@clinica.com" },
  { name: "Dr. Suárez", email: "suarez@clinica.com" },
  { name: "Enf. Torres", email: "torres@clinica.com" },
];

const TICKETS = [
  { title: "Se rompió el intercomunicador de la guardia", description: "No se escucha nada del otro lado, probamos cambiar las pilas y sigue sin andar.", weeksAgo: 5, status: "COMPLETED" as const },
  { title: "La impresora de recepción no imprime", description: "Tira la hoja en blanco, ya probamos con otro cartucho.", weeksAgo: 5, status: "COMPLETED" as const },
  { title: "No anda el wifi en el consultorio 3", description: "El wifi se desconecta cada 5 minutos, en los otros consultorios anda bien.", weeksAgo: 4, status: "COMPLETED" as const },
  { title: "PC de facturación muy lenta", description: "Tarda varios minutos en abrir el sistema de facturación.", weeksAgo: 4, status: "COMPLETED" as const },
  { title: "No prende el monitor de la sala de espera", description: "El monitor que muestra el turnero quedó negro.", weeksAgo: 3, status: "COMPLETED" as const },
  { title: "El sistema de turnos tira error al guardar", description: "Aparece un error 'no se pudo guardar' al confirmar un turno nuevo.", weeksAgo: 3, status: "COMPLETED" as const },
  { title: "Teléfono interno de quirófano sin línea", description: "No podemos comunicarnos con recepción desde quirófano.", weeksAgo: 2, status: "COMPLETED" as const },
  { title: "Falta tóner en la impresora de administración", description: "Se terminó el tóner, necesitamos uno nuevo.", weeksAgo: 2, status: "IN_PROGRESS" as const },
  { title: "Cámara de seguridad de la entrada no graba", description: "La cámara de la entrada principal parece apagada.", weeksAgo: 2, status: "IN_PROGRESS" as const },
  { title: "No podemos acceder a las historias clínicas digitales", description: "El sistema tira 'sin conexión' desde esta mañana.", weeksAgo: 1, status: "IN_PROGRESS" as const },
  { title: "Aire acondicionado del server no enfría", description: "El cuarto de servidores está más caliente que lo normal.", weeksAgo: 1, status: "BACKLOG" as const },
  { title: "Se traba la balanza digital conectada a la PC", description: "El software de la balanza se cuelga al pesar un paciente.", weeksAgo: 1, status: "BACKLOG" as const },
  { title: "Falta cable de red en el consultorio 5", description: "Nunca se conectó ese consultorio a la red interna.", weeksAgo: 0, status: "BACKLOG" as const },
  { title: "Teclado de recepción con teclas que no andan", description: "La letra A y la Ñ no responden.", weeksAgo: 0, status: "BACKLOG" as const },
  { title: "No llega el mail de confirmación de turnos a los pacientes", description: "Varios pacientes dicen no haber recibido el recordatorio por mail.", weeksAgo: 0, status: "BACKLOG" as const },
];

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  await db.comment.deleteMany();
  await db.ticketStatusHistory.deleteMany();
  await db.ticket.deleteMany();
  await db.category.deleteMany();

  const categories = await Promise.all(
    CATEGORY_NAMES.map((name) => db.category.create({ data: { name } }))
  );

  const priorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  for (let i = 0; i < TICKETS.length; i++) {
    const t = TICKETS[i];
    const reporter = REPORTERS[i % REPORTERS.length];
    const category = categories[i % categories.length];
    const createdAt = daysAgo(t.weeksAgo * 7 + (i % 3));

    const isTriaged = t.status !== "BACKLOG";
    const startedAt = isTriaged ? daysAgo(t.weeksAgo * 7 + (i % 3) - 1) : null;
    const isCompleted = t.status === "COMPLETED";
    const completedAt = isCompleted ? daysAgo(t.weeksAgo * 7 + (i % 3) - 2) : null;

    const ticket = await db.ticket.create({
      data: {
        reporterName: reporter.name,
        reporterEmail: reporter.email,
        title: t.title,
        description: t.description,
        status: t.status as TicketStatus,
        categoryId: isTriaged ? category.id : null,
        priority: isTriaged ? priorities[i % priorities.length] : null,
        resolutionNote: isCompleted ? "Se revisó y se solucionó el problema en el lugar." : null,
        createdAt,
        startedAt,
        completedAt,
        statusHistory: {
          create: [
            { toStatus: "BACKLOG", changedAt: createdAt },
            ...(isTriaged ? [{ fromStatus: "BACKLOG" as const, toStatus: "IN_PROGRESS" as const, changedAt: startedAt! }] : []),
            ...(isCompleted ? [{ fromStatus: "IN_PROGRESS" as const, toStatus: "COMPLETED" as const, changedAt: completedAt! }] : []),
          ],
        },
      },
    });

    if (i % 4 === 0) {
      await db.comment.create({
        data: {
          ticketId: ticket.id,
          authorName: reporter.name,
          isFromAdmin: false,
          body: "Cualquier cosa que necesiten para revisarlo, avisen.",
        },
      });
    }
  }

  console.log(`Seed OK: ${categories.length} categorías, ${TICKETS.length} tickets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
