import { Skeleton } from "@/components/ui/skeleton";

interface DataTableSkeletonProps {
  /** Number of columns */
  columns?: number;
  /** Number of rows to show */
  rows?: number;
  /** Show search/filter bar */
  showFilters?: boolean;
  /** Show pagination */
  showPagination?: boolean;
}

export function DataTableSkeleton({
  columns = 5,
  rows = 10,
  showFilters = true,
  showPagination = true,
}: DataTableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Filters/Search Bar */}
      {showFilters && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-64" /> {/* Search input */}
            <Skeleton className="h-9 w-24" /> {/* Filter button */}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32" /> {/* Column toggle */}
            <Skeleton className="h-9 w-24" /> {/* Export button */}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead>
              <tr className="border-b bg-muted/50">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="h-12 px-4 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            {/* Body */}
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b">
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <td key={colIndex} className="h-14 px-4">
                      <Skeleton
                        className={`h-4 ${
                          colIndex === 0
                            ? "w-32"
                            : colIndex === columns - 1
                            ? "w-20"
                            : "w-24"
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" /> {/* "Showing X to Y of Z results" */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" /> {/* Previous */}
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" /> {/* Next */}
          </div>
        </div>
      )}
    </div>
  );
}
