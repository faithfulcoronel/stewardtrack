import { CardGridSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Settings Cards */}
      <CardGridSkeleton cards={6} columns={3} cardHeight="md" showHeader={true} />
    </div>
  );
}
