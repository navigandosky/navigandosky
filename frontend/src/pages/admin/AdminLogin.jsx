import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/login`, {
        username,
        password
      });

      if (response.data.success) {
        localStorage.setItem("admin_authenticated", "true");
        toast.success("Accesso effettuato");
        navigate("/admin/dashboard");
      }
    } catch (error) {
      toast.error("Credenziali non valide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-sm border border-[#E5E0D8] p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#C5A059]" />
            </div>
            <h1 className="font-serif text-2xl text-[#2A2A2A]">Admin Panel</h1>
            <p className="font-sans text-sm text-[#666058] mt-2">
              Spoke Galaveras
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-3 bg-white border-[#E5E0D8] focus:border-[#C5A059] rounded-sm"
                placeholder="Inserisci username"
                required
                data-testid="login-username"
              />
            </div>

            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 bg-white border-[#E5E0D8] focus:border-[#C5A059] rounded-sm"
                placeholder="Inserisci password"
                required
                data-testid="login-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-gold rounded-sm py-3"
              data-testid="login-submit"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Accedi"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
