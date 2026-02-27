import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquarePlus, Loader2 } from "lucide-react";

export function FeedbackButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category) {
      toast({ title: "Category Required", description: "Please select a feedback category before submitting.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Message Required", description: "Please write a message describing your feedback.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/feedback", {
        category,
        message: message.trim(),
      });
      toast({ title: "Feedback Sent", description: "Thank you! Your feedback helps us improve OfferIQ." });
      setOpen(false);
      setCategory("");
      setMessage("");
    } catch {
      toast({ title: "Submission Failed", description: "We couldn't send your feedback right now. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-40 gap-2 shadow-md"
          data-testid="button-feedback"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-feedback">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="feedback-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="feedback-category" data-testid="select-feedback-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug" data-testid="option-bug">Bug Report</SelectItem>
                <SelectItem value="feature" data-testid="option-feature">Feature Request</SelectItem>
                <SelectItem value="other" data-testid="option-other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={5}
              data-testid="input-feedback-message"
            />
            <p className="text-xs text-muted-foreground">{message.length}/2000</p>
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !category || !message.trim()}
            data-testid="button-submit-feedback"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
