import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingDown, ArrowUpDown, Target, AlertTriangle } from "lucide-react";
import type { OfferSettings, OfferOutput, UnderwritingOutput } from "@/types";

interface OfferCalcSectionProps {
  settings: OfferSettings;
  offerOutput: OfferOutput | null;
  underwritingOutput: UnderwritingOutput | null;
  onSettingsChange: (settings: OfferSettings) => void;
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return "$0";
  return "$" + value.toLocaleString();
}

function getDealGradeColor(grade: string): string {
  switch (grade) {
    case "A": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
    case "B": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "C": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    case "D": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
    default: return "";
  }
}

export function OfferCalcSection({
  settings,
  offerOutput,
  underwritingOutput,
  onSettingsChange,
}: OfferCalcSectionProps) {
  const updateSetting = <K extends keyof OfferSettings>(key: K, value: OfferSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Offer Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="strategy">Investment Strategy</Label>
              <Select
                value={settings.strategy}
                onValueChange={(value) => updateSetting("strategy", value as OfferSettings["strategy"])}
              >
                <SelectTrigger data-testid="select-strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wholesale">Wholesale (Assignment)</SelectItem>
                  <SelectItem value="flip">Fix & Flip</SelectItem>
                  <SelectItem value="rental">Buy & Hold Rental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.strategy === "wholesale" ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Profit % (of ARV): {settings.profitPct}%</Label>
                    <span className="text-sm text-muted-foreground">risk-based</span>
                  </div>
                  <Slider
                    data-testid="slider-profit-pct"
                    value={[settings.profitPct]}
                    min={13}
                    max={20}
                    step={1}
                    onValueChange={([value]) => updateSetting("profitPct", value)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>13% (aggressive)</span>
                    <span>20% (conservative)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Closing Costs: {settings.closingCostPct}%</Label>
                    <span className="text-sm text-muted-foreground">of ARV</span>
                  </div>
                  <Slider
                    data-testid="slider-closing-cost-pct"
                    value={[settings.closingCostPct]}
                    min={6}
                    max={12}
                    step={0.5}
                    onValueChange={([value]) => updateSetting("closingCostPct", value)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>6%</span>
                    <span>12%</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Assignment Fee: {formatCurrency(settings.assignmentFee)}</Label>
                  </div>
                  <Slider
                    data-testid="slider-assignment-fee"
                    value={[settings.assignmentFee]}
                    min={5000}
                    max={50000}
                    step={1000}
                    onValueChange={([value]) => updateSetting("assignmentFee", value)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$5k</span>
                    <span>$50k</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Target Rule: {settings.targetRulePct}%</Label>
                    <span className="text-sm text-muted-foreground">of as-is value</span>
                  </div>
                  <Slider
                    data-testid="slider-target-rule"
                    value={[settings.targetRulePct]}
                    min={50}
                    max={90}
                    step={1}
                    onValueChange={([value]) => updateSetting("targetRulePct", value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard: 65-75% for flips
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="closingCosts">Closing Costs</Label>
                    <Input
                      id="closingCosts"
                      type="number"
                      data-testid="input-closing-costs"
                      value={settings.closingCosts}
                      onChange={(e) => updateSetting("closingCosts", Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="holdingBuffer">Holding Buffer</Label>
                    <Input
                      id="holdingBuffer"
                      type="number"
                      data-testid="input-holding-buffer"
                      value={settings.holdingBuffer}
                      onChange={(e) => updateSetting("holdingBuffer", Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="desiredProfit">Desired Profit</Label>
                  <Input
                    id="desiredProfit"
                    type="number"
                    data-testid="input-desired-profit"
                    value={settings.desiredProfit}
                    onChange={(e) => updateSetting("desiredProfit", Number(e.target.value) || 0)}
                  />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Risk Buffer: {formatCurrency(settings.riskBuffer)}</Label>
                  </div>
                  <Slider
                    data-testid="slider-risk-buffer"
                    value={[settings.riskBuffer]}
                    min={0}
                    max={30000}
                    step={1000}
                    onValueChange={([value]) => updateSetting("riskBuffer", value)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$0 (aggressive)</span>
                    <span>$30k (conservative)</span>
                  </div>
                </div>
              </>
            )}

            {settings.strategy !== "wholesale" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Market Cooling Factor: {settings.marketCoolingFactorPct}%</Label>
                </div>
                <Slider
                  data-testid="slider-cooling-factor"
                  value={[settings.marketCoolingFactorPct]}
                  min={0}
                  max={10}
                  step={0.5}
                  onValueChange={([value]) => updateSetting("marketCoolingFactorPct", value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust for declining markets. 0% = stable, 10% = significant cooling
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Offer Output</CardTitle>
              {offerOutput && (
                <Badge className={getDealGradeColor(offerOutput.dealGrade)}>
                  Grade {offerOutput.dealGrade}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {offerOutput && underwritingOutput ? (
              <>
                {settings.strategy === "wholesale" && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
                    <p className="font-medium mb-2">Formula Breakdown:</p>
                    <div className="font-mono text-xs space-y-1">
                      <p>ARV: {formatCurrency(underwritingOutput.arv)}</p>
                      <p>× {(100 - settings.closingCostPct).toFixed(1)}% = {formatCurrency(underwritingOutput.arv * (1 - settings.closingCostPct/100))}</p>
                      <p>− Profit ({settings.profitPct}% of ARV): {formatCurrency(underwritingOutput.arv * settings.profitPct/100)}</p>
                      <p>− Repairs (high): {formatCurrency(underwritingOutput.repairHigh)}</p>
                      <p className="font-bold pt-1 border-t border-border">= Wholesale Price: {formatCurrency(offerOutput.investorBuyPrice)}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {settings.strategy === "wholesale" ? "Wholesale Price" : "Investor Buy Price"}
                    </p>
                    <p className="font-mono text-xl font-bold">{formatCurrency(offerOutput.investorBuyPrice)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Seller Offer</p>
                    <p className="font-mono text-xl font-bold text-primary">{formatCurrency(offerOutput.sellerOffer)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Offer is % of ARV</span>
                  <span className="font-mono font-semibold" data-testid="text-offer-arv-percent">
                    {((offerOutput.sellerOffer / underwritingOutput.arv) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Margin (ARV − Offer)</span>
                  <span className={`font-mono font-semibold ${offerOutput.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(underwritingOutput.arv - offerOutput.sellerOffer)} ({((underwritingOutput.arv - offerOutput.sellerOffer) / underwritingOutput.arv * 100).toFixed(1)}%)
                  </span>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Offer Ladder
                  </h4>
                  <div className="space-y-3">
                    {offerOutput.offerLadder.map((tier, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          tier.name === "Fair"
                            ? "bg-primary/5 border-primary/20"
                            : "bg-muted/50 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{tier.name}</span>
                          <span className="font-mono font-bold">{formatCurrency(tier.price)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{tier.useWhen}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sensitivity Analysis
                  </h4>
                  <ul className="space-y-2">
                    {offerOutput.sensitivity.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <TrendingDown className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {settings.strategy === "wholesale" && (
                  <>
                    <Separator />
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Your Assignment Fee</span>
                        <span className="font-mono font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(settings.assignmentFee)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Complete underwriting to generate offer calculations</p>
                <p className="text-sm mt-1">Need as-is value estimate to calculate offers</p>
              </div>
            )}
          </CardContent>
        </Card>

        {!underwritingOutput && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">Underwriting Required</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter property information in the Underwriting section to generate offer calculations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
