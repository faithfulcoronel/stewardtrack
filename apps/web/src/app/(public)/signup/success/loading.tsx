import { Skeleton } from "@/components/ui/skeleton";

export default function SuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
        <Skeleton className="h-10 w-40 mx-auto" />
      </div>
    </div>
  );
}
