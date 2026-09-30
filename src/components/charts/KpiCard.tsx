import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-[#898781]">{label}</p>
        <p className="text-2xl font-semibold text-[#0b0b0b]">{value}</p>
      </CardContent>
    </Card>
  );
}
