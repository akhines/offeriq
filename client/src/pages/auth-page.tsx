import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, login, register, loginError, registerError, isLoggingIn, isRegistering } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    navigate("/app");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, firstName, lastName });
      }
      navigate("/app");
    } catch {
      // Error is captured in loginError / registerError
    }
  };

  const error = mode === "login" ? loginError : registerError;
  const isPending = mode === "login" ? isLoggingIn : isRegistering;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 className="h-7 w-7 text-[hsl(var(--primary))]" />
            <span className="font-bold text-xl">OfferIQ</span>
          </div>

          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-1">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              {mode === "login"
                ? "Enter your credentials to access your deals."
                : "Get started with OfferIQ for free."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {error.message.includes(":") ? error.message.split(": ").slice(1).join(": ") : error.message}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending
                  ? mode === "login"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
                {!isPending && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-[hsl(var(--primary))] hover:underline font-medium"
                    onClick={() => setMode("register")}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-[hsl(var(--primary))] hover:underline font-medium"
                    onClick={() => setMode("login")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Right panel - hero */}
      <div className="hidden lg:flex flex-1 bg-[hsl(var(--primary)/0.05)] items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <h2 className="text-3xl font-bold mb-4">
            Underwrite Deals. Build Offers.{" "}
            <span className="text-[hsl(var(--primary))]">Close with Confidence.</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            The 3-engine underwriting platform for wholesalers, flippers, and rental investors. Analyze deals, build smart offers, and prepare AI-powered negotiation plans.
          </p>
        </div>
      </div>
    </div>
  );
}
