import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message ?? 'Something went wrong.' };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    // In production, swap this for a real error-reporting service (Sentry, etc.)
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div className="space-y-2 max-w-md">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{this.state.message}</p>
          </div>
          <Button onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reload page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
