import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Target,
  Users,
  Heart,
  ListChecks,
  Clock,
  Loader2,
  Lock,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SellerInfo, PresentationInput, PresentationOutput, OfferOutput, UnderwritingOutput, CallNote } from "@/types";

const GHL_INTEGRATION_STATUS = {
  available: false,
  message: "GoHighLevel integration is a premium feature coming soon. This will allow automatic import of call transcripts and conversation history.",
  features: [
    "Automatic call transcript import",
    "Conversation thread sync",
    "Contact data enrichment",
    "Two-way note syncing",
  ],
};

interface OfferPresentationSectionProps {
  seller: SellerInfo;
  presentationInput: PresentationInput;
  presentationOutput: PresentationOutput | null;
  offerOutput: OfferOutput | null;
  underwritingOutput: UnderwritingOutput | null;
  onPresentationInputChange: (input: PresentationInput) => void;
  onPresentationOutputChange: (output: PresentationOutput) => void;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ description: `${label || "Text"} copied to clipboard` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      data-testid={`button-copy-${label?.toLowerCase().replace(/\s/g, "-") || "text"}`}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function OfferPresentationSection({
  seller,
  presentationInput,
  presentationOutput,
  offerOutput,
  underwritingOutput,
  onPresentationInputChange,
  onPresentationOutputChange,
}: OfferPresentationSectionProps) {
  const { toast } = useToast();
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [newNoteText, setNewNoteText] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/presentation", {
        seller,
        presentationInput,
        underwriting: underwritingOutput,
        offer: offerOutput,
      });
      return response.json();
    },
    onSuccess: (data) => {
      onPresentationOutputChange(data.plan);
      toast({ description: "Presentation plan generated successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Failed to generate plan",
      });
    },
  });

  const addCallNote = () => {
    if (!newNoteText.trim()) return;
    const newNote: CallNote = {
      id: Date.now().toString(),
      date: newNoteDate,
      text: newNoteText.trim(),
    };
    onPresentationInputChange({
      ...presentationInput,
      callNotes: [...(presentationInput.callNotes || []), newNote],
    });
    setNewNoteText("");
  };

  const removeCallNote = (id: string) => {
    onPresentationInputChange({
      ...presentationInput,
      callNotes: (presentationInput.callNotes || []).filter((n) => n.id !== id),
    });
  };

  const canGenerate = underwritingOutput && offerOutput;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Call Notes & Transcripts</CardTitle>
            <CardDescription>Add notes from seller conversations for AI analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <Label htmlFor="noteDate">Date</Label>
                  <Input
                    id="noteDate"
                    type="date"
                    data-testid="input-note-date"
                    value={newNoteDate}
                    onChange={(e) => setNewNoteDate(e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <Label htmlFor="noteText">Note</Label>
                  <div className="flex gap-2">
                    <Input
                      id="noteText"
                      data-testid="input-note-text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Summary of conversation..."
                      onKeyDown={(e) => e.key === "Enter" && addCallNote()}
                    />
                    <Button size="icon" onClick={addCallNote} data-testid="button-add-note">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {(presentationInput.callNotes || []).length > 0 && (
                <ScrollArea className="h-40 rounded-md border p-3">
                  <div className="space-y-2">
                    {(presentationInput.callNotes || []).map((note) => (
                      <div
                        key={note.id}
                        className="flex items-start justify-between gap-2 p-2 rounded bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{note.date}</p>
                          <p className="text-sm truncate">{note.text}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeCallNote(note.id)}
                          data-testid={`button-remove-note-${note.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator />

            <div>
              <Label htmlFor="transcript">Transcript Paste (optional)</Label>
              <Textarea
                id="transcript"
                data-testid="input-transcript"
                value={presentationInput.transcriptPaste || ""}
                onChange={(e) =>
                  onPresentationInputChange({ ...presentationInput, transcriptPaste: e.target.value })
                }
                placeholder="Paste full call transcript here..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Presentation Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="communication">Preferred Contact Method</Label>
                <Select
                  value={presentationInput.preferredCommunication || ""}
                  onValueChange={(value) =>
                    onPresentationInputChange({
                      ...presentationInput,
                      preferredCommunication: value as PresentationInput["preferredCommunication"],
                    })
                  }
                >
                  <SelectTrigger data-testid="select-communication">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tone">Tone Preference</Label>
                <Select
                  value={presentationInput.tonePreference || ""}
                  onValueChange={(value) =>
                    onPresentationInputChange({
                      ...presentationInput,
                      tonePreference: value as PresentationInput["tonePreference"],
                    })
                  }
                >
                  <SelectTrigger data-testid="select-tone">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual / Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="priorOffers">Prior Offers Made</Label>
              <Input
                id="priorOffers"
                data-testid="input-prior-offers"
                value={presentationInput.priorOffers || ""}
                onChange={(e) =>
                  onPresentationInputChange({ ...presentationInput, priorOffers: e.target.value })
                }
                placeholder="Any previous offers discussed..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Premium: GoHighLevel Integration</CardTitle>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{GHL_INTEGRATION_STATUS.message}</p>
            <ul className="space-y-1">
              {GHL_INTEGRATION_STATUS.features.map((feature, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!canGenerate || generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          data-testid="button-generate-presentation"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Offer Presentation Plan
            </>
          )}
        </Button>

        {!canGenerate && (
          <p className="text-sm text-center text-muted-foreground">
            Complete underwriting and offer calculation first
          </p>
        )}
      </div>

      <div className="space-y-6">
        {presentationOutput ? (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4 pr-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Seller Summary
                    </CardTitle>
                    <CopyButton text={presentationOutput.sellerSummary} label="Summary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{presentationOutput.sellerSummary}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Motivation Hypotheses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(presentationOutput.motivationHypotheses || []).map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge
                          variant="outline"
                          className={
                            h.confidence === "high"
                              ? "border-green-500 text-green-600"
                              : h.confidence === "medium"
                                ? "border-yellow-500 text-yellow-600"
                                : "border-gray-500 text-gray-600"
                          }
                        >
                          {h.confidence}
                        </Badge>
                        <span className="text-sm">{h.hypothesis}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Communication Cues (DISC Hypotheses)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {(presentationOutput.communicationCues || []).map((cue, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {cue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Six Human Needs Mapping
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(presentationOutput.sixNeedsMapping || []).map((need, i) => (
                      <div key={i} className="p-2 rounded bg-muted/50">
                        <p className="text-sm font-medium">{need.need}</p>
                        <p className="text-xs text-muted-foreground">{need.hypothesis}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recommended Approach</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>
                      {presentationOutput.recommendedOfferTier === "fast_yes"
                        ? "Fast Yes"
                        : presentationOutput.recommendedOfferTier === "fair"
                          ? "Fair"
                          : "Stretch"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">tier recommended</span>
                  </div>
                  <p className="text-sm">{presentationOutput.offerPackagingPlan}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Talk Track - Soft Approach</CardTitle>
                    <CopyButton text={presentationOutput.talkTrackSoft} label="Soft script" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{presentationOutput.talkTrackSoft}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Talk Track - Direct Approach</CardTitle>
                    <CopyButton text={presentationOutput.talkTrackDirect} label="Direct script" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{presentationOutput.talkTrackDirect}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Objection Handling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {(presentationOutput.objectionHandling || []).map((obj, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Next Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {(presentationOutput.nextActions || []).map((action, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Follow-Up Cadence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{presentationOutput.followUpCadence}</p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <Card className="border-primary/20">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No presentation plan generated yet</p>
              <p className="text-sm mt-1">
                Add call notes and click "Generate" to create an AI-powered offer presentation plan
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
