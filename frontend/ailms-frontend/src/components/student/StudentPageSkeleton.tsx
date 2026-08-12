import { Skeleton } from "@/components/ui/skeleton";

interface StudentPageSkeletonProps {
  cards?: number;
  columns?: 1 | 2 | 3;
}

/** Giữ khung trang học viên ổn định trong lúc tải dữ liệu thật. */
export const StudentPageSkeleton = ({ cards = 3, columns = 3 }: StudentPageSkeletonProps) => {
  const gridClass = columns === 1 ? "grid-cols-1" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3";
  return (
    <div className="space-y-6" aria-label="Đang tải dữ liệu">
      <div className="space-y-2"><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <Skeleton className="h-10 w-full" />
      <div className={`grid gap-5 ${gridClass}`}>
        {Array.from({ length: cards }, (_, index) => <Skeleton key={index} className="h-64" />)}
      </div>
    </div>
  );
};
