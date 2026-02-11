import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Share2,
  Check,
  Copy,
  Link2,
  Loader2,
  Home,
  TrendingUp,
  BarChart3,
  Calculator,
  Layers,
  Award,
  MessageSquare,
  ExternalLink,
  XCircle,
  Clock,
  LinkIcon,
} from "lucide-react";
import type {
  PropertyInfo,
  AVMBaselines,
  UnderwritingOutput,
  OfferOutput,
  OfferSettings,
  PresentationOutput,
} from "@/types";

export const SHAREABLE_SECTIONS = [
  { id: "property_details", label: "Property Details", description: "Address, beds/baths, sqft, year built", icon: Home },
  { id: "avm_valuation", label: "AVM / Valuation", description: "Blended value estimate, confidence score", icon: TrendingUp },
  { id: "comparable_sales", label: "Comparable Sales", description: "Comp table with prices, sqft, distance", icon: BarChart3 },
  { id: "offer_formula", label: "Offer Formula", description: "Wholesale calculation breakdown", icon: Calculator },
  { id: "offer_ladder", label: "Offer Ladder", description: "Fast Yes / Fair / Stretch tiers", icon: Layers },
  { id: "deal_grade", label: "Deal Grade", description: "A/B/C/D rating with explanation", icon: Award },
  { id: "negotiation_plan", label: "Negotiation Plan", description: "AI-generated presentation plan", icon: MessageSquare },
] as const;

export type SectionId = typeof SHAREABLE_SECTIONS[number]["id"];

interface SharedLink {
  id: string;
  code: string;
  propertyAddress: string;
  sections: string[];
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface ShareOfferDialogProps {
  property: PropertyInfo;
  avmBaselines: AVMBaselines;
  underwritingOutput: UnderwritingOutput | null;
  offerOutput: OfferOutput | null;
  offerSettings: OfferSettings;
  presentationOutput: PresentationOutput | null;
  isAuthenticated: boolean;
}

type DialogView = "create" | "success" | "manage";

export function ShareOfferDialog({
  property,
  avmBaselines,
  underwritingOutput,
  offerOutput,
  offerSettings,
  presentationOutput,
  isAuthenticated,
}: ShareOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DialogView>("create");
  const [selectedSections, setSelectedSections] = useState<Set<SectionId>>(
    () => new Set<SectionId>(["property_details", "offer_ladder", "deal_grade"])
  );
  const [expiresIn, setExpiresIn] = useState("7");
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [myLinks, setMyLinks] = useState<SharedLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMyLinks = async () => {
    if (!isAuthenticated) return;
    setLoadingLinks(true);
    try {
      const res = await fetch("/api/shares", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMyLinks(data.shares || []);
      }
    } catch {
    } finally {
      setLoadingLinks(false);
    }
  };

  const toggleSection = (id: SectionId) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isSectionAvailable = (id: SectionId): boolean => {
    switch (id) {
      case "property_details":
        return !!property.address;
      case "avm_valuation":
        return !!underwritingOutput;
      case "comparable_sales":
        return !!underwritingOutput;
      case "offer_formula":
        return !!offerOutput;
      case "offer_ladder":
        return !!offerOutput;
      case "deal_grade":
        return !!offerOutput;
      case "negotiation_plan":
        return !!presentationOutput;
      default:
        return false;
    }
  };

  const handleCreate = async () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }

    if (selectedSections.size === 0) {
      toast({ description: "Select at least one section to share", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const dealSnapshot = {
        property,
        avmBaselines,
        underwritingOutput,
        offerOutput,
        offerSettings,
        presentationOutput,
      };

      const res = await apiRequest("POST", "/api/shares", {
        propertyAddress: property.address || "Unknown Property",
        sections: Array.from(selectedSections),
        dealSnapshot,
        expiresInDays: expiresIn === "never" ? null : parseInt(expiresIn),
      });

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.url}`;
      setShareUrl(fullUrl);
      setView("success");

      fetchMyLinks();
      toast({ description: "Share link created" });
    } catch (error) {
      toast({ description: "Failed to create share link", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (url?: string) => {
    const toCopy = url || shareUrl;
    if (!toCopy) return;
    await navigator.clipboard.writeText(toCopy);
    if (url) {
      const code = url.split("/s/")[1];
      setCopiedCode(code || null);
      setTimeout(() => setCopiedCode(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    toast({ description: "Link copied to clipboard" });
  };

  const handleDeactivate = async (code: string) => {
    try {
      await apiRequest("PATCH", `/api/shares/${code}`, { isActive: false });
      setMyLinks((prev) => prev.map((l) => l.code === code ? { ...l, isActive: false } : l));
      toast({ description: "Share link deactivated" });
    } catch {
      toast({ description: "Failed to deactivate link", variant: "destructive" });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && isAuthenticated) {
      fetchMyLinks();
    }
    if (!isOpen) {
      setView("create");
      setShareUrl(null);
      setCopied(false);
    }
  };

  const hasData = !!property.address && (!!underwritingOutput || !!offerOutput);

  const activeLinks = myLinks.filter((l) => l.isActive);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasData}
          data-testid="button-share-offer"
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Offer Package
          </DialogTitle>
        </DialogHeader>

        {isAuthenticated && view !== "success" && (
          <div className="flex gap-1 mb-2">
            <Button
              variant={view === "create" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("create")}
              data-testid="tab-create-link"
            >
              New Link
            </Button>
            <Button
              variant={view === "manage" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("manage")}
              data-testid="tab-my-links"
            >
              My Links
              {activeLinks.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {activeLinks.length}
                </Badge>
              )}
            </Button>
          </div>
        )}

        {view === "success" && shareUrl && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your share link is ready. Send this to the property owner to review the offer together.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2.5 rounded-md truncate" data-testid="text-share-url">
                {shareUrl}
              </code>
              <Button size="icon" variant="outline" onClick={() => handleCopy()} data-testid="button-copy-share-url">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {selectedSections.size} section{selectedSections.size !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {expiresIn === "never" ? "No expiration" : `Expires in ${expiresIn} days`}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => setView("create")} data-testid="button-create-another">
                Create Another
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => window.open(shareUrl, "_blank")}
                data-testid="button-preview-share"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Preview
              </Button>
            </div>
          </div>
        )}

        {view === "create" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose which sections the property owner will see when they open the link.
            </p>

            <div className="space-y-1.5">
              {SHAREABLE_SECTIONS.map((section) => {
                const available = isSectionAvailable(section.id);
                const selected = selectedSections.has(section.id);
                const Icon = section.icon;

                return (
                  <button
                    key={section.id}
                    type="button"
                    disabled={!available}
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                      !available
                        ? "opacity-40 cursor-not-allowed"
                        : selected
                          ? "bg-primary/10 border border-primary/30"
                          : "hover-elevate border border-transparent"
                    }`}
                    data-testid={`toggle-section-${section.id}`}
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-md ${
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{section.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{section.description}</div>
                    </div>
                    {selected && available && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    {!available && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">No data</Badge>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Expires in</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger className="flex-1" data-testid="select-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={isCreating || selectedSections.size === 0}
              data-testid="button-generate-share-link"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Generate Share Link
                </>
              )}
            </Button>
          </div>
        )}

        {view === "manage" && (
          <div className="space-y-3">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : myLinks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No shared links yet
              </div>
            ) : (
              myLinks.map((link) => {
                const expired = isExpired(link.expiresAt);
                const inactive = !link.isActive || expired;
                const linkUrl = `${window.location.origin}/s/${link.code}`;

                return (
                  <div
                    key={link.id}
                    className={`p-3 rounded-md border ${inactive ? "opacity-50" : ""}`}
                    data-testid={`card-shared-link-${link.code}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{link.propertyAddress}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            {link.code}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {(link.sections as string[]).length} sections
                          </Badge>
                          {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                          {!link.isActive && !expired && <Badge variant="destructive" className="text-xs">Deactivated</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {formatDate(link.createdAt)}
                          {link.expiresAt && !expired && ` · Expires ${formatDate(link.expiresAt)}`}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!inactive && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleCopy(linkUrl)}
                              data-testid={`button-copy-link-${link.code}`}
                            >
                              {copiedCode === link.code ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeactivate(link.code)}
                              data-testid={`button-deactivate-link-${link.code}`}
                            >
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
