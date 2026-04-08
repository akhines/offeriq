import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import {
  Calculator,
  TrendingUp,
  Brain,
  Shield,
  BarChart3,
  MapPin,
  FileText,
  Zap,
  Check,
  ArrowRight,
  Star,
  ChevronRight,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  metadata: { tier?: string; features?: string; dealLimit?: string; order?: string };
  prices: Array<{
    id: string;
    unitAmount: number;
    currency: string;
    recurring: { interval: string } | null;
  }>;
}

const faqs = [
  {
    q: "How do I get started?",
    a: "Sign up for free — no credit card required. Enter a property address in the Underwriting tab, let OfferIQ pull the AVM estimates and comps, then head to the Offer Calculator to set your profit targets and generate your offer. You can have a full analysis done in under 5 minutes.",
  },
  {
    q: "What does the free trial include?",
    a: "The free trial gives you full access to all three engines: underwriting, offer calculation, and AI negotiation plans. You can save up to 3 deals and generate 2 AI presentations — enough to fully test the platform before deciding to upgrade.",
  },
  {
    q: "Do I need a credit card to sign up?",
    a: "No. You can start your free trial without entering any payment information. You only need a credit card when you decide to upgrade to Basic or Premium.",
  },
  {
    q: "How accurate is the property valuation?",
    a: "OfferIQ blends estimates from multiple AVM sources (Zillow 45%, Redfin 35%, and others at 20%) to produce a weighted valuation with a confidence score. It also pulls real comparable sales from RentCast. For best results, always cross-reference with your local market knowledge.",
  },
  {
    q: "What is the Offer Ladder?",
    a: "The Offer Ladder gives you three price points: Fast Yes (+8% above your fair price for a quick acceptance), Fair (your baseline calculated offer), and Stretch (-8% below for maximum profit). This helps you adapt your offer strategy based on the seller's motivation.",
  },
  {
    q: "Can I share offers directly with sellers?",
    a: "Yes. Once you've built your offer, you can generate a shareable link that gives the seller a clean, professional view of the offer package — including deal terms, a comparison table, and the key benefits of accepting. No investor math is shown to the seller.",
  },
  {
    q: "What is the AI Negotiation Plan?",
    a: "OfferIQ uses OpenAI to generate a personalized negotiation strategy based on the seller's situation. It includes talk tracks, objection handling scripts, and suggested next steps — all grounded in ethical persuasion (no high-pressure tactics).",
  },
  {
    q: "Is my deal data private?",
    a: "Yes. Your saved deals, offer calculations, and AI plans are private to your account. Shared links are the only way another person can view your deal — and you control when those links expire or get deactivated.",
  },
  {
    q: "What happens when I hit the free trial limit?",
    a: "When you reach the free trial limits (3 saved deals, 2 AI presentations), you'll see a prompt to upgrade. Your existing deals are not deleted — you can still view and analyze them. Upgrading instantly unlocks higher limits.",
  },
  {
    q: "Can I use OfferIQ on my phone?",
    a: "Yes — OfferIQ is fully mobile-responsive. You can analyze deals, review comps on the map, and share offers from any device. An iOS app is also in development for even better mobile experience.",
  },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "OfferIQ — Underwrite Deals. Build Offers. Close with Confidence.";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "OfferIQ is the 3-engine underwriting platform for wholesalers, flippers, and rental investors. Analyze deals with AVM blending, build smart offers, and prepare AI-powered negotiation plans — all in one place.");
    }
  }, []);

  const { data: productsData } = useQuery<{ products: StripeProduct[] }>({
    queryKey: ["/api/stripe/products"],
  });

  const products = productsData?.products || [];

  const sortedProducts = [...products].sort((a, b) => {
    const orderA = parseInt(a.metadata?.order || "99");
    const orderB = parseInt(b.metadata?.order || "99");
    return orderA - orderB;
  });

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/app");
    } else {
      navigate("/login");
    }
  };

  const features = [
    {
      icon: Calculator,
      title: "3-Engine Underwriting",
      description: "AVM blending from multiple sources, automated repair estimates, and confidence scoring in one streamlined workflow.",
    },
    {
      icon: TrendingUp,
      title: "Smart Offer Calculator",
      description: "Investor buy price, 3-tier offer ladder (Fast Yes / Fair / Stretch), sensitivity analysis, and deal grading.",
    },
    {
      icon: Brain,
      title: "AI Negotiation Plans",
      description: "Tony Robbins 6 Human Needs mapping, DISC profiling, objection handling scripts -- all ethically guided.",
    },
    {
      icon: MapPin,
      title: "Interactive Comp Maps",
      description: "Google Maps view of comparable sales with distance filtering, date ranges, and property type filters.",
    },
    {
      icon: FileText,
      title: "PDF Export & Sharing",
      description: "Generate professional offer presentations as PDFs. Share via unique links with sellers and partners.",
    },
    {
      icon: Shield,
      title: "Ethical Guardrails",
      description: "Every AI suggestion includes confirming questions -- no high-pressure tactics, just win-win conversations.",
    },
  ];

  const testimonials = [
    {
      name: "Marcus T.",
      role: "Wholesaler, Atlanta",
      text: "OfferIQ cut my underwriting time from 2 hours to 15 minutes. The offer ladder alone has helped me close 3 extra deals this quarter.",
      rating: 5,
    },
    {
      name: "Jessica R.",
      role: "Flipper, Dallas",
      text: "The AI negotiation plans are a game-changer. I used the DISC cues on my last deal and the seller accepted my Fair offer on the spot.",
      rating: 5,
    },
    {
      name: "David K.",
      role: "Rental Investor, Phoenix",
      text: "Finally a tool that doesn't just spit out numbers -- it actually helps me have better conversations with sellers. Worth every penny.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 h-14">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[hsl(var(--primary))]" />
            <span className="font-bold text-lg" data-testid="text-brand">OfferIQ</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#video" className="hover:text-foreground transition-colors" data-testid="link-video">How It Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors" data-testid="link-pricing">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors" data-testid="link-faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <Button onClick={() => navigate("/app")} data-testid="button-go-to-app">
                  Go to App <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate("/login")} data-testid="button-login">
                    Log In
                  </Button>
                  <Button onClick={() => navigate("/login")} data-testid="button-signup">
                    Get Started
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card/95 backdrop-blur-sm" data-testid="mobile-menu">
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              <a
                href="#features"
                className="flex items-center min-h-[44px] px-3 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors hover-elevate"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-features-mobile"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="flex items-center min-h-[44px] px-3 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors hover-elevate"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-pricing-mobile"
              >
                Pricing
              </a>
              <a
                href="#video"
                className="flex items-center min-h-[44px] px-3 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors hover-elevate"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-video-mobile"
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="flex items-center min-h-[44px] px-3 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors hover-elevate"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-testimonials-mobile"
              >
                Testimonials
              </a>
              <a
                href="#faq"
                className="flex items-center min-h-[44px] px-3 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors hover-elevate"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-faq-mobile"
              >
                FAQ
              </a>
              <div className="border-t my-2" />
              {isAuthenticated ? (
                <Button className="w-full min-h-[44px]" onClick={() => { setMobileMenuOpen(false); navigate("/app"); }} data-testid="button-go-to-app-mobile">
                  Go to App <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" className="w-full min-h-[44px]" onClick={() => { setMobileMenuOpen(false); navigate("/login"); }} data-testid="button-login-mobile">
                    Log In
                  </Button>
                  <Button className="w-full min-h-[44px]" onClick={() => { setMobileMenuOpen(false); navigate("/login"); }} data-testid="button-signup-mobile">
                    Get Started
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.08)] via-transparent to-[hsl(var(--primary)/0.04)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4" data-testid="badge-hero">
              Real Estate Underwriting, Reimagined
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Underwrite Deals.<br />
              Build Offers.<br />
              <span className="text-[hsl(var(--primary))]">Close with Confidence.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
              OfferIQ is the 3-engine underwriting platform that helps wholesalers, flippers, and rental investors analyze deals, build smart offers, and prepare AI-powered negotiation plans -- all in one place.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="min-h-[44px]" onClick={handleGetStarted} data-testid="button-hero-cta">
                Start Free Trial <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="min-h-[44px]" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} data-testid="button-hero-learn-more">
                See How It Works
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No credit card required. Start analyzing deals in minutes.</p>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-features-title">Everything You Need to Close More Deals</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From property valuation to the final handshake, OfferIQ handles every step of the deal analysis process.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="p-6" data-testid={`card-feature-${i}`}>
                <div className="h-10 w-10 rounded-md bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-how-it-works-title">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12">Three engines, one seamless workflow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Underwrite", desc: "Enter a property address. OfferIQ pulls AVM estimates, comparable sales, and builds a blended valuation with confidence scoring." },
              { step: "2", title: "Calculate Offers", desc: "Set your profit margin and closing costs. Get an investor buy price, seller offer, and a 3-tier offer ladder with deal grading." },
              { step: "3", title: "Present & Negotiate", desc: "AI generates a personalized negotiation plan with talk tracks, objection handling, and ethical persuasion frameworks." },
            ].map((item, i) => (
              <div key={i} className="text-center" data-testid={`step-${i}`}>
                <div className="h-12 w-12 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="video" className="py-20 bg-card/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-3">Quick Start Guide</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-video-title">
              Up and Running in 5 Minutes
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Here's exactly how to go from a property address to a ready-to-present offer package.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border shadow-xl" data-testid="product-preview">
            <img
              src="/offeriq_preview.png"
              alt="OfferIQ dashboard showing property analysis, offer ladder, and deal grade"
              className="w-full object-cover"
              data-testid="img-product-preview"
            />
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", label: "Enter an address", desc: "Pull real AVM estimates and comparable sales in seconds." },
              { step: "2", label: "Run the analysis", desc: "Get confidence-weighted valuations, repair estimates, and deal grade." },
              { step: "3", label: "Build & share your offer", desc: "Generate a 3-tier offer ladder and send the seller a professional link." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 p-4 rounded-lg border bg-card">
                <div className="h-9 w-9 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{s.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {[
              { icon: Zap, text: "No setup needed" },
              { icon: Check, text: "Free trial — no credit card" },
              { icon: TrendingUp, text: "Real AVM data from day one" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              Start free. Upgrade when you're ready to scale.
            </p>
            <div className="inline-flex items-center bg-muted rounded-md p-1 gap-1">
              <Button
                variant={billingInterval === "month" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setBillingInterval("month")}
                data-testid="button-billing-monthly"
              >
                Monthly
              </Button>
              <Button
                variant={billingInterval === "year" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setBillingInterval("year")}
                data-testid="button-billing-yearly"
              >
                Yearly <span className="text-[hsl(var(--primary))] ml-1">Save 17%</span>
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 flex flex-col" data-testid="card-pricing-free">
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-1">Free Trial</h3>
                <p className="text-muted-foreground text-sm mb-4">Try OfferIQ risk-free</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["AVM blending & valuation", "Offer calculator & ladder", "3 saved deals", "2 AI presentations", "Comparable sales table"].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={handleGetStarted} data-testid="button-pricing-free">
                Get Started Free
              </Button>
            </Card>

            {sortedProducts.map((product) => {
              const monthlyPrice = product.prices.find(p => p.recurring?.interval === "month");
              const yearlyPrice = product.prices.find(p => p.recurring?.interval === "year");
              const currentPrice = billingInterval === "year" && yearlyPrice ? yearlyPrice : monthlyPrice;
              const displayAmount = currentPrice ? currentPrice.unitAmount / 100 : 0;
              const features = product.metadata?.features?.split(",") || [];
              const isPremium = product.metadata?.tier === "premium";

              return (
                <Card
                  key={product.id}
                  className={`p-6 flex flex-col ${isPremium ? "border-[hsl(var(--primary))] border-2 relative" : ""}`}
                  data-testid={`card-pricing-${product.metadata?.tier}`}
                >
                  {isPremium && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
                  )}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-1">{product.name.replace("OfferIQ ", "")}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${displayAmount}</span>
                      <span className="text-muted-foreground">/{billingInterval === "month" ? "mo" : "yr"}</span>
                    </div>
                    {billingInterval === "year" && monthlyPrice && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${Math.round(monthlyPrice.unitAmount / 100)}/mo billed monthly
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isPremium ? "default" : "outline"}
                    onClick={handleGetStarted}
                    data-testid={`button-pricing-${product.metadata?.tier}`}
                  >
                    {isPremium ? "Start Premium Trial" : "Choose Basic"} <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-testimonials-title">Trusted by Real Estate Professionals</h2>
            <p className="text-muted-foreground text-lg">See what our users are saying.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="p-6" data-testid={`card-testimonial-${i}`}>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
                  ))}
                </div>
                <p className="text-sm mb-4 italic">"{t.text}"</p>
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 bg-card/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-faq-title">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know before getting started.
            </p>
          </div>
          <div className="space-y-2" data-testid="faq-list">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border rounded-lg overflow-hidden"
                data-testid={`faq-item-${i}`}
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-muted/40 transition-colors min-h-[52px]"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  data-testid={`faq-toggle-${i}`}
                >
                  <span className="font-medium text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t bg-muted/20 pt-3" data-testid={`faq-answer-${i}`}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[hsl(var(--primary)/0.05)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-cta-title">Ready to Close More Deals?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join hundreds of real estate professionals who underwrite smarter with OfferIQ. Start your free trial today.
          </p>
          <Button size="lg" onClick={handleGetStarted} data-testid="button-bottom-cta">
            Start Free Trial <ArrowRight className="ml-1 h-5 w-5" />
          </Button>
        </div>
      </section>

      <footer className="py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[hsl(var(--primary))]" />
            <span className="font-semibold">OfferIQ</span>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} OfferIQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
