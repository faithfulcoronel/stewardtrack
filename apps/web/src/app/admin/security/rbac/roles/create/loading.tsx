import { MetadataPageSkeleton } from "@/components/ui/skeletons";

export default function RoleCreateLoading() {
  return (
    <div className="container mx-auto py-6 px-4">
      <MetadataPageSkeleton variant="form" showHero={false} />
    </div>
  );
}
