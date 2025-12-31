import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video, Phone, Users, MessageCircle, X, Plus, Copy, Check, RefreshCw, ChevronLeft,
  Star, Building2, Clock, Calendar, Link2, Share2, UserPlus, ExternalLink, Mail, Search
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// =============================================================================
// AUTH HOOK
// =============================================================================
const useMeetAuth = () => {
  const getAuthHeader = useCallback(() => {
    const auth = localStorage.getItem("trivorsuite_auth");
    if (auth) {
      return { Authorization: `Basic ${auth}` };
    }
    return {};
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem("trivorsuite_auth");
  }, []);

  return { getAuthHeader, isAuthenticated };
};

// =============================================================================
// CONTACT AVATAR
// =============================================================================
const ContactAvatar = ({ contact, size = "md" }) => {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl"
  };
  
  const initials = contact?.nome 
    ? `${contact.nome?.[0] || ''}${contact.cognome?.[0] || ''}`.toUpperCase() 
    : '?';
  
  return (
    <div 
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: contact?.avatar_color || '#EC4899' }}
    >
      {initials}
    </div>
  );
};

// =============================================================================
// CONTACT PICKER MODAL
// =============================================================================
const ContactPickerModal = ({ onClose, onSelect, selectedContacts = [], getAuthHeader }) => {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API}/contacts`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredContacts = contacts.filter(c => {
    const searchLower = search.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(searchLower) ||
      c.cognome?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.azienda?.toLowerCase().includes(searchLower)
    );
  });

  const isSelected = (contactId) => selectedContacts.some(c => c.id === contactId);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Users className="w-5 h-5 text-rose-400 mr-2" />
            Seleziona Partecipanti
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca contatto..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessun contatto trovato</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => onSelect(contact)}
                  className={`w-full p-4 flex items-center space-x-3 hover:bg-slate-800/50 transition-colors text-left ${
                    isSelected(contact.id) ? 'bg-rose-500/10' : ''
                  }`}
                >
                  <ContactAvatar contact={contact} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium flex items-center">
                      {contact.nome} {contact.cognome}
                      {contact.preferito && <Star className="w-4 h-4 ml-1 text-yellow-400 fill-current" />}
                    </p>
                    {contact.email && <p className="text-slate-400 text-sm truncate">{contact.email}</p>}
                    {contact.azienda && (
                      <p className="text-slate-500 text-xs flex items-center mt-0.5">
                        <Building2 className="w-3 h-3 mr-1" /> {contact.azienda}
                      </p>
                    )}
                  </div>
                  {isSelected(contact.id) ? (
                    <Check className="w-5 h-5 text-rose-400" />
                  ) : (
                    <UserPlus className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// NEW MEETING MODAL
// =============================================================================
const NewMeetingModal = ({ onClose, onCreate, getAuthHeader }) => {
  const [name, setName] = useState("");
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [participants, setParticipants] = useState([]);

  const generateRoomId = () => {
    return 'trivor-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
  };

  const addParticipant = (contact) => {
    if (!participants.find(p => p.id === contact.id)) {
      setParticipants([...participants, contact]);
    } else {
      setParticipants(participants.filter(p => p.id !== contact.id));
    }
  };

  const removeParticipant = (contactId) => {
    setParticipants(participants.filter(p => p.id !== contactId));
  };

  const handleCreate = () => {
    const roomId = generateRoomId();
    const meeting = {
      id: roomId,
      name: name || `Riunione ${new Date().toLocaleDateString('it-IT')}`,
      participants: participants,
      createdAt: new Date().toISOString(),
      roomUrl: `https://meet.jit.si/${roomId}`
    };
    
    onCreate(meeting);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full">
          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Video className="w-6 h-6 text-rose-400 mr-3" />
              Nuova Riunione
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Nome Riunione</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Riunione settimanale"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Partecipanti da invitare ({participants.length})
              </label>
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center space-x-3">
                      <ContactAvatar contact={p} size="sm" />
                      <div>
                        <p className="text-white text-sm font-medium">{p.nome} {p.cognome}</p>
                        {p.email && <p className="text-slate-400 text-xs">{p.email}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => removeParticipant(p.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowContactPicker(true)}
                className="w-full py-2.5 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-rose-400 hover:border-rose-500 flex items-center justify-center space-x-2 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span>Aggiungi da Archivio Contatti</span>
              </button>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <p className="text-emerald-400 text-sm flex items-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                La riunione si aprirà in una nuova finestra su <strong className="ml-1">Jitsi Meet</strong> - Gratuito e senza limiti di tempo!
              </p>
            </div>
          </div>

          <div className="p-5 border-t border-slate-700 flex justify-end space-x-3 bg-slate-800/30">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">
              Annulla
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium flex items-center"
            >
              <Video className="w-4 h-4 mr-2" />
              Crea e Avvia
            </button>
          </div>
        </div>
      </div>

      {showContactPicker && (
        <ContactPickerModal
          onClose={() => setShowContactPicker(false)}
          onSelect={addParticipant}
          selectedContacts={participants}
          getAuthHeader={getAuthHeader}
        />
      )}
    </>
  );
};

// =============================================================================
// INVITE MODAL
// =============================================================================
const InviteModal = ({ meeting, onClose }) => {
  const [copied, setCopied] = useState(false);
  const meetingLink = meeting?.roomUrl;

  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const text = `Partecipa alla riunione "${meeting.name}" su TrivorMEET:\n${meetingLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Invito: ${meeting.name}`;
    const body = `Ciao,\n\nSei invitato a partecipare alla riunione "${meeting.name}".\n\nClicca qui per partecipare:\n${meetingLink}\n\nA presto!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const openMeeting = () => {
    window.open(meetingLink, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Share2 className="w-5 h-5 text-rose-400 mr-2" />
            Condividi Riunione
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Link Riunione</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={meetingLink}
                readOnly
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm"
              />
              <button
                onClick={copyLink}
                className={`px-4 py-3 rounded-xl flex items-center space-x-2 transition-colors ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="text-slate-400 text-sm mb-3">Condividi via:</p>
            <div className="flex space-x-3">
              <button
                onClick={shareViaWhatsApp}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={shareViaEmail}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center space-x-2"
              >
                <Mail className="w-5 h-5" />
                <span>Email</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <button
              onClick={openMeeting}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl flex items-center justify-center space-x-2 font-medium"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Entra nella Riunione</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN TRIVORMEET APP
// =============================================================================
const TrivorMeet = () => {
  const navigate = useNavigate();
  const { getAuthHeader, isAuthenticated } = useMeetAuth();
  const [meetings, setMeetings] = useState([]);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [recentContacts, setRecentContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/suite");
      return;
    }
    fetchRecentContacts();
    loadMeetings();
    setLoading(false);
  }, [isAuthenticated, navigate]);

  const fetchRecentContacts = async () => {
    try {
      const res = await fetch(`${API}/contacts?limit=6`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setRecentContacts(data.slice(0, 6));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMeetings = () => {
    const saved = localStorage.getItem("trivormeet_history");
    if (saved) {
      setMeetings(JSON.parse(saved));
    }
  };

  const saveMeetings = (newMeetings) => {
    localStorage.setItem("trivormeet_history", JSON.stringify(newMeetings));
    setMeetings(newMeetings);
  };

  const handleCreateMeeting = (meeting) => {
    setShowNewMeeting(false);
    saveMeetings([meeting, ...meetings.slice(0, 9)]);
    // Open Jitsi in new tab immediately
    window.open(meeting.roomUrl, '_blank');
    // Show invite modal
    setSelectedMeeting(meeting);
    setShowInviteModal(true);
  };

  const handleQuickCall = (contact) => {
    const roomId = 'trivor-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
    const meeting = {
      id: roomId,
      name: `Chiamata con ${contact.nome} ${contact.cognome}`,
      participants: [contact],
      createdAt: new Date().toISOString(),
      roomUrl: `https://meet.jit.si/${roomId}`
    };
    saveMeetings([meeting, ...meetings.slice(0, 9)]);
    // Open Jitsi in new tab
    window.open(meeting.roomUrl, '_blank');
    // Show invite modal to share with contact
    setSelectedMeeting(meeting);
    setShowInviteModal(true);
  };

  const handleJoinMeeting = (meeting) => {
    window.open(meeting.roomUrl, '_blank');
  };

  const handleInvite = (meeting) => {
    setSelectedMeeting(meeting);
    setShowInviteModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-900/20 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="#/suite" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg" title="Torna alla Suite">
                <ChevronLeft className="w-5 h-5" />
              </a>
              <div className="flex items-center space-x-3">
                <Video className="w-8 h-8 text-rose-400" />
                <div>
                  <p className="text-xs text-rose-400 font-medium tracking-wider">TRIVOR SUITE</p>
                  <h1 className="text-xl font-bold text-white">TrivorMEET</h1>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowNewMeeting(true)}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Nuova Riunione
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Videoconferenze Gratuite</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Avvia videochiamate sicure con i tuoi contatti. Powered by <strong className="text-white">Jitsi Meet</strong> - 100% gratuito e <strong className="text-emerald-400">senza limiti di tempo</strong>.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => setShowNewMeeting(true)}
            className="bg-gradient-to-br from-rose-500/20 to-rose-600/20 border border-rose-500/30 hover:border-rose-400 rounded-2xl p-6 text-left transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-rose-500/20 rounded-xl flex items-center justify-center">
                <Video className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Avvia una Riunione</h3>
                <p className="text-slate-400 text-sm">Crea una nuova videoconferenza e invita partecipanti</p>
              </div>
            </div>
          </button>

          <a
            href="#/contacts"
            className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-6 text-left transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Archivio Contatti</h3>
                <p className="text-slate-400 text-sm">Gestisci la tua rubrica e aggiungi nuovi contatti</p>
              </div>
            </div>
          </a>
        </div>

        {/* Quick Call with Recent Contacts */}
        {recentContacts.length > 0 && (
          <div className="mb-12">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 text-rose-400 mr-2" />
              Chiamata Rapida
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleQuickCall(contact)}
                  className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-rose-500/50 rounded-xl p-4 text-center transition-all group"
                >
                  <div className="mb-3 flex justify-center">
                    <ContactAvatar contact={contact} size="lg" />
                  </div>
                  <p className="text-white text-sm font-medium truncate">{contact.nome}</p>
                  <p className="text-slate-400 text-xs truncate">{contact.cognome}</p>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="inline-flex items-center text-rose-400 text-xs">
                      <Phone className="w-3 h-3 mr-1" /> Chiama
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Meetings */}
        {meetings.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 text-slate-400 mr-2" />
              Riunioni Recenti
            </h3>
            <div className="space-y-3">
              {meetings.map(meeting => (
                <div
                  key={meeting.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                      <Video className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{meeting.name}</h4>
                      <p className="text-slate-400 text-sm flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(meeting.createdAt).toLocaleDateString("it-IT", { 
                          day: "numeric", 
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                        {meeting.participants?.length > 0 && (
                          <span className="ml-3 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {meeting.participants.length} partecipanti
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleInvite(meeting)}
                      className="px-3 py-2 bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <Share2 className="w-4 h-4 mr-1" /> Invita
                    </button>
                    <button
                      onClick={() => handleJoinMeeting(meeting)}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" /> Entra
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {meetings.length === 0 && recentContacts.length === 0 && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">Inizia la tua prima riunione</h3>
            <p className="text-slate-400 text-sm mb-6">
              Aggiungi contatti all'archivio per iniziare a fare videochiamate
            </p>
            <div className="flex justify-center space-x-3">
              <a
                href="#/contacts"
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-sm"
              >
                <Users className="w-4 h-4 inline mr-2" />
                Vai ai Contatti
              </a>
              <button
                onClick={() => setShowNewMeeting(true)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Nuova Riunione
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-500 text-xs">
        © 2025 Trivor SRL - TrivorMEET v1.1 | Powered by Jitsi Meet (Gratuito & Senza Limiti)
      </footer>

      {/* Modals */}
      {showNewMeeting && (
        <NewMeetingModal
          onClose={() => setShowNewMeeting(false)}
          onCreate={handleCreateMeeting}
          getAuthHeader={getAuthHeader}
        />
      )}

      {showInviteModal && selectedMeeting && (
        <InviteModal
          meeting={selectedMeeting}
          onClose={() => { setShowInviteModal(false); setSelectedMeeting(null); }}
        />
      )}
    </div>
  );
};

export default TrivorMeet;
