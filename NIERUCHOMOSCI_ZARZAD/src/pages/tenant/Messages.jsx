import React, { useState, useEffect, useRef } from "react";
import { 
  getMessagesBetweenUsers, 
  sendMessage, 
  markMessagesAsRead,
  getPropertiesByTenant,
  getUserById
} from "../../utils/storage";
import { 
  MessageSquare, 
  Send, 
  CheckCheck, 
  User, 
  Sparkles, 
  Image, 
  Paperclip, 
  X, 
  Download,
  XCircle
} from "lucide-react";

const THREADS = [
  { id: "Usterki", label: "🛠️ Usterki i naprawy", description: "Zgłaszanie awarii w mieszkaniu" },
  { id: "Rozliczenia", label: "💰 Rozliczenia i opłaty", description: "Pytania o faktury i media" },
  { id: "Ogólne", label: "💬 Tematy ogólne", description: "Inne sprawy i bieżący kontakt" }
];

export default function TenantMessages({ tenantId }) {
  const [activeThread, setActiveThread] = useState("Usterki");
  const [landlord, setLandlord] = useState(null);
  const [property, setProperty] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [activeLightbox, setActiveLightbox] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const props = getPropertiesByTenant(tenantId);
    if (props.length > 0) {
      setProperty(props[0]);
      const landlordUser = getUserById(props[0].landlord_id);
      setLandlord(landlordUser);
    }
  }, [tenantId]);

  useEffect(() => {
    if (landlord) {
      // Fetch messages for active thread
      const list = getMessagesBetweenUsers(tenantId, landlord.id)
        .filter(m => m.subject === activeThread);
      setMessages(list);

      // Mark received messages in this thread as read
      markMessagesAsRead(landlord.id, tenantId, activeThread);
    }
  }, [tenantId, landlord, activeThread]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrorMsg("");

    // Validate if file is an image
    const isImg = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    if (!isImg) {
      setErrorMsg("Wybrany plik nie jest obsługiwanym formatem obrazu (PNG, JPG, WEBP, GIF).");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG at 0.6 quality to prevent LocalStorage QuotaExceededError
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6);
            setSelectedImage(compressedDataUrl);
            setSelectedImageName(file.name);
          } catch (canvasErr) {
            setErrorMsg("Błąd kompresji obrazu: " + canvasErr.message);
          }
        };
        img.onerror = () => {
          setErrorMsg("Błąd ładowania pliku graficznego.");
        };
        img.src = event.target.result;
      };
      reader.onerror = () => {
        setErrorMsg("Błąd odczytu pliku z dysku.");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErrorMsg("Błąd wczytywania załącznika: " + err.message);
    }
    
    // Clear value to allow re-uploading same file
    e.target.value = "";
  };

  const handleSend = (e) => {
    e.preventDefault();
    setErrorMsg("");
    if ((!inputMsg.trim() && !selectedImage) || !landlord || !property) return;

    try {
      const newMsg = sendMessage({
        sender_id: tenantId,
        receiver_id: landlord.id,
        property_id: property.id,
        subject: activeThread,
        text: inputMsg.trim(),
        attachment_name: selectedImageName || null,
        attachment_data: selectedImage || null
      });

      setMessages(prev => [...prev, newMsg]);
      setInputMsg("");
      setSelectedImage(null);
      setSelectedImageName("");
    } catch (err) {
      setErrorMsg("Błąd wysyłania: " + err.message + ". Pamięć przeglądarki może być przepełniona.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-brand-400" />
          Centrum Wiadomości
        </h2>
        <p className="text-dark-400 text-sm mt-1">Komunikuj się bezpośrednio z właścicielem w wątkach tematycznych.</p>
      </div>

      {!landlord ? (
        <div className="glass p-8 text-center rounded-2xl">
          <MessageSquare className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <p className="text-dark-300">Nie posiadasz aktywnej umowy i przypisanego właściciela.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-4 h-[600px]">
          
          {/* Thread List */}
          <div className="md:col-span-1 glass rounded-2xl p-4 flex flex-col justify-start gap-2 h-full overflow-y-auto">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider px-2 mb-2">
              Kanały rozmów
            </h3>
            {THREADS.map(t => {
              const isActive = activeThread === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveThread(t.id)}
                  className={`text-left p-3 rounded-xl transition-all duration-200 border ${
                    isActive 
                      ? 'bg-brand-600 border-brand-500 text-white shadow-lg' 
                      : 'border-transparent text-dark-300 hover:bg-dark-900/40 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-sm leading-snug">{t.label}</div>
                  <div className={`text-xxs mt-0.5 ${isActive ? 'text-brand-100' : 'text-dark-400'}`}>
                    {t.description}
                  </div>
                </button>
              );
            })}

            <div className="mt-auto border-t border-dark-800 pt-3 px-2 text-xxs text-dark-400">
              <span className="font-semibold text-dark-300 block mb-0.5">Mój Odbiorca:</span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-brand-400" />
                {landlord.name}
              </span>
              <span className="block mt-0.5 text-dark-500 font-mono">{property?.title}</span>
            </div>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-3 glass rounded-2xl flex flex-col h-full overflow-hidden">
            
            {/* Header */}
            <div className="bg-dark-900/60 border-b border-dark-800 px-5 py-3.5 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white font-sans text-sm">
                  {THREADS.find(t => t.id === activeThread)?.label.split(" ").slice(1).join(" ")}
                </h4>
                <p className="text-xxs text-dark-400 mt-0.5">Wątek bezpośredni z właścicielem nieruchomości</p>
              </div>
              <span className="text-xs text-brand-400 flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded-full font-semibold">
                <Sparkles className="w-3 h-3" />
                RentPortal Chat
              </span>
            </div>

            {/* Bubble Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {messages.length === 0 ? (
                <div className="text-center text-dark-500 text-xs py-20">
                  Brak wiadomości w tym wątku. Wyślij pierwszą wiadomość poniżej!
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === tenantId;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all ${
                        isMe 
                          ? 'bg-brand-600 text-white rounded-tr-none' 
                          : 'bg-dark-800 text-dark-100 border border-dark-700/50 rounded-tl-none'
                      }`}>
                        {m.text && <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                        
                        {m.attachment_data && (
                          <div 
                            className={`mt-2 rounded-xl overflow-hidden border ${
                              isMe ? 'border-brand-500/30' : 'border-dark-700'
                            } bg-dark-950/40 cursor-pointer group relative max-w-xs`}
                            onClick={() => setActiveLightbox(m)}
                          >
                            <img 
                              src={m.attachment_data} 
                              alt={m.attachment_name || "Załącznik"} 
                              className="max-w-full max-h-48 object-cover rounded-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:brightness-110" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-medium">
                              <Sparkles className="w-4 h-4 text-brand-400 animate-pulse" /> Powiększ
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-60">
                          <span>
                            {new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && <CheckCheck className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Selected Image Preview above Input Bar */}
            {selectedImage && (
              <div className="bg-dark-900/80 border-t border-dark-800 px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-dark-700 bg-dark-950 flex-shrink-0">
                    <img src={selectedImage} alt="Selected preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate max-w-[200px]">{selectedImageName}</p>
                    <p className="text-xxs text-dark-400">Załącznik graficzny gotowy do wysłania</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedImageName("");
                  }}
                  className="p-1.5 bg-dark-800 hover:bg-red-500/20 hover:text-red-400 text-dark-300 rounded-lg transition-all"
                  title="Usuń załącznik"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

              {errorMsg && (
                <div className="bg-red-500/10 border-t border-red-500/20 text-red-400 px-5 py-2 text-xxs flex items-center justify-between gap-4 animate-fade-in font-sans">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMsg("")}
                    className="text-dark-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <form onSubmit={handleSend} className="bg-dark-900/60 border-t border-dark-800 p-3.5 flex gap-2 items-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-xl transition-all duration-200 shrink-0 border border-dark-700/50"
                title="Dodaj zrzut ekranu"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              
              <input
                type="text"
                placeholder={selectedImage ? "Dodaj opis do zrzutu ekranu (opcjonalnie)..." : "Wpisz treść wiadomości..."}
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-2 text-white text-sm focus:border-brand-500 focus:outline-none placeholder:text-dark-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all duration-200 glass-glow-brand shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300"
          onClick={() => setActiveLightbox(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center transition-all transform duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Actions */}
            <div className="absolute top-[-48px] right-0 flex items-center gap-3 text-white">
              <span className="text-xs font-mono bg-dark-900/80 px-3 py-1.5 rounded-full border border-dark-800 truncate max-w-[200px] md:max-w-[350px]">
                {activeLightbox.attachment_name || "Zrzut ekranu"}
              </span>
              <a
                href={activeLightbox.attachment_data}
                download={activeLightbox.attachment_name || "rentportal_zrzut.jpg"}
                className="p-2 bg-dark-900/80 hover:bg-brand-600 text-dark-300 hover:text-white rounded-xl transition-all border border-dark-800"
                title="Pobierz plik"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => setActiveLightbox(null)}
                className="p-2 bg-dark-900/80 hover:bg-red-600 text-dark-300 hover:text-white rounded-xl transition-all border border-dark-800"
                title="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image display */}
            <div className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden border border-dark-800 bg-dark-950/80 shadow-2xl">
              <img 
                src={activeLightbox.attachment_data} 
                alt={activeLightbox.attachment_name || "Załącznik w pełnym oknie"} 
                className="max-w-full max-h-[75vh] object-contain select-none rounded-xl"
              />
            </div>
            
            {activeLightbox.text && (
              <div className="mt-3 bg-dark-900/90 border border-dark-800 text-dark-100 rounded-2xl px-5 py-3 text-sm max-w-2xl text-center shadow-lg whitespace-pre-wrap leading-relaxed">
                {activeLightbox.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

