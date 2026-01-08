import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/underwriting";

interface FeeSliderProps {
  value: number;
  onChange: (value: number) => void;
  investorBuyPrice: number;
  sellerOffer: number;
}

export function FeeSlider({
  value,
  onChange,
  investorBuyPrice,
  sellerOffer,
}: FeeSliderProps) {
  const minFee = 5000;
  const maxFee = 50000;
  const step = 1000;

  return (
    <Card data-testid="card-fee-slider">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <DollarSign className="h-5 w-5" />
          Assignment Fee
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div
            className="font-mono text-4xl font-bold text-foreground mb-2"
            data-testid="text-fee-value"
          >
            {formatCurrency(value)}
          </div>
          <p className="text-sm text-muted-foreground">
            Your profit on this deal
          </p>
        </div>

        <div className="space-y-4">
          <Slider
            value={[value]}
            onValueChange={([v]) => onChange(v)}
            min={minFee}
            max={maxFee}
            step={step}
            className="w-full"
            data-testid="slider-assignment-fee"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{formatCurrency(minFee)}</span>
            <span>{formatCurrency(maxFee)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              <TrendingUp className="h-3 w-3" />
              Investor Pays
            </div>
            <div
              className="font-mono text-lg font-semibold text-foreground"
              data-testid="text-investor-pays"
            >
              {formatCurrency(investorBuyPrice)}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-accent text-center">
            <div className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              <TrendingDown className="h-3 w-3" />
              Seller Gets
            </div>
            <div
              className={`font-mono text-lg font-semibold ${
                sellerOffer >= 0 ? "text-chart-3" : "text-destructive"
              }`}
              data-testid="text-seller-gets"
            >
              {formatCurrency(sellerOffer)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
