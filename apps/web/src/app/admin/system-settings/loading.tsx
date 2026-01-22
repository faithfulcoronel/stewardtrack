import { MetadataPageSkeleton } from "@/components/ui/skeletons";

export default function SystemSettingsLoading() {
  return (
    <div className="container mx-auto py-6 px-4">
      <MetadataPageSkeleton variant="form" showHero={true} heroStats={2} />
    </div>
  );
}
