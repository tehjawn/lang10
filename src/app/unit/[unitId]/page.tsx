import { notFound } from "next/navigation";
import { UNITS, UNITS_BY_ID } from "@/data/japanese";
import { UnitDetail } from "@/components/unit-detail";

export function generateStaticParams() {
  return UNITS.map((u) => ({ unitId: u.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ unitId: string }> }) {
  const unit = UNITS_BY_ID.get((await params).unitId);
  return { title: unit ? `${unit.title} — Lang10` : "Lang10" };
}

export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const unit = UNITS_BY_ID.get((await params).unitId);
  if (!unit) notFound();
  return <UnitDetail unit={unit} />;
}
