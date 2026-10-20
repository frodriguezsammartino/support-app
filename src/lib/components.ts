/**
 * Las piezas que se registran de una PC. Es una guía para elegir rápido, no una
 * lista cerrada: el detalle de cada una es texto libre ("8 GB DDR3", "SSD 240 GB").
 */
export const COMPONENT_KINDS = [
  { value: "CPU", label: "Procesador" },
  { value: "RAM", label: "Memoria RAM" },
  { value: "DISCO", label: "Disco" },
  { value: "PLACA_MADRE", label: "Placa madre" },
  { value: "FUENTE", label: "Fuente" },
  { value: "COOLER", label: "Cooler" },
  { value: "VIDEO", label: "Placa de video" },
  { value: "GABINETE", label: "Gabinete" },
  { value: "MONITOR", label: "Monitor" },
  { value: "TECLADO", label: "Teclado" },
  { value: "MOUSE", label: "Mouse" },
  { value: "OTRO", label: "Otro" },
] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number]["value"];

export function componentKindLabel(kind: string | null | undefined) {
  return COMPONENT_KINDS.find((c) => c.value === kind)?.label ?? null;
}

/** Solo las PC de escritorio tienen piezas que se cambian o se amplían. */
export function hasComponents(type: string) {
  return type === "PC";
}
