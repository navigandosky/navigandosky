import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { MessageCircle, X, Send, Plane, MapPin, ShoppingBag, Utensils, HelpCircle, Loader2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Category icons mapping
const categoryIcons = {
  "Check-in": Plane,
  "Shopping": ShoppingBag,
  "Ristorazione": Utensils,
  "Servizi": HelpCircle,
  "Bagagli": MapPin,
  "Gates": Plane,
  "Cultura": MapPin,
  "Trasporti": Plane,
};

// Main Landing Page Component
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-700/90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <nav className="relative z-10 container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plane className="h-8 w-8 text-white" />
              <span className="text-xl font-bold text-white">Olbia Airport</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="https://www.geasar.it/en/flights/live-flights" target="_blank" rel="noopener noreferrer" 
                 className="text-white/90 hover:text-white transition flex items-center gap-1">
                Voli in Tempo Reale <ExternalLink className="h-3 w-3" />
              </a>
              <a href="https://tour.fairsgate.com/tour/olbia-ultimo" target="_blank" rel="noopener noreferrer"
                 className="text-white/90 hover:text-white transition flex items-center gap-1">
                Tour Virtuale <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/30">
              🌴 Costa Smeralda, Sardegna
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Benvenuto all'Aeroporto di<br />
              <span className="text-yellow-300">Olbia Costa Smeralda</span>
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Scopri tutti i servizi, negozi e punti di interesse del tuo aeroporto.
              Il nostro assistente virtuale è pronto ad aiutarti!
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="https://tour.fairsgate.com/tour/olbia-ultimo" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-yellow-300 hover:text-blue-800 font-semibold">
                  <MapPin className="mr-2 h-5 w-5" />
                  Esplora il Tour Virtuale
                </Button>
              </a>
              <a href="https://www.geasar.it/en/flights/live-flights" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
                  <Plane className="mr-2 h-5 w-5" />
                  Voli Live
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Decorative airplane */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 hidden lg:block">
          <Plane className="h-96 w-96 text-white transform rotate-45" />
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Tutto ciò che ti serve, a portata di mano
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            L'aeroporto di Olbia offre una vasta gamma di servizi per rendere il tuo viaggio confortevole
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard 
            icon={<Plane className="h-8 w-8" />}
            title="Compagnie Aeree"
            description="Ryanair, EasyJet, Aeroitalia, Volotea e altre"
            color="blue"
          />
          <FeatureCard 
            icon={<ShoppingBag className="h-8 w-8" />}
            title="Shopping"
            description="Polo Ralph Lauren, Max & Co., Prodotti Tipici Sardi"
            color="pink"
          />
          <FeatureCard 
            icon={<Utensils className="h-8 w-8" />}
            title="Ristorazione"
            description="Grain & Grapes, Self-service Karafood"
            color="orange"
          />
          <FeatureCard 
            icon={<HelpCircle className="h-8 w-8" />}
            title="Servizi"
            description="Farmacia, Assistenza Speciale, Info Point"
            color="green"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Hai bisogno di assistenza?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Il nostro chatbot virtuale è disponibile 24/7 per rispondere alle tue domande sull'aeroporto.
            Clicca sull'icona in basso a destra per iniziare!
          </p>
          <div className="flex justify-center items-center space-x-4">
            <div className="animate-bounce bg-white rounded-full p-4 shadow-lg">
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
            <span className="text-white font-medium">← Inizia a chattare</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Plane className="h-6 w-6" />
                <span className="font-bold">Olbia Costa Smeralda</span>
              </div>
              <p className="text-gray-400 text-sm">
                L'aeroporto principale della Sardegna nord-orientale, porta d'accesso alla Costa Smeralda.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Link Utili</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="https://tour.fairsgate.com/tour/olbia-ultimo" target="_blank" rel="noopener noreferrer" 
                     className="hover:text-white transition flex items-center gap-1">
                    Tour Virtuale <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a href="https://www.geasar.it/en/flights/live-flights" target="_blank" rel="noopener noreferrer"
                     className="hover:text-white transition flex items-center gap-1">
                    Voli in Tempo Reale <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Social</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="https://www.facebook.com/OlbiaAirport" target="_blank" rel="noopener noreferrer"
                     className="hover:text-white transition">Facebook</a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/company/geasar-spa/" target="_blank" rel="noopener noreferrer"
                     className="hover:text-white transition">LinkedIn</a>
                </li>
                <li>
                  <a href="https://www.youtube.com/@aeroportoolbiacostasmerald7728/videos" target="_blank" rel="noopener noreferrer"
                     className="hover:text-white transition">YouTube</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            © 2025 Aeroporto di Olbia Costa Smeralda - Assistente Virtuale
          </div>
        </div>
      </footer>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description, color }) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    pink: "bg-pink-100 text-pink-600",
    orange: "bg-orange-100 text-orange-600",
    green: "bg-green-100 text-green-600",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
      <CardContent className="p-6">
        <div className={`inline-flex p-3 rounded-xl mb-4 ${colorClasses[color]}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </CardContent>
    </Card>
  );
};

// Chatbot Widget Component
const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Fetch suggested questions
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await axios.get(`${API}/suggested-questions`);
        setSuggestedQuestions(response.data);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };
    fetchSuggestions();
  }, []);

  // Add welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Ciao! 👋 Sono l'assistente virtuale dell'Aeroporto di Olbia Costa Smeralda. Come posso aiutarti oggi? Puoi chiedermi informazioni su check-in, servizi, negozi, ristoranti e molto altro!"
      }]);
    }
  }, [isOpen, messages.length]);

  // Send message to API
  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: messageText,
        session_id: sessionId
      });

      const assistantMessage = { role: "assistant", content: response.data.response };
      setMessages(prev => [...prev, assistantMessage]);
      
      if (!sessionId) {
        setSessionId(response.data.session_id);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { 
        role: "assistant", 
        content: "Mi dispiace, si è verificato un errore. Per favore riprova tra qualche istante." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle suggestion click
  const handleSuggestionClick = (question) => {
    sendMessage(question);
  };

  // Clear chat
  const clearChat = async () => {
    if (sessionId) {
      try {
        await axios.delete(`${API}/chat/session/${sessionId}`);
      } catch (error) {
        console.error("Error clearing session:", error);
      }
    }
    setMessages([]);
    setSessionId(null);
    setShowSuggestions(true);
  };

  return (
    <TooltipProvider>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="chatbot-toggle-btn"
                onClick={() => setIsOpen(true)}
                className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-110"
              >
                <MessageCircle className="h-7 w-7 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Assistente Virtuale Aeroporto</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Chat Window */}
        {isOpen && (
          <div 
            data-testid="chatbot-window"
            className="absolute bottom-0 right-0 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-5 duration-300"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Plane className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Assistente Olbia Airport</h3>
                  <p className="text-xs text-white/80">Online - Pronto ad aiutarti</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="clear-chat-btn"
                      variant="ghost"
                      size="icon"
                      onClick={clearChat}
                      className="h-8 w-8 text-white hover:bg-white/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Nuova conversazione</p>
                  </TooltipContent>
                </Tooltip>
                <Button
                  data-testid="close-chat-btn"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    data-testid={`chat-message-${message.role}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md"
                          : "bg-gray-100 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600">Sto scrivendo...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Suggestions */}
            {showSuggestions && messages.length <= 1 && suggestedQuestions.length > 0 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-500 mb-2">Domande frequenti:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.slice(0, 4).map((q) => {
                    const IconComponent = categoryIcons[q.category] || HelpCircle;
                    return (
                      <Button
                        key={q.id}
                        data-testid={`suggestion-${q.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(q.question)}
                        className="text-xs h-auto py-2 px-3 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all"
                      >
                        <IconComponent className="h-3 w-3 mr-1" />
                        {q.question.length > 30 ? q.question.substring(0, 30) + "..." : q.question}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-2">
                <Input
                  ref={inputRef}
                  data-testid="chat-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  disabled={isLoading}
                  className="flex-1 rounded-full border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
                <Button
                  data-testid="send-message-btn"
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="rounded-full h-10 w-10 p-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// Main App Component
function App() {
  return (
    <div className="App">
      <LandingPage />
      <ChatbotWidget />
    </div>
  );
}

export default App;
