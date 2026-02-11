import { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Mail, Package } from "lucide-react";

const authorizedUsers = [
  { name: "Marwa Mazini", email: "marwa6mzi@gmail.com" },
  { name: "Benamti Otman", email: "b.otman@tintcolor2010.com" },
  { name: "Akhazzan Mossaab", email: "i.mosaab@tintcolor2010.com" },
  { name: "Xevi", email: "xevim@hallotex.com" },
  { name: "Zineb Aktaou", email: "zineb@tintcolor2010.com" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(
      { email, password },
      {
        onError: () => {
          setError("Invalid email or password");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent rounded-full mx-auto flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-accent" data-testid="text-login-title">
              Inventory Control System
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Warehouse Management
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10 h-12"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 h-12"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span data-testid="text-login-error">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-accent text-accent-foreground font-bold text-base"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-muted-foreground text-xs">
            <p>Industrial Warehouse Management System v1.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
