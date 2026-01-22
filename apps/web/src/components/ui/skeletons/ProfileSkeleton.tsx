import { Skeleton } from "@/components/ui/skeleton";

interface ProfileSkeletonProps {
  /** Show cover photo */
  showCoverPhoto?: boolean;
  /** Number of info cards */
  infoCards?: number;
}

export function ProfileSkeleton({
  showCoverPhoto = true,
  infoCards = 4,
}: ProfileSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Cover Photo */}
      {showCoverPhoto && (
        <div className="relative">
          <Skeleton
            className="w-full rounded-xl md:rounded-2xl"
            style={{ minHeight: "180px", height: "22vh", maxHeight: "240px" }}
          />
          <div className="absolute -bottom-12 md:-bottom-14 left-4 md:left-6 z-20">
            <Skeleton className="h-24 w-24 md:h-28 md:w-28 rounded-full ring-4 ring-background" />
          </div>
        </div>
      )}

      {/* Profile Info */}
      <div className={showCoverPhoto ? "pt-10 md:pt-12 px-4 md:px-0" : ""}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" /> {/* Name */}
            <Skeleton className="h-4 w-32" /> {/* Role/Title */}
            <Skeleton className="h-4 w-40" /> {/* Location */}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" /> {/* Edit button */}
            <Skeleton className="h-9 w-9" /> {/* More actions */}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 pt-4">
        {Array.from({ length: infoCards }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-32" /> {/* Card title */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
