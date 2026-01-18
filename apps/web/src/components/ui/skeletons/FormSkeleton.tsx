import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface FormSkeletonProps {
  /** Number of form fields */
  fields?: number;
  /** Show form in a card */
  inCard?: boolean;
  /** Number of columns for form layout */
  columns?: 1 | 2;
  /** Show form actions (submit, cancel buttons) */
  showActions?: boolean;
}

export function FormSkeleton({
  fields = 6,
  inCard = true,
  columns = 1,
  showActions = true,
}: FormSkeletonProps) {
  const FormContent = () => (
    <div className="space-y-6">
      {/* Form Fields */}
      <div
        className={`grid gap-6 ${
          columns === 2 ? "md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" /> {/* Label */}
            <Skeleton className="h-10 w-full" /> {/* Input */}
            {i % 3 === 0 && <Skeleton className="h-3 w-48" />} {/* Helper text */}
          </div>
        ))}
      </div>

      {/* Form Actions */}
      {showActions && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Skeleton className="h-9 w-20" /> {/* Cancel */}
          <Skeleton className="h-9 w-24" /> {/* Submit */}
        </div>
      )}
    </div>
  );

  if (inCard) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <FormContent />
        </CardContent>
      </Card>
    );
  }

  return <FormContent />;
}
