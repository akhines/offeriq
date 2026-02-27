import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { FeedbackButton } from "@/components/feedback-dialog";
import LandingPage from "@/pages/landing";
import OfferIQ from "@/pages/deal-desk";
import SavedDeals from "@/pages/saved-deals";
import CompareDeals from "@/pages/compare-deals";
import PricingPage from "@/pages/pricing";
import AccountPage from "@/pages/account";
import CheckoutSuccess from "@/pages/checkout-success";
import SharedOfferPage from "@/pages/shared-offer";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={OfferIQ} />
      <Route path="/deals" component={SavedDeals} />
      <Route path="/deals/compare" component={CompareDeals} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/s/:code" component={SharedOfferPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
          <FeedbackButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
