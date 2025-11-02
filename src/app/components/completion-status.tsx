"use client";

import { api } from "@/lib/convex/_generated/api";
import { useQuery } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function CompletionStatus() {
  const currentUser = useQuery(api.user.currentUser);
  const allProjects = useQuery(api.projectsConvex.listAllProjects);
  const [showDialog, setShowDialog] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const hasShownCompletionRef = useRef(false);

  useEffect(() => {
    if (!currentUser || !currentUser.judgingSession || !allProjects) {
      return;
    }

    if (hasShownCompletionRef.current) {
      return;
    }

    if (currentUser.role === "mentor") {
      const presentations = currentUser.judgingSession.presentations;
      const allComplete = presentations.every((p) => p.status === "completed");

      if (allComplete && presentations.length > 0) {
        setCompletionMessage("All presentations complete!");
        setShowDialog(true);
        hasShownCompletionRef.current = true;
      }
    }

    if (currentUser.role === "judge") {
      const assignedProjects = currentUser.judgingSession.projects;

      const projectsWithScores = assignedProjects
        .map((ap) => allProjects.find((p) => p.devpostId === ap.devpostId))
        .filter((p) => p !== undefined);

      const presentedProjects = projectsWithScores.filter(
        (p) => p.hasPresented
      );

      if (presentedProjects.length === 0) {
        return;
      }

      const allScored = presentedProjects.every((project) =>
        project.scores.some((score) => score.judgeId === currentUser._id)
      );

      if (allScored) {
        setCompletionMessage("All scores submitted!");
        setShowDialog(true);
        hasShownCompletionRef.current = true;
      }
    }
  }, [currentUser, allProjects]);

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Congratulations!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            🎉 {completionMessage} Great job!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompletionStatus;
