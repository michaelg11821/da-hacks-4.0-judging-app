import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Award, ExternalLink, Medal, Trophy } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { api } from "@/lib/convex/_generated/api";
import type { Criteria, CriteriaLabels, Criterions } from "@/lib/types/judging";
import { useQuery } from "convex/react";
import { Fragment } from "react";
import { toast } from "sonner";
import Loading from "../ui/loading";

const criteriaLabels: CriteriaLabels = {
  applicationFeasibility: "Feasibility",
  functionalityQuality: "Quality",
  creativityInnovation: "Innovation",
  technicalComplexity: "Technical",
  presentation: "Presentation",
};

function Leaderboard() {
  const projects = useQuery(api.projectsConvex.listAllProjects);

  if (projects === undefined) {
    return <Loading />;
  }

  if (projects === null) {
    toast("Error getting projects. Please refresh.");

    return null;
  }

  const projectScores = projects.map((project) => {
    if (project.scores.length === 0) {
      return { project, averageScore: 0, totalJudges: 0, breakdown: null };
    }

    const totalScore = project.scores.reduce((sum, score) => {
      const criteriaSum = Object.values(score.criteria).reduce(
        (a, b) => a + b,
        0
      );

      return sum + criteriaSum;
    }, 0);

    const averageScore = totalScore / (project.scores.length * 5);

    const breakdown: Criteria = {
      applicationFeasibility:
        project.scores.reduce(
          (sum, s) => sum + s.criteria.applicationFeasibility,
          0
        ) / project.scores.length,
      functionalityQuality:
        project.scores.reduce(
          (sum, s) => sum + s.criteria.functionalityQuality,
          0
        ) / project.scores.length,
      creativityInnovation:
        project.scores.reduce(
          (sum, s) => sum + s.criteria.creativityInnovation,
          0
        ) / project.scores.length,
      technicalComplexity:
        project.scores.reduce(
          (sum, s) => sum + s.criteria.technicalComplexity,
          0
        ) / project.scores.length,
      presentation:
        project.scores.reduce((sum, s) => sum + s.criteria.presentation, 0) /
        project.scores.length,
    };

    return {
      project,
      averageScore,
      totalJudges: project.scores.length,
      breakdown,
    };
  });

  const rankedProjects = projectScores.sort(
    (a, b) => b.averageScore - a.averageScore
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="text-lg font-bold text-muted-foreground">
            #{rank}
          </span>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            🥇 1st Place
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-gray-400 hover:bg-gray-500">🥈 2nd Place</Badge>
        );
      case 3:
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700">
            🥉 3rd Place
          </Badge>
        );
      default:
        return <Badge variant="outline">#{rank}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {rankedProjects.map((item, index) => {
        const rank = index + 1;
        const { project, averageScore, totalJudges, breakdown } = item;

        return (
          <Card
            key={project.devpostId}
            className={`${rank <= 3 && breakdown ? "ring-2 ring-primary/20 bg-gradient-to-r from-primary/5 to-background" : ""}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {breakdown ? (
                    getRankIcon(rank)
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      #{rank}
                    </span>
                  )}
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {project.teamMembers.join(", ")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {breakdown ? (
                    getRankBadge(rank)
                  ) : (
                    <Badge variant="outline">#{rank}</Badge>
                  )}
                  <div className="mt-1">
                    <span className="text-2xl font-bold">
                      {averageScore.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">/10</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2 text-xs">
                  {breakdown &&
                    Object.entries(breakdown).map(([criterion, value]) => (
                      <Fragment key={`${project._id}-${criterion}`}>
                        <div className="text-center">
                          <div className="font-medium text-foreground">
                            {criteriaLabels[criterion as Criterions]}
                          </div>
                          <div className="text-primary font-bold">
                            {value.toFixed(1)}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Scored by {totalJudges} judge
                    {totalJudges !== 1 ? "s" : ""}
                  </span>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={project.devpostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Devpost
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {rankedProjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No projects have been scored yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Leaderboard;
