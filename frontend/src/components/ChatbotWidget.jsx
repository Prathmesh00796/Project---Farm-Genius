import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  X,
  Send,
  Trash2,
  Sparkles,
  Bot,
  Leaf,
  Sprout,
  Boxes,
  Store,
  Compass,
  Mic,
  MicOff,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { api } from "../api/client";
import { useLang } from "../context/LangContext";
import { useAgentGuide } from "../context/AgentGuideContext";

const INITIAL_MESSAGES = {
  mr: [
    {
      role: "model",
      content:
        "🌾 **नमस्कार! मी फार्म जीनियसचा कृषी मित्र (Agro AI) आहे.**\n\n" +
        "मी तुम्हाला **फक्त शेतीविषयक माहिती** (कापूस, सोयाबीन, ऊस, भात, मका, गहू, खते, कीड नियंत्रण) आणि **या वेबसाईटचा वापर कसा करायचा** याबद्दल मदत करू शकतो.\n\n" +
        "तुम्ही खालीलपैकी कोणताही प्रश्न विचारू शकता किंवा स्वतः टाईप करू शकता (मराठी, हिंदी किंवा English मध्ये)!",
    },
  ],
  hi: [
    {
      role: "model",
      content:
        "🌾 **नमस्ते! मैं फार्म जीनियस का कृषि मित्र (Agro AI) हूँ।**\n\n" +
        "मैं आपको **केवल कृषि संबंधी जानकारी** (फसलें, खाद, कीट नियंत्रण, रोग) और **इस वेबसाइट का उपयोग कैसे करें** इसके बारे में मदद कर सकता हूँ।\n\n" +
        "आप नीचे दिए गए विकल्पों में से चुन सकते हैं या मराठी, हिंदी, अंग्रेजी में टाइप कर सकते हैं!",
    },
  ],
  en: [
    {
      role: "model",
      content:
        "🌾 **Hello! I am Farm Genius Agro AI Assistant.**\n\n" +
        "I provide guidance strictly on **agriculture & crops** (Cotton, Soybean, Sugarcane, Rice, Maize, Wheat, soil, pest control) and **how to navigate this website**.\n\n" +
        "Feel free to ask any farming question or select from the quick prompts below (Supports Marathi, Hindi, & English)!",
    },
  ],
};

const QUICK_SUGGESTIONS = [
  {
    label: "🤖 🚀 मला पान डॉक्टर शिकव (Live Tour)",
    text: "मला पान डॉक्टर कसा वापरायचा ते शिकव. तिथे घेऊन चल आणि समजावून सांग.",
    tourKey: "disease",
  },
  {
    label: "🌱 🚀 पीक शिफारस कशी करायची?",
    text: "मातीनुसार पीक कसे निवडायचे? मला तिथे घेऊन चल आणि समजावून सांग.",
    tourKey: "recommend",
  },
  {
    label: "📦 🚀 उत्पादन अंदाज कसा काढायचा?",
    text: "उत्पादनाचा अंदाज कसा काढायचा? मला तिथे घेऊन चल आणि समजावून सांग.",
    tourKey: "yield",
  },
  {
    label: "🏪 🚀 बाजार पाटी कशी वापरायची?",
    text: "बाजार पाटी कशी वापरायची? मला तिथे घेऊन चल आणि समजावून सांग.",
    tourKey: "market",
  },
  {
    label: "🌾 कापूस पिकावरील कीड नियंत्रण",
    text: "कापूस पिकावरील बोंडअळी व कीड नियंत्रण कसे करावे?",
  },
  {
    label: "🧭 वेबसाईटचे सर्व पर्याय",
    text: "फार्म जीनियस वेबसाईटवर कोणकोणते पर्याय आहेत आणि ते कसे वापरायचे?",
  },
];

export function ChatbotWidget() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { startTour } = useAgentGuide();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState(lang === "en" ? "en" : "mr");
  const [isListening, setIsListening] = useState(false);

  // Load chat history from localStorage or fallback to initial message
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("fg_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_MESSAGES[lang] || INITIAL_MESSAGES.mr;
  });

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem("fg_chat_history", JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Handle Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang =
        selectedLang === "mr"
          ? "mr-IN"
          : selectedLang === "hi"
          ? "hi-IN"
          : "en-IN";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("तुमच्या ब्राउझरमध्ये व्हॉइस टायपिंग उपलब्ध नाही. कृपया कीबोर्डने टाईप करा.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang =
          selectedLang === "mr"
            ? "mr-IN"
            : selectedLang === "hi"
            ? "hi-IN"
            : "en-IN";
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSend = async (userText = null) => {
    const textToSend = (typeof userText === "string" ? userText : input).trim();
    if (!textToSend || loading) return;

    setInput("");
    const newHistory = [...messages, { role: "user", content: textToSend }];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Format messages history for the backend
      const formattedHistory = newHistory.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const res = await api.post("/api/chat", {
        message: textToSend,
        history: formattedHistory,
        lang: selectedLang,
      });

      if (res.data && res.data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: res.data.reply,
            source: res.data.source,
          },
        ]);
      } else {
        throw new Error(res.data?.error || "Error receiving response");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content:
            selectedLang === "en"
              ? "⚠️ Temporary connection issue. Please check your network or try again."
              : "⚠️ सर्व्हरशी संपर्क करताना अडचण आली. कृपया पुन्हा प्रयत्न करा.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const fresh = INITIAL_MESSAGES[selectedLang] || INITIAL_MESSAGES.mr;
    setMessages(fresh);
    try {
      localStorage.removeItem("fg_chat_history");
    } catch {
      // ignore
    }
  };

  // Helper to detect website routes mentioned in reply and display interactive Co-Pilot & navigation buttons
  const renderMessageContent = (content) => {
    const routesFound = [];
    if (content.includes("/disease")) {
      routesFound.push({
        path: "/disease",
        tourKey: "disease",
        name: "🍃 पान डॉक्टर (Leaf Doctor)",
      });
    }
    if (content.includes("/recommend")) {
      routesFound.push({
        path: "/recommend",
        tourKey: "recommend",
        name: "🌱 पीक शिफारस (Crop Fit)",
      });
    }
    if (content.includes("/yield")) {
      routesFound.push({
        path: "/yield",
        tourKey: "yield",
        name: "📦 उत्पादन अंदाज (Yield Idea)",
      });
    }
    if (content.includes("/market")) {
      routesFound.push({
        path: "/market",
        tourKey: "market",
        name: "🏪 बाजार पाटी (Market)",
      });
    }
    if (content.includes("Home `/`") || content.includes("मुख्य पान")) {
      routesFound.push({ path: "/", name: "⛅ हवामान व मुख्य पान (Home)" });
    }

    // Convert basic markdown styling (bold, bullets, breaks)
    const formatted = content
      .split("\n")
      .map((line, idx) => {
        // Replace bold **text**
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className={line.trim() === "" ? "h-2" : "leading-relaxed"}>
            {parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={pIdx} className="font-bold text-emerald-950">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      });

    return (
      <div className="space-y-1 text-sm">
        {formatted}
        {routesFound.length > 0 && (
          <div className="mt-3.5 space-y-2 pt-2.5 border-t border-emerald-100">
            {/* Interactive Agent Co-Pilot Button (Takes Farmer to Page and Explains) */}
            {routesFound
              .filter((r) => r.tourKey)
              .map((r, i) => (
                <button
                  key={`agent-btn-${i}`}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    startTour(r.tourKey);
                  }}
                  className="w-full flex items-center justify-between gap-2 text-xs font-black px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 text-white shadow-md shadow-emerald-600/25 hover:scale-[1.02] hover:shadow-lg transition-all cursor-pointer ring-2 ring-lime-300/40 text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                      🚀
                    </span>
                    <span>मला तिथे घेऊन चल आणि समजावून सांग ({r.name})</span>
                  </span>
                  <ChevronRight size={15} className="shrink-0" />
                </button>
              ))}

            {/* Direct Quick Link Pill */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 w-full mb-0.5">
                किंवा थेट पानावर जा:
              </span>
              {routesFound.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    navigate(r.path);
                    if (window.innerWidth < 640) setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition shadow-2xs cursor-pointer"
                >
                  {r.name}
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open Agro AI Chat"
            className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 px-4 py-3.5 text-white shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50 focus:outline-hidden focus:ring-4 focus:ring-emerald-300"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs">
              <Bot size={20} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-lime-400 border border-white"></span>
              </span>
            </span>
            <div className="text-left font-semibold leading-tight pr-1">
              <div className="text-xs uppercase tracking-wider text-lime-200">
                Agro AI
              </div>
              <div className="text-sm font-bold text-white">कृषी मित्र</div>
            </div>
            <Sparkles size={16} className="text-lime-200 group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </div>

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col w-[92vw] sm:w-[410px] h-[580px] max-h-[88vh] rounded-3xl bg-white border border-emerald-100 shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-700 p-3.5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
                  <Bot size={22} className="text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-emerald-700 bg-lime-400"></span>
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight flex items-center gap-1.5">
                    कृषी मित्र <span className="text-xs text-lime-200 font-normal">(Agro AI)</span>
                  </h3>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400"></span>
                    फक्त शेती व वेबसाईट मार्गदर्शक
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="चॅट साफ करा (Clear Chat)"
                  className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/20 hover:text-white transition"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="बंद करा (Close)"
                  className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/20 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Language Selector Pill */}
            <div className="mt-2.5 flex items-center justify-between text-xs bg-black/15 rounded-xl px-2.5 py-1 backdrop-blur-xs">
              <span className="text-emerald-100 text-[11px]">उत्तर भाषा:</span>
              <div className="flex items-center gap-1">
                {[
                  { code: "mr", label: "मराठी" },
                  { code: "hi", label: "हिंदी" },
                  { code: "en", label: "English" },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setSelectedLang(l.code)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                      selectedLang === l.code
                        ? "bg-white text-emerald-800 shadow-xs"
                        : "text-emerald-100 hover:bg-white/10"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick suggestions banner */}
          <div className="bg-emerald-50/80 px-3 py-2 border-b border-emerald-100 overflow-x-auto scrollbar-none flex gap-1.5 whitespace-nowrap">
            {QUICK_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (s.tourKey) {
                    setIsOpen(false);
                    startTour(s.tourKey);
                  } else {
                    handleSend(s.text);
                  }
                }}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  s.tourKey
                    ? "bg-gradient-to-r from-emerald-600 to-lime-600 text-white border-transparent shadow-xs hover:brightness-110"
                    : "border-emerald-200 bg-white text-emerald-800 shadow-2xs hover:bg-emerald-100 hover:border-emerald-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-gradient-to-b from-slate-50 to-emerald-50/30">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white text-xs shadow-xs">
                      🌾
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-tr-xs"
                        : "bg-white border border-emerald-100 text-slate-800 rounded-tl-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    ) : (
                      renderMessageContent(m.content)
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 justify-start items-center">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white text-xs">
                  🌾
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-white border border-emerald-100 px-4 py-2 text-xs text-slate-500 shadow-xs flex items-center gap-1.5">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce"></span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <span className="font-medium text-emerald-800 ml-1">
                    कृषी मित्र विचार करत आहे...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Action Bar */}
          <div className="border-t border-emerald-100 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedLang === "en"
                      ? "Ask crop or website question..."
                      : selectedLang === "hi"
                      ? "फसल या वेबसाइट के बारे में पूछें..."
                      : "शेती किंवा वेबसाईटबद्दल प्रश्न विचारा..."
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-9 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-200 transition"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Listening..." : "बोलून टाईप करा (Voice)"}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-slate-400 hover:text-emerald-600"
                  }`}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={17} />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span>🌾 फक्त शेती व फार्म जीनियस मार्गदर्शन</span>
              <span className="text-emerald-600 font-semibold">Gemini AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
