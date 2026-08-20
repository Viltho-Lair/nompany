import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the guest identity or the document is still loading. */
export function DocumentSkeleton({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-14 items-center gap-3 border-b px-6">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-5 w-48" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {message}
        </div>
        <div className="mt-8 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
