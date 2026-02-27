import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background" data-testid="error-boundary-fallback">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
              <AlertTriangle className="h-12 w-12 text-destructive" data-testid="icon-error" />
              <h1 className="text-2xl font-bold" data-testid="text-error-title">Something went wrong</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-error-message">
                An unexpected error occurred. Please try reloading the page.
              </p>
              <Button onClick={this.handleReload} data-testid="button-reload">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
