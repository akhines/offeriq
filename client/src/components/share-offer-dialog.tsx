import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Share2,
  Check,
  Copy,
  Link2,
  Loader2,
  Home,
  TrendingUp,
  BarChart3,
  Layers,
  Award,
  ExternalLink,
  XCircle,
  Clock,
  LinkIcon,
  Gift,
  Pencil,
  GripVertical,
  FileText,
  Scale,
} from "lucide-react";
import type {
  PropertyInfo,
  AVMBaselines,
  UnderwritingOutput,
  OfferOutput,
  OfferSettings,
  PresentationOutput,
  SellerPresentationSettings,
} from "@/types";

export const SHAREABLE_SECTIONS = [
  { id: "property_details", label: "Property Details", description: "Address, beds/baths, sqft, year built", icon: Home },
  { id: "deal_grade", label: "Offer Strength", description: "Grade with seller-focused benefits", icon: Award },
  { id: "deal_terms", label: "Deal Terms", description: "Closing timeline, earnest money, terms", icon: FileText },
  { id: "apples_to_apples", label: "Compare Your Options", description: "Side-by-side comparison vs. traditional listing", icon: Scale },
  { id: "offer_benefits", label: "Why This Offer Works", description: "Key benefits of accepting your offer", icon: Gift },
  { id: "avm_valuation", label: "Property Value Estimate", description: "Estimated market value range", icon: TrendingUp },
  { id: "comparable_sales", label: "Comparable Sales", description: "Recent sales with prices, sqft, distance", icon: BarChart3 },
  { id: "offer_ladder", label: "Offer Options", description: "Multiple price tiers to consider", icon: Layers },
] as const;

export interface OfferBenefit {
  title: string;
  description: string;
}

export const DEFAULT_OFFER_BENEFITS: OfferBenefit[] = [
  {
    title: "Buy As-Is",
    description: "No repairs, cleaning, or renovations needed. We purchase your property in its current condition so you can skip the hassle and expense of fixing it up.",
  },
  {
    title: "No Hidden Fees",
    description: "Zero commissions, no closing costs on your end, and no surprise charges. The offer you accept is the amount you walk away with.",
  },
  {
    title: "We Help You Move",
    description: "We coordinate and cover moving assistance to make your transition as smooth as possible. Just pack your personal items and we handle the rest.",
  },
];

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
  sellerPresentation?: SellerPresentationSettings;
  compsData?: any;
  userComps?: any;
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
  sellerPresentation,
  compsData,
  userComps,
  isAuthenticated,
}: ShareOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DialogView>("create");
  const [orderedSections, setOrderedSections] = useState<SectionId[]>(
    () => ["property_details", "deal_grade", "deal_terms", "apples_to_apples", "offer_benefits"]
  );
  const [expiresIn, setExpiresIn] = useState("7");
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [myLinks, setMyLinks] = useState<SharedLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedSections = new Set<SectionId>(orderedSections);

  const dragItemRef = useRef<SectionId | null>(null);
  const dragOverItemRef = useRef<SectionId | null>(null);

  const handleDragStart = useCallback((sectionId: SectionId) => {
    dragItemRef.current = sectionId;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, sectionId: SectionId) => {
    e.preventDefault();
    dragOverItemRef.current = sectionId;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dragId = dragItemRef.current;
    const dropId = dragOverItemRef.current;
    if (!dragId || !dropId || dragId === dropId) return;

    setOrderedSections(prev => {
      const dragIdx = prev.indexOf(dragId);
      const dropIdx = prev.indexOf(dropId);
      if (dragIdx === -1 || dropIdx === -1) return prev;
      const next = [...prev];
      next.splice(dragIdx, 1);
      next.splice(dropIdx, 0, dragId);
      return next;
    });

    dragItemRef.current = null;
    dragOverItemRef.current = null;
  }, []);

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
    setOrderedSections((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const isSectionAvailable = (id: SectionId): boolean => {
    switch (id) {
      case "property_details":
        return !!property.address;
      case "avm_valuation":
        return !!underwritingOutput;
      case "comparable_sales":
        return !!(compsData?.comps?.length || userComps?.comps?.length);
      case "offer_ladder":
        return !!offerOutput;
      case "deal_grade":
        return !!offerOutput;
      case "deal_terms":
        return true;
      case "apples_to_apples":
        return !!(offerOutput || underwritingOutput);
      case "offer_benefits":
        return true;
      default:
        return false;
    }
  };


  const handleCreate = async () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }

    if (orderedSections.length === 0) {
      toast({ title: "No Sections Selected", description: "Choose at least one section to include in the shared link.", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const benefits = sellerPresentation?.benefits?.length
        ? sellerPresentation.benefits
        : DEFAULT_OFFER_BENEFITS;

      const dealSnapshot = {
        property,
        avmBaselines,
        underwritingOutput,
        offerOutput,
        offerSettings,
        presentationOutput,
        compsData: compsData || null,
        userComps: userComps || null,
        offerBenefits: selectedSections.has("offer_benefits") ? benefits : null,
        companyName: sellerPresentation?.companyName || null,
        companyPhone: sellerPresentation?.companyPhone || null,
        companyEmail: sellerPresentation?.companyEmail || null,
        companyWebsite: sellerPresentation?.companyWebsite || null,
        personalMessage: sellerPresentation?.personalMessage || null,
        closingTimeline: sellerPresentation?.closingTimeline || null,
        earnestMoneyDeposit: sellerPresentation?.earnestMoneyDeposit || null,
        additionalTerms: sellerPresentation?.additionalTerms || null,
        customOfferPrice: sellerPresentation?.useCustomOfferPrice ? sellerPresentation.customOfferPrice : null,
        sellerComps: sellerPresentation?.sellerComps?.filter(c => c.address) || null,
      };

      const res = await apiRequest("POST", "/api/shares", {
        propertyAddress: property.address || "Unknown Property",
        sections: orderedSections,
        dealSnapshot,
        expiresInDays: expiresIn === "never" ? null : parseInt(expiresIn),
      });

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.url}`;
      setShareUrl(fullUrl);
      setView("success");

      fetchMyLinks();
      toast({ title: "Link Created", description: "Your share link is ready. Send it to the property owner." });
    } catch (error) {
      toast({ title: "Creation Failed", description: "We couldn't create the share link. Please try again.", variant: "destructive" });
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
    toast({ title: "Copied", description: "Share link copied to clipboard." });
  };

  const handleDeactivate = async (code: string) => {
    try {
      await apiRequest("PATCH", `/api/shares/${code}`, { isActive: false });
      setMyLinks((prev) => prev.map((l) => l.code === code ? { ...l, isActive: false } : l));
      toast({ title: "Link Deactivated", description: "This share link will no longer work for recipients." });
    } catch {
      toast({ title: "Deactivation Failed", description: "We couldn't deactivate this link. Please try again.", variant: "destructive" });
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
          size="icon"
          className="sm:w-auto sm:px-3 min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-0"
          disabled={!hasData}
          data-testid="button-share-offer"
        >
          <Share2 className="h-4 w-4 sm:mr-1.5" />
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
                {orderedSections.length} section{orderedSections.length !== 1 ? "s" : ""}
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

            {orderedSections.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Selected (drag to reorder)</Label>
                <div className="space-y-1">
                  {orderedSections.map((sectionId) => {
                    const section = SHAREABLE_SECTIONS.find((s) => s.id === sectionId);
                    if (!section) return null;
                    const Icon = section.icon;

                    return (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={() => handleDragStart(section.id)}
                        onDragOver={(e) => handleDragOver(e, section.id)}
                        onDrop={handleDrop}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left bg-primary/10 border border-primary/30 cursor-grab active:cursor-grabbing select-none"
                        data-testid={`selected-section-${section.id}`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary text-primary-foreground flex-shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{section.label}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                          className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
                          data-testid={`remove-section-${section.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              {orderedSections.length > 0 && (
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Available</Label>
              )}
              <div className="space-y-1">
                {SHAREABLE_SECTIONS.filter((s) => !selectedSections.has(s.id)).map((section) => {
                  const available = isSectionAvailable(section.id);
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
                          : "hover-elevate border border-transparent"
                      }`}
                      data-testid={`toggle-section-${section.id}`}
                    >
                      <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted text-muted-foreground flex-shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{section.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{section.description}</div>
                      </div>
                      {!available && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">No data</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedSections.has("offer_benefits") && sellerPresentation?.benefits && sellerPresentation.benefits.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Offer Benefits Preview</Label>
                <p className="text-xs text-muted-foreground">Edit benefits in the Seller Presentation tab</p>
                <div className="space-y-1.5">
                  {sellerPresentation.benefits.map((benefit, i) => (
                    <div key={i} className="p-2 rounded-md border bg-muted/20">
                      <p className="text-sm font-medium">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{benefit.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              disabled={isCreating || orderedSections.length === 0}
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
