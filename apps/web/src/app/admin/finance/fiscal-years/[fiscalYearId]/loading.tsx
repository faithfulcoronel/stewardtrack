import { MetadataPageSkeleton } from "@/components/ui/skeletons";

export default function FiscalYearDetailLoading() {
  return (
    <div className="container mx-auto py-6 px-4">
      <MetadataPageSkeleton variant="detail" showHero={true} heroStats={2} />
    </div>
  );
}
