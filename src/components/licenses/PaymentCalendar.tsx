import { CalendarDays } from "lucide-react";
import { formatMoney, type MonthBucket } from "@/lib/licenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PaymentCalendar({ months }: { months: MonthBucket[] }) {
  const currencies = Array.from(
    new Set(months.flatMap((m) => Object.keys(m.totals)))
  ).sort();

  if (currencies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pagos de los próximos 12 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-muted">
            Para ver cuándo cae cada factura, cargale a las licencias el costo y la fecha de
            vencimiento o renovación.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-brand" />
          <CardTitle className="text-base">Pagos de los próximos 12 meses</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Mes</TableHead>
              <TableHead>Qué se paga</TableHead>
              {currencies.map((currency) => (
                <TableHead key={currency} className="w-40 text-right">
                  {currency}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((month, index) => (
              <TableRow key={month.key} className={index === 0 ? "bg-brand-tint/50" : undefined}>
                <TableCell className="align-top">
                  <span className="font-medium capitalize">{month.label}</span>
                  {index === 0 && (
                    <span className="ml-2 text-xs text-brand">este mes</span>
                  )}
                </TableCell>

                <TableCell className="align-top">
                  {month.payments.length === 0 ? (
                    <span className="text-sm text-slate-400">—</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {month.payments.map((payment, i) => (
                        <span key={`${payment.licenseId}-${i}`} className="text-sm text-ink">
                          <span className="text-slate-400">
                            {String(payment.date.getUTCDate()).padStart(2, "0")}/
                            {String(payment.date.getUTCMonth() + 1).padStart(2, "0")}
                          </span>{" "}
                          {payment.licenseName}
                          <span className="ml-1 text-xs text-slate-400">
                            {formatMoney(payment.cents, payment.currency)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>

                {currencies.map((currency) => (
                  <TableCell key={currency} className="text-right align-top tabular-nums">
                    {month.totals[currency] ? (
                      <span className="font-medium">
                        {formatMoney(month.totals[currency], currency)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
