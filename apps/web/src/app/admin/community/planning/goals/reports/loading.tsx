import { DashboardSkeleton } from "@/components/ui/skeletons";

export default function GoalReportsLoading() {
  return (
    <div className="container mx-auto py-6 px-4">
      <DashboardSkeleton
        statCards={4}
        showMainContent={true}
        showSidebar={false}
        showActivityFeed={false}
      />
    </div>
  );
}
