import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Building2,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Shield,
  Users,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Login Page Component
export const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Inserisci username e password");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username: username.trim(),
        password: password.trim()
      });

      if (response.data.success) {
        toast.success("Login effettuato!");
        onLogin(response.data.user, response.data.token);
      } else {
        toast.error(response.data.message || "Credenziali non valide");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Errore durante il login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-500/20 p-4 rounded-full">
              <Building2 className="h-12 w-12 text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SmartDomo</h1>
          <p className="text-blue-200/70">Gestione Intelligente degli Immobili</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white text-center">Accedi</CardTitle>
            <CardDescription className="text-blue-200/70 text-center">
              Inserisci le tue credenziali per continuare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Il tuo username"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    data-testid="login-username"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="La tua password"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    data-testid="login-password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accesso in corso...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Accedi
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-blue-200/50 text-sm mt-8">
          SmartDomo © 2025 - Gestione Edifici Intelligenti
        </p>
      </div>
    </div>
  );
};


// User Management Component (Admin Panel)
export const UserManagement = ({ currentUser, token, onUserUpdate }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [matterportSpaces, setMatterportSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "user",
    is_active: true,
    matterport_space_id: "",
    matterport_space_name: ""
  });

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users?token=${token}`);
      setUsers(response.data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Errore nel caricamento utenti");
    } finally {
      setLoading(false);
    }
  };

  const loadMatterportSpaces = async () => {
    setLoadingSpaces(true);
    try {
      const response = await axios.get(`${API}/matterport/cloud/spaces`);
      if (response.data.spaces) {
        setMatterportSpaces(response.data.spaces);
      }
      if (response.data.error) {
        console.warn("Matterport spaces error:", response.data.error);
      }
    } catch (error) {
      console.error("Error loading Matterport spaces:", error);
    } finally {
      setLoadingSpaces(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadUsers();
      loadMatterportSpaces();
    }
  }, [token]);

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email || "",
        full_name: user.full_name || "",
        password: "",
        role: user.role,
        is_active: user.is_active,
        matterport_space_id: user.matterport_space_id || "",
        matterport_space_name: user.matterport_space_name || ""
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        email: "",
        full_name: "",
        password: "",
        role: "user",
        is_active: true,
        matterport_space_id: "",
        matterport_space_name: ""
      });
    }
    setDialogOpen(true);
  };

  const handleSpaceSelect = (spaceId) => {
    const space = matterportSpaces.find(s => s.id === spaceId);
    setFormData({
      ...formData,
      matterport_space_id: spaceId,
      matterport_space_name: space ? space.name : ""
    });
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        delete updateData.username; // Cannot change username

        await axios.put(`${API}/users/${editingUser.id}?token=${token}`, updateData);
        toast.success("Utente aggiornato");
      } else {
        // Create new user
        if (!formData.username || !formData.password) {
          toast.error("Username e password sono obbligatori");
          return;
        }
        await axios.post(`${API}/users?token=${token}`, formData);
        toast.success("Utente creato");
      }
      setDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.detail || "Errore nel salvataggio");
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo utente?")) return;
    
    try {
      await axios.delete(`${API}/users/${userId}?token=${token}`);
      toast.success("Utente eliminato");
      loadUsers();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.detail || "Errore nell'eliminazione");
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-orange-700">
            <Shield className="h-5 w-5" />
            <span>Solo gli amministratori possono gestire gli utenti</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestione Utenti
        </h2>
        <Button onClick={() => handleOpenDialog()} data-testid="add-user-btn">
          <UserPlus className="h-4 w-4 mr-2" />
          Nuovo Utente
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className={!user.is_active ? "opacity-60" : ""}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{user.username}</h3>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? (
                          <><Shield className="h-3 w-3 mr-1" />Admin</>
                        ) : (
                          <><User className="h-3 w-3 mr-1" />Utente</>
                        )}
                      </Badge>
                      {!user.is_active && (
                        <Badge variant="destructive">Disabilitato</Badge>
                      )}
                    </div>
                    {user.full_name && (
                      <p className="text-sm text-gray-600">{user.full_name}</p>
                    )}
                    {user.email && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    )}
                    {user.matterport_space_name && (
                      <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                        <Eye className="h-3 w-3" />
                        Spazio: {user.matterport_space_name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(user)}
                      data-testid={`edit-user-${user.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {user.id !== currentUser?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`delete-user-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* User Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Modifica Utente" : "Nuovo Utente"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                placeholder="Username"
                data-testid="user-form-username"
              />
            </div>

            <div className="space-y-2">
              <Label>Password {editingUser ? "(lascia vuoto per non cambiare)" : "*"}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password"
                data-testid="user-form-password"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome e Cognome"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@esempio.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger data-testid="user-form-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utente</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Account attivo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} data-testid="user-form-save">
              {editingUser ? "Salva" : "Crea Utente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
