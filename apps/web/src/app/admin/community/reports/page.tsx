import { AdminMetricCards } from '@/components/dynamic/admin/AdminMetricCards';
import { AdminReportChartsSection } from '@/components/dynamic/admin/AdminReportChartsSection';
import { HeroSection } from '@/components/dynamic/HeroSection';
import { adminCommunityReportsHandlers } from '@/lib/metadata/services/admin-community-reports';
import type { ChartConfig } from '@/components/dynamic/admin/AdminReportCharts';

/**
 * Member Reports Page
 *
 * Comprehensive member insights dashboard for church leadership
 * Shows demographics, growth trends, engagement metrics, and more
 */
export const dynamic = 'force-dynamic';

export default async function MemberReportsPage() {
  // Fetch all report data
  const [
    heroData,
    keyMetrics,
    statusChart,
    typeChart,
    growthChart,
    familyChart,
    carePriorityChart,
    discipleshipChart,
    centerChart,
    engagementSummary,
  ] = await Promise.all([
    adminCommunityReportsHandlers['admin-community.reports.hero']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.keyMetrics']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.membershipStatusChart']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.membershipTypeChart']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.growthTrendChart']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.familySizeChart']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.carePriorityChart']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.discipleshipPathwayChart']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.centerDistributionChart']({ params: {}, context: {} }),
    adminCommunityReportsHandlers['admin-community.reports.engagementSummary']({ params: {}, context: {} }),
  ]);

  // Type assertions for proper TypeScript support
  const heroDataTyped = heroData as any;
  const keyMetricsTyped = keyMetrics as any;
  const statusChartTyped = statusChart as ChartConfig;
  const typeChartTyped = typeChart as ChartConfig;
  const growthChartTyped = growthChart as ChartConfig;
  const familyChartTyped = familyChart as ChartConfig;
  const carePriorityChartTyped = carePriorityChart as ChartConfig;
  const discipleshipChartTyped = discipleshipChart as ChartConfig;
  const centerChartTyped = centerChart as ChartConfig;
  const engagementSummaryTyped = engagementSummary as any;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <HeroSection
            variant="stats-panel"
            eyebrow={heroDataTyped.eyebrow}
            headline={heroDataTyped.headline}
            description={heroDataTyped.description}
            metrics={heroDataTyped.metrics}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Key Metrics */}
        <section>
          <AdminMetricCards
            title="Key Performance Indicators"
            description="Track the vital signs of your congregation across membership, engagement, and spiritual growth."
            metrics={keyMetricsTyped.items}
          />
        </section>

        {/* Membership Overview Charts */}
        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Membership Overview</h2>
          <AdminReportChartsSection
            charts={[
              {
                ...statusChartTyped,
                title: 'Membership Status Distribution',
                description: 'Breakdown of members by current status',
              },
              {
                ...typeChartTyped,
                title: 'Membership Type Distribution',
                description: 'Distribution by membership type',
              },
            ]}
          />
        </section>

        {/* Growth Trends */}
        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Growth Trends</h2>
          <AdminReportChartsSection
            charts={[
              {
                ...growthChartTyped,
                title: 'Monthly Membership Growth',
                description: 'Track new members and net growth over the past 12 months',
              },
            ]}
          />
        </section>

        {/* Family Insights */}
        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Family Insights</h2>
          <AdminReportChartsSection
            charts={[
              {
                ...familyChartTyped,
                title: 'Family Size Distribution',
                description: 'Number of families by household size',
              },
            ]}
          />
        </section>

        {/* Engagement Metrics */}
        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Engagement & Discipleship</h2>
          <AdminMetricCards
            title="Engagement Summary"
            description="Overview of member involvement in care, discipleship, and serving."
            metrics={engagementSummaryTyped.items}
          />
          <div className="mt-6">
            <AdminReportChartsSection
              charts={[
                {
                  ...carePriorityChartTyped,
                  title: 'Care Plan Priority Breakdown',
                  description: 'Active care plans by priority level',
                },
                {
                  ...discipleshipChartTyped,
                  title: 'Discipleship Pathway Distribution',
                  description: 'Members by discipleship pathway',
                },
              ]}
            />
          </div>
        </section>

        {/* Campus/Center Distribution */}
        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Campus Distribution</h2>
          <AdminReportChartsSection
            charts={[
              {
                ...centerChartTyped,
                title: 'Members by Campus/Center',
                description: 'Distribution across membership centers',
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
