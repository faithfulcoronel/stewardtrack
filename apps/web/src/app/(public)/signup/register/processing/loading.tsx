import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <Skeleton className="h-2 w-48 mx-auto" />
      </div>
    </div>
  );
}
