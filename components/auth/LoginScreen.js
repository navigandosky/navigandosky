'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, User, LogIn, Building2 } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Inserisci username e password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/users?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: username, // Passa direttamente, il backend cerca sia email che username
          password 
        })
      });

      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Salva sessione in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('sessionToken', Date.now().toString());
        
        toast.success(`Benvenuto, ${data.user.username || data.user.email}!`);
        
        // Callback per aggiornare lo stato del parent
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Errore durante il login');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Maretrek Admin</CardTitle>
          <CardDescription className="text-base">
            Sistema Multi-Tenant di Gestione Prenotazioni
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Username o Email
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Admin_Trivorsrl"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 text-base"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base"
                autoComplete="current-password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold bg-primary text-white hover:bg-primary/90 shadow-md"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Autenticazione...
                </div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Accedi
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              🔐 Accesso riservato al personale autorizzato
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
