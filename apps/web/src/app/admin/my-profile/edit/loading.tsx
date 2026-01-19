import { MetadataPageSkeleton } from "@/components/ui/skeletons";

export default function ProfileEditLoading() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <MetadataPageSkeleton variant="form" showHero={false} />
    </div>
  );
}
