import { DashboardSkeleton } from "@/components/ui/skeletons";

export default function CampaignsLoading() {
  return (
    <div className="container mx-auto py-6 px-4">
      <DashboardSkeleton
        statCards={0}
        showMainContent={true}
        showSidebar={false}
        showActivityFeed={false}
      />
    </div>
  );
}
