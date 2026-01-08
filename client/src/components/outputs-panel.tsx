import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, TrendingUp, TrendingDown, Home, DollarSign, Hammer, Calculator } from "lucide-react";
import type { DerivedOutputs, Answers } from "@shared/schema";
import { formatCurrency } from "@/lib/underwriting";

interface OutputsPanelProps {
  derived: DerivedOutputs;
  answers: Answers;
  assignmentFee: number;
}

export function OutputsPanel({ derived, answers, assignmentFee }: OutputsPanelProps) {
  const arv = typeof answers.arv === "number" ? answers.arv : 0;
  const sqft = typeof answers.sqft === "number" ? answers.sqft : 0;

  return (
    <Card data-testid="card-outputs-panel">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Calculator className="h-5 w-5" />
          Underwriting Outputs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="ARV"
            value={formatCurrency(arv)}
            icon={<Home className="h-4 w-4" />}
            testId="metric-arv"
          />
          <MetricCard
            label="Sqft"
            value={sqft > 0 ? `${sqft.toLocaleString()} sqft` : "—"}
            icon={<Home className="h-4 w-4" />}
            testId="metric-sqft"
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Rehab Estimate
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="$/sqft"
              value={`$${derived.rehabPerSqft}`}
              icon={<Hammer className="h-4 w-4" />}
              testId="metric-rehab-sqft"
              small
            />
            <MetricCard
              label="Total Rehab"
              value={formatCurrency(derived.rehabEstimate)}
              icon={<Hammer className="h-4 w-4" />}
              testId="metric-rehab-total"
              highlight
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Offer Calculation
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Investor Buy Price</span>
              <span className="font-mono font-semibold" data-testid="text-investor-buy-price">
                {formatCurrency(derived.investorBuyPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assignment Fee</span>
              <span className="font-mono" data-testid="text-assignment-fee-output">
                {formatCurrency(assignmentFee)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">Seller Offer</span>
              <span
                className={`font-mono text-2xl font-bold ${
                  derived.sellerOffer > 0 ? "text-chart-3" : "text-destructive"
                }`}
                data-testid="text-seller-offer"
              >
                {formatCurrency(derived.sellerOffer)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount Owed</span>
            <span className="font-mono" data-testid="text-amount-owed">
              {formatCurrency(typeof answers.amountOwed === "number" ? answers.amountOwed : 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Equity at Offer</span>
            <span
              className={`font-mono text-lg font-semibold flex items-center gap-1 ${
                derived.equityAtOffer >= 0 ? "text-chart-3" : "text-destructive"
              }`}
              data-testid="text-equity-at-offer"
            >
              {derived.equityAtOffer >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {formatCurrency(derived.equityAtOffer)}
            </span>
          </div>
        </div>

        {derived.riskFlags.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Flags
              </h3>
              <div className="space-y-2">
                {derived.riskFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      flag.severity === "high"
                        ? "bg-destructive/10 border border-destructive/20"
                        : flag.severity === "medium"
                        ? "bg-chart-4/10 border border-chart-4/20"
                        : "bg-muted"
                    }`}
                    data-testid={`risk-flag-${idx}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={flag.severity === "high" ? "destructive" : "secondary"}
                        className="text-xs uppercase"
                      >
                        {flag.severity}
                      </Badge>
                      <span className="text-foreground">{flag.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  testId: string;
  small?: boolean;
  highlight?: boolean;
}

function MetricCard({ label, value, icon, testId, small, highlight }: MetricCardProps) {
  return (
    <div
      className={`p-4 rounded-lg ${highlight ? "bg-accent" : "bg-muted/50"}`}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div
        className={`font-mono font-semibold ${
          small ? "text-lg" : "text-xl"
        } ${highlight ? "text-accent-foreground" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}
