import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CreditCard,
  User,
  Shield,
  Loader2,
  ExternalLink,
  Upload,
  Image,
  Trash2,
  Building2,
} from "lucide-react";

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyNameDirty, setCompanyNameDirty] = useState(false);

  const { data: subData, isLoading: subLoading } = useQuery<{
    subscription: any;
    tier: string;
  }>({
    queryKey: ["/api/stripe/subscription"],
    enabled: isAuthenticated,
  });

  const { data: prefsData, isLoading: prefsLoading } = useQuery<{
    settings: { companyLogoPath?: string; companyName?: string } | null;
  }>({
    queryKey: ["/api/preferences"],
    enabled: isAuthenticated,
    select: (data: any) => ({ settings: data?.settings || null }),
  });

  const logoPath = prefsData?.settings?.companyLogoPath;
  const savedCompanyName = prefsData?.settings?.companyName || "";

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ description: "Logo must be under 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const urlRes = await apiRequest("POST", "/api/logo/upload-url", {});
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      await apiRequest("POST", "/api/logo/save", { objectPath });
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({ description: "Logo uploaded successfully" });
    } catch {
      toast({ description: "Failed to upload logo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    try {
      await apiRequest("DELETE", "/api/logo");
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({ description: "Logo removed" });
    } catch {
      toast({ description: "Failed to remove logo", variant: "destructive" });
    }
  };

  const handleSaveCompanyName = async () => {
    const nameToSave = companyNameDirty ? companyName : savedCompanyName;
    try {
      const currentSettings = prefsData?.settings || {};
      await apiRequest("PUT", "/api/preferences", {
        settings: { ...currentSettings, companyName: nameToSave },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      setCompanyNameDirty(false);
      toast({ description: "Company name saved" });
    } catch {
      toast({ description: "Failed to save company name", variant: "destructive" });
    }
  };

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal");
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
  });

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  const tier = subData?.tier || "free";
  const tierLabels: Record<string, string> = {
    free: "Free Trial",
    basic: "Basic",
    premium: "Premium",
  };

  return (
    <div className="min-h-screen bg-background" data-testid="account-page">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-account-title">Account</h1>
        </div>

        <div className="space-y-6">
          <Card className="p-6" data-testid="card-profile">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Profile</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span data-testid="text-user-name">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span data-testid="text-user-email">{user?.email}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-branding">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Company Branding</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Your logo and company name appear on shared offer presentations sent to sellers.
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Company Logo</Label>
                {logoPath ? (
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-md border overflow-hidden bg-muted flex items-center justify-center">
                      <img
                        src={logoPath}
                        alt="Company logo"
                        className="h-full w-full object-contain"
                        data-testid="img-company-logo"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        data-testid="button-change-logo"
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                        Change
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogoDelete}
                        data-testid="button-remove-logo"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-md cursor-pointer hover-elevate transition-colors"
                    data-testid="dropzone-logo"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Image className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Click to upload logo (max 5MB)</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = "";
                  }}
                  data-testid="input-logo-file"
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Company Name</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Acme Properties LLC"
                    value={companyNameDirty ? companyName : savedCompanyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setCompanyNameDirty(true);
                    }}
                    data-testid="input-company-name"
                  />
                  {companyNameDirty && (
                    <Button
                      size="sm"
                      onClick={handleSaveCompanyName}
                      data-testid="button-save-company-name"
                    >
                      Save
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-subscription">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Subscription</h2>
            </div>
            {subLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Plan</span>
                  <Badge variant={tier === "premium" ? "default" : "secondary"} data-testid="badge-tier">
                    {tierLabels[tier] || tier}
                  </Badge>
                </div>
                {subData?.subscription && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="secondary" data-testid="badge-status">
                      {(subData.subscription as any).status}
                    </Badge>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {tier === "free" ? (
                    <Button onClick={() => navigate("/pricing")} data-testid="button-upgrade">
                      Upgrade Plan
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      data-testid="button-manage-billing"
                    >
                      {portalMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-1" />
                      )}
                      Manage Billing <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6" data-testid="card-actions">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Session</span>
              <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
                Log Out
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
