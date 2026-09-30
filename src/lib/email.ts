import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendTicketCompletedEmail(params: {
  to: string;
  reporterName: string;
  ticketNumber: number;
  ticketTitle: string;
  resolutionNote: string;
}) {
  if (!resend || !process.env.RESEND_API_KEY?.startsWith("re_")) {
    console.warn("RESEND_API_KEY no configurada (o inválida), no se envió el email de resolución.");
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Soporte Tecnico <onboarding@resend.dev>",
      to: params.to,
      subject: `Ticket #${params.ticketNumber} resuelto: ${params.ticketTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>¡Hola ${escapeHtml(params.reporterName)}!</h2>
          <p>Tu ticket <strong>#${params.ticketNumber} — "${escapeHtml(params.ticketTitle)}"</strong> fue marcado como resuelto.</p>
          <p><strong>Nota del técnico:</strong></p>
          <p style="white-space: pre-wrap; background: #f4f4f5; padding: 12px; border-radius: 8px;">${escapeHtml(
            params.resolutionNote
          )}</p>
        </div>
      `,
    });
  } catch (err) {
    // No bloqueamos el flujo de completar el ticket si el email falla.
    console.error("No se pudo enviar el email de resolución:", err);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
