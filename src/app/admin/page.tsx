"use client";

import { Button } from "@/app/components/ui/button";
import { genericErrMsg } from "@/lib/constants/errorMessages";
import { api } from "@/lib/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { Loader2, Play, Square, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Leaderboard from "../components/leaderboard/leaderboard";
import RoleGuard from "../components/role-guard";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import Loading from "../components/ui/loading";

function AdminPage() {
  const [creatingGroups, setCreatingGroups] = useState<boolean>(false);
  const [judgingStatusChanging, setJudgingStatusChanging] =
    useState<boolean>(false);

  const currentUser = useQuery(api.user.currentUser);
  const groups = useQuery(api.judging.getGroups);

  const beginJudging = useMutation(api.judging.beginJudging);
  const endJudging = useMutation(api.judging.endJudging);

  const createGroups = useAction(api.judging.createGroups);

  const handleBeginJudging = async () => {
    setJudgingStatusChanging(true);

    try {
      const { success, message } = await beginJudging({
        cursor: null,
        numItems: 50,
      });

      if (!success) {
        const errorMsg = message;

        throw new Error(errorMsg);
      }
    } catch (err: unknown) {
      console.error("error starting judging:", err);

      return toast(genericErrMsg);
    } finally {
      setJudgingStatusChanging(false);
    }
  };

  const handleEndJudging = async () => {
    setJudgingStatusChanging(true);

    try {
      const { success, message } = await endJudging({
        cursor: null,
        numItems: 50,
      });

      if (!success) {
        const errorMsg = message;

        throw new Error(errorMsg);
      }
    } catch (err: unknown) {
      console.error("Error ending judging:", err);

      return toast(genericErrMsg);
    } finally {
      setJudgingStatusChanging(false);
    }
  };

  const handleCreateGroups = async () => {
    setCreatingGroups(true);

    try {
      const { success, message } = await createGroups();

      if (!success) {
        const errorMsg = message;

        throw new Error(errorMsg);
      }

      return toast(message);
    } catch (err: unknown) {
      console.error("error creating groups:", err);

      return toast(genericErrMsg);
    } finally {
      setCreatingGroups(false);
    }
  };

  if (currentUser === undefined) {
    return <Loading />;
  }

  const judgingActive = currentUser?.judgingSession?.isActive ?? false;

  return (
    <RoleGuard role="director">
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {!judgingActive ? (
            <Button
              onClick={handleBeginJudging}
              size="sm"
              className="shadow-sm cursor-pointer self-center min-w-40"
              disabled={judgingStatusChanging}
            >
              {!judgingStatusChanging ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Begin Judging
                </>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </Button>
          ) : (
            <Button
              onClick={handleEndJudging}
              size="sm"
              variant="destructive"
              className="shadow-sm cursor-pointer self-center min-w-40"
            >
              {!judgingStatusChanging ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  End Judging
                </>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </Button>
          )}

          <div className="space-y-6 mt-2">
            <div className="bg-card rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-b-muted-foreground/20 flex flex-col gap-5 sm:items-center sm:flex-row justify-between">
                <div>
                  <h3 className="text-lg font-semibold ">Judge Groups</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign mentors to manage groups of judges
                  </p>
                </div>
                <Button
                  onClick={handleCreateGroups}
                  size="sm"
                  disabled={judgingActive || creatingGroups}
                  className="shadow-sm min-w-40 cursor-pointer"
                >
                  {!creatingGroups ? (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Create Groups
                    </>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups === undefined && <Loading />}

                  {groups &&
                    groups.map((group, groupIndex) => (
                      <Card
                        key={`group-${groupIndex}`}
                        className="border-card-foreground/30 bg-muted"
                      >
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                Manager
                              </p>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-card border-card-foreground/30"
                                >
                                  Mentor
                                </Badge>
                                <span className="text-sm">
                                  {group.mentorName}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Judges ({group.judges.length})
                              </p>
                              <div className="space-y-1">
                                {group.judges.map((judge, judgeIndex) => (
                                  <div
                                    key={`group-${groupIndex}-judge-${judgeIndex}`}
                                    className="text-sm"
                                  >
                                    {judge.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {groups && groups.length === 0 && (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium  mb-2">
                      No Judge Groups
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create groups to assign mentors to manage judges
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div id="leaderboard" className="mb-4">
            <h2 className="text-2xl font-bold">Leaderboard</h2>
            <p className="text-muted-foreground">
              Live rankings based on judge scores
            </p>
          </div>
          <Leaderboard />
        </div>
      </main>
    </RoleGuard>
  );
}

export default AdminPage;
