import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Gift,
  Plus,
  Trash2,
  GripVertical,
  DollarSign,
  Building2,
  Phone,
  Mail,
  Globe,
  Clock,
  FileText,
  MessageSquare,
  Eye,
  RotateCcw,
} from "lucide-react";
import type {
  SellerPresentationSettings,
  SellerBenefit,
  OfferOutput,
} from "@/types";
import { DEFAULT_SELLER_BENEFITS } from "@/types";

interface SellerPresentationSectionProps {
  settings: SellerPresentationSettings;
  offerOutput: OfferOutput | null;
  propertyAddress: string;
  onChange: (settings: SellerPresentationSettings) => void;
}

export function SellerPresentationSection({
  settings,
  offerOutput,
  propertyAddress,
  onChange,
}: SellerPresentationSectionProps) {
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  const displayPrice = settings.useCustomOfferPrice && settings.customOfferPrice > 0
    ? settings.customOfferPrice
    : offerOutput?.sellerOffer || 0;

  const updateField = useCallback(<K extends keyof SellerPresentationSettings>(
    field: K,
    value: SellerPresentationSettings[K]
  ) => {
    onChange({ ...settings, [field]: value });
  }, [settings, onChange]);

  const updateBenefit = useCallback((index: number, field: keyof SellerBenefit, value: string) => {
    const updated = settings.benefits.map((b, i) =>
      i === index ? { ...b, [field]: value } : b
    );
    updateField("benefits", updated);
  }, [settings.benefits, updateField]);

  const addBenefit = useCallback(() => {
    if (settings.benefits.length >= 6) return;
    updateField("benefits", [...settings.benefits, { title: "", description: "" }]);
  }, [settings.benefits, updateField]);

  const removeBenefit = useCallback((index: number) => {
    updateField("benefits", settings.benefits.filter((_, i) => i !== index));
  }, [settings.benefits, updateField]);

  const resetBenefits = useCallback(() => {
    updateField("benefits", DEFAULT_SELLER_BENEFITS.map(b => ({ ...b })));
  }, [updateField]);

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverRef.current = index;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dragIdx = dragItemRef.current;
    const dropIdx = dragOverRef.current;
    if (dragIdx === null || dropIdx === null || dragIdx === dropIdx) return;
    const next = [...settings.benefits];
    const [removed] = next.splice(dragIdx, 1);
    next.splice(dropIdx, 0, removed);
    updateField("benefits", next);
    dragItemRef.current = null;
    dragOverRef.current = null;
  }, [settings.benefits, updateField]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Seller Presentation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize what the seller sees when you share your offer
          </p>
        </div>
        {propertyAddress && (
          <Badge variant="outline" className="text-xs">
            {propertyAddress}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Offer Price
              </CardTitle>
              <CardDescription>
                Set a custom price or use the calculated offer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Use custom offer price</Label>
                  <p className="text-xs text-muted-foreground">Override the calculated seller offer</p>
                </div>
                <Switch
                  checked={settings.useCustomOfferPrice}
                  onCheckedChange={(checked) => updateField("useCustomOfferPrice", checked)}
                  data-testid="switch-custom-price"
                />
              </div>

              {settings.useCustomOfferPrice && (
                <div className="space-y-2">
                  <Label htmlFor="customOfferPrice">Custom Offer Price ($)</Label>
                  <Input
                    id="customOfferPrice"
                    type="number"
                    placeholder="Enter offer price"
                    value={settings.customOfferPrice || ""}
                    onChange={(e) => updateField("customOfferPrice", Number(e.target.value) || 0)}
                    data-testid="input-custom-offer-price"
                  />
                </div>
              )}

              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Price shown to seller</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-display-price">
                  ${displayPrice.toLocaleString()}
                </p>
                {offerOutput && !settings.useCustomOfferPrice && (
                  <p className="text-xs text-muted-foreground mt-1">From Offer Calculator (Fair tier)</p>
                )}
                {!offerOutput && !settings.useCustomOfferPrice && (
                  <p className="text-xs text-muted-foreground mt-1">Run the Offer Calculator first, or set a custom price above</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Your Company Info
              </CardTitle>
              <CardDescription>
                Brand the offer page with your business details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  placeholder="e.g. Impact Home Team"
                  value={settings.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPhone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone
                </Label>
                <Input
                  id="companyPhone"
                  placeholder="(555) 123-4567"
                  value={settings.companyPhone}
                  onChange={(e) => updateField("companyPhone", e.target.value)}
                  data-testid="input-company-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="companyEmail"
                  type="email"
                  placeholder="offers@company.com"
                  value={settings.companyEmail}
                  onChange={(e) => updateField("companyEmail", e.target.value)}
                  data-testid="input-company-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite" className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Website
                </Label>
                <Input
                  id="companyWebsite"
                  placeholder="https://yourcompany.com"
                  value={settings.companyWebsite}
                  onChange={(e) => updateField("companyWebsite", e.target.value)}
                  data-testid="input-company-website"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Deal Terms
              </CardTitle>
              <CardDescription>
                Key terms shown on the shared offer page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="closingTimeline" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Closing Timeline
                </Label>
                <Input
                  id="closingTimeline"
                  placeholder="e.g. 14-21 days"
                  value={settings.closingTimeline}
                  onChange={(e) => updateField("closingTimeline", e.target.value)}
                  data-testid="input-closing-timeline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="earnestMoney">Earnest Money Deposit</Label>
                <Input
                  id="earnestMoney"
                  placeholder="e.g. $1,000"
                  value={settings.earnestMoneyDeposit}
                  onChange={(e) => updateField("earnestMoneyDeposit", e.target.value)}
                  data-testid="input-earnest-money"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalTerms">Additional Terms</Label>
                <Textarea
                  id="additionalTerms"
                  placeholder="Any extra terms or conditions to display..."
                  value={settings.additionalTerms}
                  onChange={(e) => updateField("additionalTerms", e.target.value)}
                  className="resize-none"
                  rows={3}
                  data-testid="input-additional-terms"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    Offer Benefits
                  </CardTitle>
                  <CardDescription>
                    Highlight what makes your offer attractive (drag to reorder)
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetBenefits}
                  data-testid="button-reset-benefits"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.benefits.map((benefit, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  className="p-3 rounded-md border bg-muted/20 space-y-2 cursor-grab active:cursor-grabbing"
                  data-testid={`benefit-item-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Benefit title"
                      value={benefit.title}
                      onChange={(e) => updateBenefit(index, "title", e.target.value)}
                      className="flex-1"
                      data-testid={`input-benefit-title-${index}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeBenefit(index)}
                      className="text-muted-foreground flex-shrink-0"
                      data-testid={`button-remove-benefit-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Describe this benefit for the seller..."
                    value={benefit.description}
                    onChange={(e) => updateBenefit(index, "description", e.target.value)}
                    className="resize-none text-sm"
                    rows={2}
                    data-testid={`input-benefit-desc-${index}`}
                  />
                </div>
              ))}

              {settings.benefits.length < 6 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addBenefit}
                  data-testid="button-add-benefit"
                >
                  <Plus className="h-4 w-4" />
                  Add Benefit
                </Button>
              )}

              {settings.benefits.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No benefits added yet</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetBenefits}
                    data-testid="button-restore-defaults"
                  >
                    Restore defaults
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Personal Message
              </CardTitle>
              <CardDescription>
                A note to the seller shown at the top of the shared page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Hi! Thank you for considering our offer. We're excited about your property and want to make this process as smooth as possible..."
                value={settings.personalMessage}
                onChange={(e) => updateField("personalMessage", e.target.value)}
                className="resize-none"
                rows={4}
                data-testid="input-personal-message"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {settings.personalMessage.length}/500 characters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Offer Price</span>
                  <span className="font-semibold" data-testid="text-preview-price">
                    ${displayPrice.toLocaleString()}
                    {settings.useCustomOfferPrice && (
                      <Badge variant="secondary" className="ml-1.5 text-xs">Custom</Badge>
                    )}
                  </span>
                </div>
                {settings.closingTimeline && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Closing</span>
                    <span>{settings.closingTimeline}</span>
                  </div>
                )}
                {settings.earnestMoneyDeposit && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Earnest Money</span>
                    <span>{settings.earnestMoneyDeposit}</span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Benefits</span>
                  <span>{settings.benefits.filter(b => b.title).length} configured</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span>{settings.companyName || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Personal message</span>
                  <span>{settings.personalMessage ? "Added" : "None"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
