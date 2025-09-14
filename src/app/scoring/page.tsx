"use client";

import { Button, buttonVariants } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  genericErrMsg,
  waitUntilSubmitMsg,
} from "@/lib/constants/errorMessages";
import { criteria } from "@/lib/constants/judging";
import { api } from "@/lib/convex/_generated/api";
import type {
  Criteria,
  CriteriaLabels,
  Criterions,
  Project,
} from "@/lib/types/judging";
import { scoreFormSchema, type scoreFormSchemaType } from "@/lib/zod/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Award, ExternalLink, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import JudgingIndicator from "../components/judging-indicator/judging-indicator";
import RoleGuard from "../components/role-guard";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import Loading from "../components/ui/loading";
import { Slider } from "../components/ui/slider";

const criteriaLabels: CriteriaLabels = {
  applicationFeasibility: "Application Feasibility (25%)",
  functionalityQuality: "Functionality & Quality (20%)",
  creativityInnovation: "Creativity & Innovation (25%)",
  technicalComplexity: "Technical Complexity (20%)",
  presentation: "Presentation (10%)",
};

const scoreDescriptions = {
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

const createDefaultValues = (): Criteria => {
  return criteria.reduce((acc, criterion) => {
    acc[criterion] = 0;

    return acc;
  }, {} as Criteria);
};

function ScoringPage() {
  const [selectedProject, setSelectedProject] = useState<Omit<
    Project,
    "scores" | "hasPresented"
  > | null>(null);
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);

  const form = useForm<scoreFormSchemaType>({
    resolver: zodResolver(scoreFormSchema),
    defaultValues: createDefaultValues(),
  });

  const panel = useQuery(api.judging.getPanel);

  const submitScore = useMutation(api.judging.submitScore);

  useEffect(() => {
    if (panel?.judgingActive === false) {
      setSelectedProject(null);
    }
  }, [panel?.judgingActive]);

  const handleProjectSelect = (devpostId: string) => {
    if (!panel?.judgingActive) return;

    const project = panel.projects.find((p) => p.devpostId === devpostId);

    if (!project)
      return toast("Could not find the selected project. Please try again.");

    form.reset();

    return setSelectedProject(project);
  };

  const onSubmit = async (criteria: scoreFormSchemaType) => {
    if (!selectedProject) return;

    if (!panel) return;

    const project = panel.projects.find(
      (p) => p.devpostId === selectedProject.devpostId
    );

    if (!project)
      return toast("Could not find the selected project. Please try again.");

    if (!project.hasPresented) {
      return toast(waitUntilSubmitMsg);
    }

    try {
      setSubmittingScore(true);

      const { success, message } = await submitScore({
        projectDevpostId: selectedProject.devpostId,
        criteria,
      });

      if (!success) {
        const errorMsg = message;

        throw new Error(errorMsg);
      }

      form.reset();

      return toast(message);
    } catch (err: unknown) {
      console.error("Failed to submit score:", err);

      return toast(genericErrMsg);
    } finally {
      setSubmittingScore(false);
    }
  };

  if (panel === undefined) {
    return <Loading />;
  }

  const judgingActive = panel?.judgingActive ?? false;

  return (
    <RoleGuard role="judge">
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <JudgingIndicator />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Select project to score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedProject?.devpostId}
                onValueChange={handleProjectSelect}
                disabled={!judgingActive}
              >
                <SelectTrigger className="w-full sm:w-70">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {panel?.projects.map((project) => (
                    <SelectItem
                      key={project.devpostId}
                      value={project.devpostId}
                    >
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {!selectedProject && (
                <Card className="h-96 flex items-center justify-center">
                  <CardContent className="text-center">
                    {!judgingActive && (
                      <h3 className="text-lg font-semibold">
                        Please wait for judging to start.
                      </h3>
                    )}

                    {judgingActive && (
                      <>
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Award className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          Select a project
                        </h3>
                        <p className="text-muted-foreground">
                          Choose a project from the dropdown above to begin
                          scoring
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-8">
                {selectedProject && judgingActive && (
                  <>
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl font-semibold">
                              {selectedProject.name}
                            </CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={selectedProject.devpostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                              })}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Devpost
                            </Link>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <Label className="text-sm font-medium text-foreground">
                            Team Members
                          </Label>
                          <p className="text-muted-foreground mt-1">
                            {selectedProject.teamMembers.join(", ")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl font-semibold">
                          Evaluation Criteria
                        </CardTitle>
                        <p className="text-muted-foreground">
                          Rate each criterion from 1 (Poor) to 5 (Excellent)
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {Object.entries(criteriaLabels).map(([key, label]) => (
                          <FormField
                            key={key}
                            control={form.control}
                            name={key as Criterions}
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <div>
                                  <FormLabel className="text-base font-medium text-foreground">
                                    {label}
                                  </FormLabel>

                                  {field.value > 0 ? (
                                    <p className="text-sm text-accent font-medium mt-1">
                                      {`${field.value} (${
                                        scoreDescriptions[
                                          field.value as keyof typeof scoreDescriptions
                                        ]
                                      })`}
                                    </p>
                                  ) : (
                                    "Not rated"
                                  )}
                                </div>
                                <FormControl>
                                  <Slider
                                    value={[field.value]}
                                    max={5}
                                    min={1}
                                    step={1}
                                    className="w-full"
                                    onValueChange={(value) =>
                                      field.onChange(value[0])
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}

                        <Button
                          type="submit"
                          size="lg"
                          className="w-full h-11 text-md font-medium cursor-pointer"
                          disabled={submittingScore}
                        >
                          {!submittingScore ? (
                            <>
                              <Send className="h-5 w-5 mr-1" />
                              Submit Score
                            </>
                          ) : (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </form>
          </Form>
        </div>
      </main>
    </RoleGuard>
  );
}

export default ScoringPage;
