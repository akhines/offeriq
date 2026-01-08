import { useState, useMemo, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { QuestionCard } from "@/components/question-card";
import { OutputsPanel } from "@/components/outputs-panel";
import { FeeSlider } from "@/components/fee-slider";
import { AINegotiationPanel } from "@/components/ai-negotiation-panel";
import { ExportActions } from "@/components/export-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { CompsPanel } from "@/components/comps-panel";
import { calculateDerivedOutputs } from "@/lib/underwriting";
import { apiRequest } from "@/lib/queryClient";
import {
  questionsConfig,
  type Answers,
  type NegotiationPlan,
  type QuestionConfig,
} from "@shared/schema";
import { FileText, ClipboardList } from "lucide-react";

const STORAGE_KEY = "deal-underwriter-data";

interface StoredData {
  answers: Answers;
  assignmentFee: number;
  negotiationPlan: NegotiationPlan | null;
  aiResults: Record<string, string>;
}

export default function Home() {
  const [answers, setAnswers] = useState<Answers>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredData = JSON.parse(stored);
        return data.answers;
      } catch {
        return getDefaultAnswers();
      }
    }
    return getDefaultAnswers();
  });

  const [assignmentFee, setAssignmentFee] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredData = JSON.parse(stored);
        return data.assignmentFee;
      } catch {
        return 15000;
      }
    }
    return 15000;
  });

  const [negotiationPlan, setNegotiationPlan] = useState<NegotiationPlan | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredData = JSON.parse(stored);
        return data.negotiationPlan;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [aiResults, setAiResults] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredData = JSON.parse(stored);
        return data.aiResults || {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [negotiationError, setNegotiationError] = useState<string>();

  const derived = useMemo(
    () => calculateDerivedOutputs(answers, assignmentFee),
    [answers, assignmentFee]
  );

  useEffect(() => {
    const data: StoredData = {
      answers,
      assignmentFee,
      negotiationPlan,
      aiResults,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [answers, assignmentFee, negotiationPlan, aiResults]);

  const updateAnswer = useCallback((id: string, value: string | number | boolean) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const isQuestionVisible = (question: QuestionConfig): boolean => {
    if (!question.visibilityRule) return true;
    const { dependsOn, condition, value } = question.visibilityRule;
    const dependentValue = answers[dependsOn];

    switch (condition) {
      case "equals":
        return dependentValue === value;
      case "notEquals":
        return dependentValue !== value;
      case "greaterThan":
        return typeof dependentValue === "number" && dependentValue > (value as number);
      case "lessThan":
        return typeof dependentValue === "number" && dependentValue < (value as number);
      default:
        return true;
    }
  };

  const interviewQuestions = questionsConfig.filter((q) => q.category === "interview");
  const underwritingQuestions = questionsConfig.filter((q) => q.category === "underwriting");

  const runQuestionAI = async (questionId: string) => {
    setAiLoading((prev) => ({ ...prev, [questionId]: true }));
    setAiErrors((prev) => ({ ...prev, [questionId]: "" }));

    try {
      const response = await apiRequest("POST", "/api/ai/question", {
        questionId,
        answers,
        derived,
      });
      const data = await response.json();
      setAiResults((prev) => ({ ...prev, [questionId]: data.analysis }));
    } catch (error) {
      setAiErrors((prev) => ({
        ...prev,
        [questionId]: error instanceof Error ? error.message : "AI analysis failed",
      }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const negotiationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/negotiation", {
        answers,
        derived,
        assignmentFee,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setNegotiationPlan(data.plan);
      setNegotiationError(undefined);
    },
    onError: (error) => {
      setNegotiationError(
        error instanceof Error ? error.message : "Failed to generate negotiation plan"
      );
    },
  });

  const handleReset = () => {
    setAnswers(getDefaultAnswers());
    setAssignmentFee(15000);
    setNegotiationPlan(null);
    setAiResults({});
    setAiErrors({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasRequiredFields = Boolean(
    answers.sqft && answers.arv && (answers.sqft as number) > 0 && (answers.arv as number) > 0
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Deal Underwriter</h1>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <ExportActions
              answers={answers}
              derived={derived}
              assignmentFee={assignmentFee}
              negotiationPlan={negotiationPlan}
              onReset={handleReset}
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Seller Interview</h2>
              </div>
              <div className="space-y-4">
                {interviewQuestions.map((question) =>
                  isQuestionVisible(question) ? (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      value={answers[question.id]}
                      onChange={(value) => updateAnswer(question.id, value)}
                      answers={answers}
                      derived={derived}
                      onRunAI={
                        question.aiModule ? () => runQuestionAI(question.id) : undefined
                      }
                      aiLoading={aiLoading[question.id]}
                      aiResult={aiResults[question.id]}
                      aiError={aiErrors[question.id]}
                    />
                  ) : null
                )}
              </div>
            </section>

            <Separator />

            <section>
              <div className="flex items-center gap-2 mb-6">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Underwriting Inputs</h2>
              </div>
              <div className="space-y-4">
                {underwritingQuestions.map((question) =>
                  isQuestionVisible(question) ? (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      value={answers[question.id]}
                      onChange={(value) => updateAnswer(question.id, value)}
                      answers={answers}
                      derived={derived}
                    />
                  ) : null
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 space-y-6">
              <CompsPanel
                address={typeof answers.propertyAddress === "string" ? answers.propertyAddress : ""}
                onSuggestedARV={(arv) => updateAnswer("arv", arv)}
              />

              <OutputsPanel
                derived={derived}
                answers={answers}
                assignmentFee={assignmentFee}
              />

              <FeeSlider
                value={assignmentFee}
                onChange={setAssignmentFee}
                investorBuyPrice={derived.investorBuyPrice}
                sellerOffer={derived.sellerOffer}
              />

              <AINegotiationPanel
                plan={negotiationPlan}
                loading={negotiationMutation.isPending}
                error={negotiationError}
                onGenerate={() => negotiationMutation.mutate()}
                disabled={!hasRequiredFields}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between text-sm text-muted-foreground">
          <span>Deal Underwriter - Real Estate Analysis Tool</span>
          <span>Data auto-saves locally</span>
        </div>
      </footer>
    </div>
  );
}

function getDefaultAnswers(): Answers {
  const defaults: Answers = {};
  questionsConfig.forEach((q) => {
    if (q.defaultValue !== undefined) {
      defaults[q.id] = q.defaultValue;
    }
  });
  return defaults;
}
