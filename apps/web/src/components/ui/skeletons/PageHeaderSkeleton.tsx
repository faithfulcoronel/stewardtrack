import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderSkeletonProps {
  /** Show breadcrumb skeleton */
  showBreadcrumb?: boolean;
  /** Show action buttons skeleton */
  showActions?: boolean;
  /** Number of action buttons to show */
  actionCount?: number;
}

export function PageHeaderSkeleton({
  showBreadcrumb = true,
  showActions = true,
  actionCount = 2,
}: PageHeaderSkeletonProps) {
  return (
    <div className="space-y-4">
      {showBreadcrumb && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 md:w-64" />
          <Skeleton className="h-4 w-64 md:w-96" />
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            {Array.from({ length: actionCount }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
