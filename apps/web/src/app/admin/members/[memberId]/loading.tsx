import { ProfileSkeleton } from "@/components/ui/skeletons";

export default function MemberDetailLoading() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <ProfileSkeleton showCoverPhoto={true} infoCards={4} />
    </div>
  );
}
