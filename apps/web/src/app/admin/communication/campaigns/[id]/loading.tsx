import { DashboardSkeleton } from "@/components/ui/skeletons";

export default function CampaignDetailLoading() {
  return (
    <div className="container mx-auto py-6 px-4">
      <DashboardSkeleton
        statCards={5}
        showMainContent={true}
        showSidebar={true}
        showActivityFeed={false}
      />
    </div>
  );
}
