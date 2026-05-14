import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roles, session } = useAuth();
  const from = (location.state as any)?.from as string | undefined;
  const required = (location.state as any)?.required as string[] | undefined;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="max-w-lg w-full border border-border/80 rounded-3xl bg-card/80 backdrop-blur shadow-elevated">
        <CardContent className="p-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
          </div>

          <div>
            <span className="eyebrow">Restricted area</span>
            <h1 className="h-display text-3xl mt-3 mb-2">
              Access <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">denied</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              This page is restricted to coach or admin accounts. Your account
              doesn't have the required permissions to view it.
            </p>
          </div>

          <div className="rounded-2xl bg-muted/40 border border-border p-4 text-left text-xs space-y-1">
            {from && (
              <p>
                <span className="font-bold uppercase tracking-wider text-muted-foreground">
                  Page:
                </span>{' '}
                <span className="font-mono">{from}</span>
              </p>
            )}
            {required && required.length > 0 && (
              <p>
                <span className="font-bold uppercase tracking-wider text-muted-foreground">
                  Requires:
                </span>{' '}
                {required.join(' or ')}
              </p>
            )}
            <p>
              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                Your role:
              </span>{' '}
              {session ? (roles.length ? roles.join(', ') : 'member') : 'signed out'}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            If you believe this is a mistake, contact your coach or an
            administrator to have the right role assigned.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button
              variant="outline"
              className="rounded-2xl font-bold"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" /> Go back
            </Button>
            <Button asChild className="rounded-2xl font-bold">
              <Link to="/">
                <Home className="h-4 w-4" /> Back to dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
