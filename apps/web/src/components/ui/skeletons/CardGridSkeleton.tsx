import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CardGridSkeletonProps {
  /** Number of cards to show */
  cards?: number;
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Card height */
  cardHeight?: "sm" | "md" | "lg";
  /** Show card header */
  showHeader?: boolean;
}

export function CardGridSkeleton({
  cards = 6,
  columns = 3,
  cardHeight = "md",
  showHeader = true,
}: CardGridSkeletonProps) {
  const heightMap = {
    sm: "h-24",
    md: "h-32",
    lg: "h-48",
  };

  const columnsMap = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid gap-4 ${columnsMap[columns]}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          {showHeader && (
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-5" />
              </div>
            </CardHeader>
          )}
          <CardContent className={showHeader ? "" : "pt-6"}>
            <Skeleton className={`w-full ${heightMap[cardHeight]}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
