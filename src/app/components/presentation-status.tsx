"use client";

import { api } from "@/lib/convex/_generated/api";
import type { PresentationSlot } from "@/lib/types/presentations";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

function PresentationStatus() {
  const currentUser = useQuery(api.user.currentUser);
  const previousPresentationsRef = useRef<PresentationSlot[] | undefined>(
    undefined
  );

  useEffect(() => {
    if (!currentUser?.judgingSession) return;

    const currentPresentations = currentUser.judgingSession.presentations;
    const previousPresentations = previousPresentationsRef.current;
    const isJudge = currentUser.role === "judge";

    if (previousPresentations) {
      for (const currentSlot of currentPresentations) {
        const previousSlot = previousPresentations.find(
          (p) => p.projectDevpostId === currentSlot.projectDevpostId
        );

        if (!previousSlot) continue;

        const projectName = currentSlot.projectName;

        if (previousSlot.status !== currentSlot.status) {
          if (
            previousSlot.status === "upcoming" &&
            currentSlot.status === "presenting"
          ) {
            toast.success(`Presentation for ${projectName} started.`);
          } else if (
            previousSlot.status === "presenting" &&
            currentSlot.status === "completed"
          ) {
            if (isJudge) {
              toast.success(
                `Presentation ended. Please submit your score for ${projectName}.`
              );
            }
          }
        }

        if (
          previousSlot.status === "presenting" &&
          currentSlot.status === "presenting"
        ) {
          const wasPaused = previousSlot.timerState.isPaused;
          const isPaused = currentSlot.timerState.isPaused;

          if (wasPaused === false && isPaused === true) {
            toast.info(`Presentation for ${projectName} paused.`);
          } else if (wasPaused === true && isPaused === false) {
            toast.info(`Presentation for ${projectName} resumed.`);
          }
        }
      }
    }

    previousPresentationsRef.current = currentPresentations;
  }, [currentUser]);

  return null;
}

export default PresentationStatus;
