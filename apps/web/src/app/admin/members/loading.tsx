import { MetadataPageSkeleton } from "@/components/ui/skeletons";

export default function MembersLoading() {
  return (
    <div className="container mx-auto py-6 px-4">
      <MetadataPageSkeleton variant="list" showHero={true} heroStats={4} />
    </div>
  );
}
