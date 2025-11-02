"use client";

import { api } from "@/lib/convex/_generated/api";
import { PresentationSlot } from "@/lib/types/presentations";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

function PresentationStatus() {
  const currentUser = useQuery(api.user.currentUser);
  const prevPresentationsRef = useRef<PresentationSlot[] | undefined>(
    undefined
  );

  useEffect(() => {
    if (
      !currentUser ||
      (currentUser.role !== "judge" && currentUser.role !== "mentor")
    ) {
      return;
    }

    if (!currentUser.judgingSession) {
      return;
    }

    const presentations = currentUser.judgingSession.presentations;

    if (prevPresentationsRef.current === undefined) {
      prevPresentationsRef.current = presentations;
      return;
    }

    if (prevPresentationsRef.current === presentations) {
      return;
    }

    const prevPresenting = prevPresentationsRef.current.find(
      (p) => p.status === "presenting"
    );
    const currentPresenting = presentations.find(
      (p) => p.status === "presenting"
    );

    if (currentPresenting && !prevPresenting) {
      toast.success(
        `Presentation for ${currentPresenting.projectName} has started.`
      );
    } else if (!currentPresenting && prevPresenting) {
      toast.info(`Presentation for ${prevPresenting.projectName} has ended.`);
    } else if (
      currentPresenting &&
      prevPresenting &&
      currentPresenting.projectDevpostId !== prevPresenting.projectDevpostId
    ) {
      toast.info(`Presentation for ${prevPresenting.projectName} has ended.`);
      toast.success(
        `Presentation for ${currentPresenting.projectName} has started.`
      );
    } else if (
      currentPresenting &&
      prevPresenting &&
      currentPresenting.projectDevpostId === prevPresenting.projectDevpostId
    ) {
      const wasPaused = prevPresenting.timerState.isPaused;
      const isPaused = currentPresenting.timerState.isPaused;

      if (!wasPaused && isPaused) {
        toast.warning(
          `Presentation for ${currentPresenting.projectName} paused.`
        );
      } else if (wasPaused && !isPaused) {
        toast.info(
          `Presentation for ${currentPresenting.projectName} resumed.`
        );
      }
    }

    prevPresentationsRef.current = presentations;
  }, [currentUser]);

  return null;
}

export default PresentationStatus;
