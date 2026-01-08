import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Target,
  Users,
  Lightbulb,
  ArrowRight,
  Heart,
  Shield,
  Zap,
  Star,
  Leaf,
  Gift,
} from "lucide-react";
import type { NegotiationPlan } from "@shared/schema";

interface AINegotiationPanelProps {
  plan: NegotiationPlan | null;
  loading: boolean;
  error?: string;
  onGenerate: () => void;
  disabled?: boolean;
}

const discIcons: Record<string, React.ReactNode> = {
  D: <Zap className="h-4 w-4" />,
  I: <Star className="h-4 w-4" />,
  S: <Heart className="h-4 w-4" />,
  C: <Target className="h-4 w-4" />,
};

const needsIcons: Record<string, React.ReactNode> = {
  Certainty: <Shield className="h-4 w-4" />,
  Variety: <Zap className="h-4 w-4" />,
  Significance: <Star className="h-4 w-4" />,
  Connection: <Heart className="h-4 w-4" />,
  Growth: <Leaf className="h-4 w-4" />,
  Contribution: <Gift className="h-4 w-4" />,
};

export function AINegotiationPanel({
  plan,
  loading,
  error,
  onGenerate,
  disabled,
}: AINegotiationPanelProps) {
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    motivation: true,
    disc: true,
    needs: true,
    questions: true,
    framing: true,
    objections: true,
    nextSteps: true,
  });

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card data-testid="card-negotiation-panel">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Brain className="h-5 w-5" />
            AI Negotiation Plan
          </CardTitle>
          <Button
            onClick={onGenerate}
            disabled={loading || disabled}
            data-testid="button-generate-plan"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                {plan ? "Regenerate Plan" : "Generate Plan"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div
            className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm mb-4"
            data-testid="text-negotiation-error"
          >
            {error}
          </div>
        )}

        {!plan && !loading && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">
              Fill in the interview questions and click "Generate Plan" to get
              AI-powered negotiation recommendations.
            </p>
          </div>
        )}

        {loading && !plan && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Analyzing responses and building your negotiation strategy...
            </p>
          </div>
        )}

        {plan && (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-accent">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Seller Summary
                </h4>
                <p className="text-sm text-muted-foreground" data-testid="text-seller-summary">
                  {plan.sellerSummary}
                </p>
              </div>

              <CollapsibleSection
                title="Motivation Hypotheses"
                icon={<Target className="h-4 w-4" />}
                open={sectionsOpen.motivation}
                onToggle={() => toggleSection("motivation")}
              >
                <div className="space-y-2">
                  {plan.motivationHypotheses.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={`motivation-hypothesis-${idx}`}
                    >
                      <Badge
                        variant={
                          h.confidence === "high"
                            ? "default"
                            : h.confidence === "medium"
                            ? "secondary"
                            : "outline"
                        }
                        className="shrink-0 text-xs"
                      >
                        {h.confidence}
                      </Badge>
                      <span className="text-sm">{h.hypothesis}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="DISC Communication Style"
                icon={<MessageSquare className="h-4 w-4" />}
                open={sectionsOpen.disc}
                onToggle={() => toggleSection("disc")}
              >
                <div className="space-y-3">
                  {plan.discCues.map((cue, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-muted/50"
                      data-testid={`disc-cue-${idx}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {discIcons[cue.style]}
                        <span className="font-medium">{cue.style} Style</span>
                        <Badge variant="outline" className="text-xs">
                          {cue.confidence} confidence
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {cue.communicationTips.map((tip, tipIdx) => (
                          <li
                            key={tipIdx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <ArrowRight className="h-3 w-3 mt-1 shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Tony Robbins 6 Needs"
                icon={<Heart className="h-4 w-4" />}
                open={sectionsOpen.needs}
                onToggle={() => toggleSection("needs")}
              >
                <div className="grid grid-cols-1 gap-2">
                  {plan.sixNeedsMapping.map((need, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        need.relevance === "high"
                          ? "bg-accent"
                          : need.relevance === "medium"
                          ? "bg-muted/70"
                          : "bg-muted/30"
                      }`}
                      data-testid={`need-mapping-${idx}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {needsIcons[need.need]}
                        <span className="font-medium text-sm">{need.need}</span>
                        <Badge
                          variant={need.relevance === "high" ? "default" : "secondary"}
                          className="text-xs ml-auto"
                        >
                          {need.relevance}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{need.approach}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Follow-up Questions"
                icon={<Lightbulb className="h-4 w-4" />}
                open={sectionsOpen.questions}
                onToggle={() => toggleSection("questions")}
              >
                <ol className="space-y-2">
                  {plan.followUpQuestions.map((q, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm"
                      data-testid={`followup-question-${idx}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </CollapsibleSection>

              <CollapsibleSection
                title="Offer Framing Scripts"
                icon={<MessageSquare className="h-4 w-4" />}
                open={sectionsOpen.framing}
                onToggle={() => toggleSection("framing")}
              >
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h5 className="font-medium text-sm mb-2 text-chart-3">
                      Soft Approach
                    </h5>
                    <p className="text-sm text-muted-foreground" data-testid="text-soft-approach">
                      {plan.offerFraming.softApproach}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h5 className="font-medium text-sm mb-2 text-chart-1">
                      Direct Approach
                    </h5>
                    <p className="text-sm text-muted-foreground" data-testid="text-direct-approach">
                      {plan.offerFraming.directApproach}
                    </p>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Objection Handling"
                icon={<Shield className="h-4 w-4" />}
                open={sectionsOpen.objections}
                onToggle={() => toggleSection("objections")}
              >
                <div className="space-y-3">
                  {plan.objectionHandling.map((obj, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-muted/50"
                      data-testid={`objection-${idx}`}
                    >
                      <p className="font-medium text-sm text-destructive mb-1">
                        "{obj.objection}"
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {obj.response}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Next Steps"
                icon={<ArrowRight className="h-4 w-4" />}
                open={sectionsOpen.nextSteps}
                onToggle={() => toggleSection("nextSteps")}
              >
                <ol className="space-y-2">
                  {plan.nextSteps.map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm"
                      data-testid={`next-step-${idx}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CollapsibleSection>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-0 font-medium"
        >
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
