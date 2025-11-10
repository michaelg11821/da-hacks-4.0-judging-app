"use client";

import { api } from "@/lib/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

function JudgingStatus() {
  const judgingStatus = useQuery(api.judging.getJudgingStatus);
  const prevIsActiveRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const isActive = judgingStatus?.active;

    if (prevIsActiveRef.current === undefined) {
      prevIsActiveRef.current = isActive;

      return;
    }

    if (isActive !== prevIsActiveRef.current) {
      if (isActive === true) {
        toast.success("Judging has began.");
      } else if (isActive === false) {
        toast.info("Judging has ended.");
      }

      prevIsActiveRef.current = isActive;
    }
  }, [judgingStatus?.active]);

  return null;
}

export default JudgingStatus;
