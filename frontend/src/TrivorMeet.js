import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Monitor, Users, Settings,
  MessageCircle, Send, X, Plus, Copy, Check, RefreshCw, ChevronLeft,
  User, Mail, Search, Star, Building2, Clock, Calendar, Link2, Share2,
  Volume2, VolumeX, Maximize, Minimize, Grid, MoreVertical, UserPlus
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// =============================================================================
// AUTH HOOK - Uses Suite authentication
// =============================================================================
const useMeetAuth = () => {
  const getAuthHeader = () => {
    const auth = localStorage.getItem("trivorsuite_auth");
    if (auth) {
      return { Authorization: `Basic ${auth}` };
    }
    return {};
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem("trivorsuite_auth");
  };

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
const ContactPickerModal = ({ onClose, onSelect, getAuthHeader }) => {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API}/contacts`, { headers: getAuthHeader() });
      const data = await res.json();
      setContacts(data);
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Users className="w-5 h-5 text-rose-400 mr-2" />
            Seleziona Partecipante
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
              <a href="#/contacts" className="text-rose-400 hover:underline text-sm mt-2 inline-block">
                Vai all'Archivio Contatti
              </a>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => onSelect(contact)}
                  className="w-full p-4 flex items-center space-x-3 hover:bg-slate-800/50 transition-colors text-left"
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
                  <UserPlus className="w-5 h-5 text-rose-400" />
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
// MEETING ROOM COMPONENT
// =============================================================================
const MeetingRoom = ({ meeting, onLeave, getAuthHeader }) => {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState(meeting.participants || []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startVideo();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error("Errore accesso webcam:", e);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      startVideo();
      setScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        streamRef.current = screenStream;
        setScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          startVideo();
          setScreenSharing(false);
        };
      } catch (e) {
        console.error("Errore condivisione schermo:", e);
      }
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setChatMessages([...chatMessages, {
      id: Date.now(),
      sender: "Tu",
      text: newMessage,
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    }]);
    setNewMessage("");
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/#/trivormeet?room=${meeting.id}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Video className="w-6 h-6 text-rose-400" />
              <div>
                <h1 className="text-white font-semibold">{meeting.name}</h1>
                <p className="text-slate-400 text-xs flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  In corso • {participants.length + 1} partecipanti
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={copyMeetingLink}
              className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm flex items-center"
            >
              <Link2 className="w-4 h-4 mr-1" /> Copia Link
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg ${showChat ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className={`flex-1 p-4 ${showChat ? 'pr-0' : ''}`}>
          <div className="h-full bg-slate-900 rounded-2xl overflow-hidden relative">
            {/* Main Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {!videoEnabled && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-12 h-12 text-slate-400" />
                  </div>
                  <p className="text-white font-medium">La tua webcam è disattivata</p>
                </div>
              </div>
            )}

            {/* Participant thumbnails */}
            {participants.length > 0 && (
              <div className="absolute top-4 right-4 space-y-2">
                {participants.slice(0, 3).map((p, i) => (
                  <div key={i} className="w-32 h-24 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                    <ContactAvatar contact={p} size="lg" />
                  </div>
                ))}
                {participants.length > 3 && (
                  <div className="w-32 h-24 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                    <span className="text-white font-medium">+{participants.length - 3}</span>
                  </div>
                )}
              </div>
            )}

            {/* Screen share indicator */}
            {screenSharing && (
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-rose-500 text-white rounded-full text-sm flex items-center">
                <Monitor className="w-4 h-4 mr-1" /> Condivisione schermo attiva
              </div>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-white font-semibold">Chat della riunione</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-slate-500 text-sm text-center">Nessun messaggio ancora</p>
              ) : chatMessages.map(msg => (
                <div key={msg.id} className="bg-slate-800 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-rose-400 text-sm font-medium">{msg.sender}</span>
                    <span className="text-slate-500 text-xs">{msg.time}</span>
                  </div>
                  <p className="text-white text-sm">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
                <button onClick={sendMessage} className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 px-4 py-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${audioEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 text-white'}`}
            title={audioEnabled ? "Disattiva microfono" : "Attiva microfono"}
          >
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${videoEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 text-white'}`}
            title={videoEnabled ? "Disattiva video" : "Attiva video"}
          >
            {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
          
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full ${screenSharing ? 'bg-rose-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
            title={screenSharing ? "Interrompi condivisione" : "Condividi schermo"}
          >
            <Monitor className="w-6 h-6" />
          </button>

          <button
            onClick={onLeave}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white"
            title="Lascia la riunione"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
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
  const [loading, setLoading] = useState(false);

  const addParticipant = (contact) => {
    if (!participants.find(p => p.id === contact.id)) {
      setParticipants([...participants, contact]);
    }
    setShowContactPicker(false);
  };

  const removeParticipant = (contactId) => {
    setParticipants(participants.filter(p => p.id !== contactId));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    
    const meeting = {
      id: Date.now().toString(),
      name: name,
      participants: participants,
      createdAt: new Date().toISOString()
    };
    
    onCreate(meeting);
    setLoading(false);
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
              <label className="block text-slate-300 text-sm font-medium mb-2">Nome Riunione *</label>
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
                Partecipanti
              </label>
              <div className="space-y-2 mb-3">
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
          </div>

          <div className="p-5 border-t border-slate-700 flex justify-end space-x-3 bg-slate-800/30">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />}
              Avvia Riunione
            </button>
          </div>
        </div>
      </div>

      {showContactPicker && (
        <ContactPickerModal
          onClose={() => setShowContactPicker(false)}
          onSelect={addParticipant}
          getAuthHeader={getAuthHeader}
        />
      )}
    </>
  );
};

// =============================================================================
// MAIN TRIVORMEET APP
// =============================================================================
const TrivorMeet = () => {
  const navigate = useNavigate();
  const { getAuthHeader, isAuthenticated } = useMeetAuth();
  const [meetings, setMeetings] = useState([]);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
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
  }, []);

  const fetchRecentContacts = async () => {
    try {
      const res = await fetch(`${API}/contacts?limit=6`, { headers: getAuthHeader() });
      const data = await res.json();
      setRecentContacts(data.slice(0, 6));
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
    setCurrentMeeting(meeting);
  };

  const handleQuickCall = (contact) => {
    const meeting = {
      id: Date.now().toString(),
      name: `Chiamata con ${contact.nome} ${contact.cognome}`,
      participants: [contact],
      createdAt: new Date().toISOString()
    };
    saveMeetings([meeting, ...meetings.slice(0, 9)]);
    setCurrentMeeting(meeting);
  };

  const handleLeaveMeeting = () => {
    setCurrentMeeting(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
      </div>
    );
  }

  if (currentMeeting) {
    return <MeetingRoom meeting={currentMeeting} onLeave={handleLeaveMeeting} getAuthHeader={getAuthHeader} />;
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
          <h2 className="text-3xl font-bold text-white mb-3">Videoconferenze Private</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Avvia videochiamate sicure con i tuoi contatti. Condividi lo schermo, chatta e collabora in tempo reale.
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
                  <button
                    onClick={() => setCurrentMeeting(meeting)}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Riprendi
                  </button>
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
        © 2025 Trivor SRL - TrivorMEET v1.0
      </footer>

      {/* Modals */}
      {showNewMeeting && (
        <NewMeetingModal
          onClose={() => setShowNewMeeting(false)}
          onCreate={handleCreateMeeting}
          getAuthHeader={getAuthHeader}
        />
      )}
    </div>
  );
};

export default TrivorMeet;
