import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Sparkles, ChevronDown, ChevronUp, HelpCircle, Loader2 } from "lucide-react";
import type { QuestionConfig, Answers, DerivedOutputs } from "@shared/schema";
import { conditionToRehabPerSqft } from "@shared/schema";
import { formatCurrency } from "@/lib/underwriting";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuestionCardProps {
  question: QuestionConfig;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
  answers: Answers;
  derived: DerivedOutputs;
  onRunAI?: () => void;
  aiLoading?: boolean;
  aiResult?: string;
  aiError?: string;
}

export function QuestionCard({
  question,
  value,
  onChange,
  answers,
  derived,
  onRunAI,
  aiLoading,
  aiResult,
  aiError,
}: QuestionCardProps) {
  const [aiOpen, setAiOpen] = useState(false);

  const renderInput = () => {
    switch (question.type) {
      case "text":
        return (
          <Input
            type="text"
            placeholder={question.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            data-testid={`input-${question.id}`}
            className="h-10"
          />
        );

      case "textarea":
        return (
          <Textarea
            placeholder={question.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            data-testid={`textarea-${question.id}`}
            className="min-h-24 resize-none"
          />
        );

      case "number":
        return (
          <div className="relative">
            {question.id.includes("Rate") || question.id === "investorRule" ? null : (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                $
              </span>
            )}
            <Input
              type="number"
              placeholder={question.placeholder?.replace("$", "") || "0"}
              value={typeof value === "number" ? value : ""}
              onChange={(e) => {
                const num = parseFloat(e.target.value);
                onChange(isNaN(num) ? 0 : num);
              }}
              data-testid={`input-${question.id}`}
              className={`h-10 font-mono ${
                question.id.includes("Rate") || question.id === "investorRule"
                  ? ""
                  : "pl-7"
              }`}
              min={question.validation?.min}
              max={question.validation?.max}
            />
            {(question.id.includes("Rate") || question.id === "investorRule") && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                %
              </span>
            )}
          </div>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked)}
              data-testid={`switch-${question.id}`}
            />
            <span className="text-sm text-muted-foreground">
              {value === true ? "Yes" : "No"}
            </span>
          </div>
        );

      case "scale":
        const scaleValue = typeof value === "number" ? value : (question.defaultValue as number) ?? 5;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Slider
                value={[scaleValue]}
                onValueChange={([v]) => onChange(v)}
                min={question.validation?.min ?? 0}
                max={question.validation?.max ?? 10}
                step={1}
                className="flex-1"
                data-testid={`slider-${question.id}`}
              />
              <span className="ml-4 w-12 text-right font-mono text-2xl font-semibold text-foreground">
                {scaleValue}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 - Complete renovation</span>
              <span>10 - Move-in ready</span>
            </div>
          </div>
        );

      case "select":
        return (
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger
              className="h-10"
              data-testid={`select-${question.id}`}
            >
              <SelectValue placeholder={question.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  const renderDerivedField = () => {
    if (!question.derivedField) return null;

    if (question.id === "conditionScore") {
      const score = typeof value === "number" ? Math.round(value) : 5;
      const perSqft = conditionToRehabPerSqft[score] ?? 32;
      return (
        <Badge variant="secondary" className="font-mono text-xs">
          Est. ${perSqft}/sqft rehab
        </Badge>
      );
    }

    if (question.id === "hvacAge") {
      const age = typeof value === "number" ? value : 0;
      if (age >= 15) {
        return (
          <Badge
            variant="destructive"
            className="text-xs"
          >
            {age >= 20 ? "High Risk" : "Medium Risk"} - Replacement likely
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-xs">
          Low Risk
        </Badge>
      );
    }

    return null;
  };

  return (
    <Card className="transition-all" data-testid={`card-question-${question.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Label
                htmlFor={question.id}
                className="text-base font-medium leading-tight"
              >
                {question.label}
              </Label>
              {question.helpText && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm">{question.helpText}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {question.required && (
                <span className="text-destructive text-sm">*</span>
              )}
            </div>
          </div>
          {question.aiModule && onRunAI && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRunAI}
              disabled={aiLoading}
              data-testid={`button-ai-${question.id}`}
              className="shrink-0"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {question.aiModule.buttonLabel}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {renderInput()}

          <div className="flex items-center gap-2 flex-wrap">
            {renderDerivedField()}
          </div>

          {(aiResult || aiError) && (
            <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground"
                  data-testid={`button-ai-toggle-${question.id}`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Analysis
                  </span>
                  {aiOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div
                  className={`mt-2 p-4 rounded-lg text-sm ${
                    aiError
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted"
                  }`}
                  data-testid={`text-ai-result-${question.id}`}
                >
                  {aiError ? (
                    <p>{aiError}</p>
                  ) : (
                    <div className="whitespace-pre-wrap">{aiResult}</div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
