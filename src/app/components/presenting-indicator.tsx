import { api } from "@/lib/convex/_generated/api";
import { useQuery } from "convex/react";

function PresentingIndicator() {
  const currentProjectPresenting = useQuery(
    api.judging.getGroupProjectPresenting
  );

  if (!currentProjectPresenting) {
    return (
      <div className="p-3 rounded-lg border-2 border-gray-500 bg-gray-500/15">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
          <span className="font-semibold text-lg text-gray-500">
            No project currently presenting
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border-2 border-blue-500 bg-blue-500/15">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm animate-pulse"></div>
        <span className="font-semibold text-lg text-blue-500">
          Now presenting: {currentProjectPresenting}
        </span>
      </div>
    </div>
  );
}

export default PresentingIndicator;
