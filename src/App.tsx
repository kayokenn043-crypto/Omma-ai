import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  Image as ImageIcon, 
  X, 
  Menu, 
  Download, 
  Loader2, 
  Volume2, 
  VolumeX, 
  Globe, 
  Trash2, 
  HelpCircle, 
  Maximize2,
  RefreshCcw,
  Compass,
  ArrowLeftRight
} from "lucide-react";
import { ChatSession, Message, ImageGeneration } from "./types";
import { SYSTEM_PROMPTS } from "./data/systemPrompts";
import Sidebar from "./components/Sidebar";
import FormattedText from "./components/FormattedText";
import { SeroLogo } from "./components/SeroLogo";

export default function App() {
  // Mode selection: 'chat' or 'image'
  const [currentMode, setCurrentMode] = useState<'chat' | 'image'>('chat');

  // Sidebar responsive drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chat tracking states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // App parameters
  const [activePromptId, setActivePromptId] = useState<string>("general");
  const [webSearch, setWebSearch] = useState<boolean>(false);
  const [voice, setVoice] = useState<string>("Kore");

  // Input states
  const [inputText, setInputText] = useState("");
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Image mode settings
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageAspectRatio, setImageAspectRatio] = useState("1:1");
  const [imageStyle, setImageStyle] = useState("3D Render");
  const [generatedImages, setGeneratedImages] = useState<ImageGeneration[]>([]);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<ImageGeneration | null>(null);

  // Error notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio elements references
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioMsgId, setPlayingAudioMsgId] = useState<string | null>(null);

  // Chat ref for auto scroll
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load state from localStorage on init
  useEffect(() => {
    const savedSessions = localStorage.getItem("sero_sessions");
    const savedImages = localStorage.getItem("sero_images");
    
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse saved Sero sessions");
      }
    }
    
    if (savedImages) {
      try {
        setGeneratedImages(JSON.parse(savedImages));
      } catch (e) {
        console.error("Failed to parse saved Sero images");
      }
    }
  }, []);

  // Sync state to localStorage on modification
  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem("sero_sessions", JSON.stringify(updatedSessions));
  };

  const saveImagesToStorage = (updatedImages: ImageGeneration[]) => {
    setGeneratedImages(updatedImages);
    localStorage.setItem("sero_images", JSON.stringify(updatedImages));
  };

  // Auto-scroll inside chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId, isGenerating]);

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  // ----------------------------------------------------
  // CHAT CONTROLS
  // ----------------------------------------------------
  const handleNewChat = () => {
    setActivePromptId("general");
    setActiveSessionId(null);
    setSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActivePromptId(session.systemPromptId);
    }
    setSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    saveSessionsToStorage(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Convert File uploads to base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("الرجاء تحديد ملف صورة صحيح (PNG, JPG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImageBase64(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Send message to Sero AI
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImageBase64) return;
    if (isGenerating) return;

    setErrorMessage(null);
    setIsGenerating(true);

    const userText = inputText;
    const userImg = selectedImageBase64;
    
    // Reset inputs immediately
    setInputText("");
    setSelectedImageBase64(null);

    // Prepare current message object
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' }),
      imageBase64: userImg || undefined
    };

    let sessionToUse: ChatSession;
    let updatedSessions: ChatSession[];

    // If there is no active session open, lazy create one
    if (!activeSessionId) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: userText ? (userText.length > 25 ? userText.substring(0, 25) + "..." : userText) : "محادثة مرئية جديدة",
        messages: [userMessage],
        createdAt: new Date().toLocaleString("ar-SA"),
        systemPromptId: activePromptId
      };
      updatedSessions = [newSession, ...sessions];
      sessionToUse = newSession;
      setActiveSessionId(newSession.id);
    } else {
      const activeSession = sessions.find(s => s.id === activeSessionId)!;
      sessionToUse = {
        ...activeSession,
        messages: [...activeSession.messages, userMessage],
      };
      updatedSessions = sessions.map(s => s.id === activeSessionId ? sessionToUse : s);
    }

    saveSessionsToStorage(updatedSessions);

    try {
      // Find system prompt details
      const presetPrompt = SYSTEM_PROMPTS.find(p => p.id === activePromptId)?.prompt || "";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sessionToUse.messages,
          systemInstruction: presetPrompt,
          webSearch: webSearch
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "فشلت عملية التوليد.");
      }

      // Add Assistant reply
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' }),
        groundingSources: data.groundingSources
      };

      const finalSession = {
        ...sessionToUse,
        messages: [...sessionToUse.messages, assistantMessage]
      };

      saveSessionsToStorage(updatedSessions.map(s => s.id === finalSession.id ? finalSession : s));

    } catch (err: any) {
      console.error(err);
      
      // Feed error bubble back to dialog rather than crashing
      const errBubble: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ نأمل منك المعذرة! حدث خطأ أثناء الاتصال بالخادم الرئيسي:\n\n* **السبب:** ${err.message || "خطأ غير معروف في خادم الاستوديو."}\n\n*يرجى التحقق من إعداد مفتاح واجهة التطبيق (GEMINI_API_KEY) في Settings > Secrets.*`,
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })
      };

      const finalSession = {
        ...sessionToUse,
        messages: [...sessionToUse.messages, errBubble]
      };

      saveSessionsToStorage(updatedSessions.map(s => s.id === finalSession.id ? finalSession : s));
    } finally {
      setIsGenerating(false);
    }
  };

  // ----------------------------------------------------
  // TEXT-TO-SPEECH PLAYBACK MODULE
  // ----------------------------------------------------
  const handleToggleSpeech = async (msg: Message) => {
    // If this current message audio is already playing, pause it.
    if (playingAudioMsgId === msg.id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingAudioMsgId(null);
      return;
    }

    // Stop any other running audio first
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    // If message already has audio loaded, play instantly!
    if (msg.audioBase64) {
      playBinarySpeech(msg.id, msg.audioBase64);
      return;
    }

    // Otherwise, generate starting animation
    setPlayingAudioMsgId(msg.id);
    
    // Update local state to show speech is loaded
    const activeSession = sessions.find(s => s.id === activeSessionId)!;
    const modifiedMessages = activeSession.messages.map(m => m.id === msg.id ? { ...m, isGeneratingAudio: true } : m);
    saveSessionsToStorage(sessions.map(s => s.id === activeSessionId ? { ...s, messages: modifiedMessages } : s));

    try {
      // Clean content from code snippets for a natural readable stream
      const textToSpeak = msg.content
        .replace(/```[\s\S]*?```/g, "") // strip code blocks
        .replace(/[*#`\-]/g, "") // strip markdown symbols
        .substring(0, 400); // limit payload size to stay within 20s latency

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voice: voice
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "فشلت تلاوة النص.");
      }

      // Save the generated audio payload inside message state so it won't hit server again
      const currentActiveSession = sessions.find(s => s.id === activeSessionId)!;
      const updatedMessagesWithAudio = currentActiveSession.messages.map(m => 
        m.id === msg.id ? { ...m, audioBase64: data.audio, isGeneratingAudio: false } : m
      );
      saveSessionsToStorage(sessions.map(s => s.id === activeSessionId ? { ...s, messages: updatedMessagesWithAudio } : s));

      // Trigger the play mechanism
      playBinarySpeech(msg.id, data.audio);

    } catch (err: any) {
      console.error(err);
      alert(`عذراً، فشل تحويل النص لحديث: ${err.message || "فشل الاتصال بخادم الصوت."}`);
      
      // Reset animations
      const currentActiveSession = sessions.find(s => s.id === activeSessionId)!;
      const resetMessages = currentActiveSession.messages.map(m => m.id === msg.id ? { ...m, isGeneratingAudio: false } : m);
      saveSessionsToStorage(sessions.map(s => s.id === activeSessionId ? { ...s, messages: resetMessages } : s));
      setPlayingAudioMsgId(null);
    }
  };

  const playBinarySpeech = (msgId: string, base64Audio: string) => {
    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      setPlayingAudioMsgId(msgId);

      audio.play();
      audio.onended = () => {
        if (playingAudioMsgId === msgId) {
          setPlayingAudioMsgId(null);
        }
      };
    } catch (err) {
      console.error("Failed to decode WAV base64 bytes", err);
      setPlayingAudioMsgId(null);
    }
  };

  // ----------------------------------------------------
  // IMAGE CREATOR MODULE
  // ----------------------------------------------------
  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim()) return;
    if (isGenerating) return;

    setErrorMessage(null);
    setIsGenerating(true);

    const activeUserPrompt = imagePrompt;
    setImagePrompt(""); // Clear input

    try {
      // Modify prompt based on selected styling for perfect artistic rendering
      let fullPromptValue = activeUserPrompt;
      if (imageStyle !== "Default") {
        fullPromptValue = `${activeUserPrompt}, in ${imageStyle} master style, ultra detailed, elegant composition.`;
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPromptValue,
          aspectRatio: imageAspectRatio
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "billing_or_paid_model_required") {
          throw new Error("توليد الصور بحاجة لمفتاح مدفوع (Paid API Key). يرجى التفعيل لـ gemini-2.5-flash-image من الإعدادات.");
        }
        throw new Error(data.message || "فشلت عملية توليد الرسوم.");
      }

      // Successfully generated image! Keep in gallery
      const newImageResult: ImageGeneration = {
        id: crypto.randomUUID(),
        prompt: activeUserPrompt,
        url: data.url, // Base64 data block image
        timestamp: new Date().toLocaleString("ar-SA"),
        aspectRatio: imageAspectRatio,
        style: imageStyle
      };

      const updatedGallery = [newImageResult, ...generatedImages];
      saveImagesToStorage(updatedGallery);
      
      // Auto-preview generated visual
      setSelectedGalleryImage(newImageResult);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "أخفق خادم الرسم الرقمي في الاستجابة.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteImage = (imgId: string) => {
    const updated = generatedImages.filter(img => img.id !== imgId);
    saveImagesToStorage(updated);
    if (selectedGalleryImage?.id === imgId) {
      setSelectedGalleryImage(null);
    }
  };

  // Quick prompt injection lists
  const QUICK_PROMPTS = [
    { text: "أصلح الأخطاء واشرح الثغرات في الكود التالي", icon: "💻", category: "coder" },
    { text: "اكتب مقالاً فصيحاً عن أهمية اللغات والثقافات المتنوعة", icon: "📝", category: "writer" },
    { text: "ترجم هذه الجملة لثلاث لغات مختلفة مع ضبط التشكيل", icon: "🌐", category: "translator" },
    { text: "ما هي أسرع حافلة طائرة في التاريخ؟ فسر النظرية", icon: "🔍", category: "general" }
  ];

  const QUICK_IMAGE_PROMPTS = [
    "منزل مغطى بالطحالب يتوسط بحيرة جبلية غامضة وقت الغروب, photorealistic",
    "فارس عربي من المستقبل بدروع نيون متوهجة يركب حصاناً آلياً, cyber-punk",
    "شوارع دافئة لمدينة ساحلية برياح البحر اللطيفة بألوان مائية هادئة, watercolor"
  ];

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex h-screen w-screen overflow-hidden text-zinc-100 font-sans antialiased text-right" dir="rtl">
      {/* 1. Sidebar - Left Panel (COLLAPSED on mobile, styled drawer) */}
      <div className={`fixed inset-y-0 right-0 z-40 w-80 transform transition-transform duration-300 md:relative md:transform-none ${
        sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
      }`}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          webSearch={webSearch}
          setWebSearch={setWebSearch}
          activePromptId={activePromptId}
          onChangePrompt={(id) => {
            setActivePromptId(id);
            // If we have an active chat session, sync prompt type changes
            if (activeSessionId) {
              saveSessionsToStorage(sessions.map(s => s.id === activeSessionId ? { ...s, systemPromptId: id } : s));
            }
          }}
          voice={voice}
          setVoice={setVoice}
        />
      </div>

      {/* Overlayer to click-close sidebar drawer on mobile screens */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity"
        />
      )}

      {/* 2. Main Workspace Platform - Center Area */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] relative overflow-hidden">
        
        {/* Glow decorative graphics in top corner */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-650/5 rounded-full filter blur-[120px] pointer-events-none" />

        {/* Global Navbar Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black/20 backdrop-blur-md z-20">
          
          {/* Logo element & menu */}
          <div className="flex items-center gap-3">
            <button
               onClick={() => setSidebarOpen(true)}
              className="p-2 -mr-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 md:hidden active:scale-95 transition-transform"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <SeroLogo className="w-5 h-5 animate-pulse" glow={false} />
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-white">Omma</span>
                <span className="text-sm font-bold text-emerald-500">ai</span>
              </div>
              <span className="text-[10px] bg-zinc-855 px-2.5 py-0.5 rounded text-zinc-400 border border-zinc-700/60 uppercase tracking-tight">Moroccan v3.0</span>
            </div>
          </div>

          {/* Core mode triggers - Chat Space vs Image Creator */}
          <div className="flex bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-xl gap-1 shadow-inner">
            <button
              onClick={() => {
                setCurrentMode('chat');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13.5px] font-bold transition-all cursor-pointer ${
                currentMode === 'chat'
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#161616]"
              }`}
            >
              <Sparkles size={14} className="text-emerald-400" />
              <span>النصوص</span>
            </button>
            <button
              onClick={() => {
                setCurrentMode('image');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13.5px] font-bold transition-all cursor-pointer ${
                currentMode === 'image'
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#161616]"
              }`}
            >
              <ImageIcon size={14} className="text-red-400" />
              <span>الصور</span>
            </button>
          </div>

          {/* Right margin decorative status */}
          <div className="hidden sm:flex items-center gap-3.5">
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 bg-zinc-900 border border-zinc-800/60 px-3 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>متصل</span>
            </span>
          </div>

        </header>

        {/* Dynamic workspaces body */}
        <main className="flex-1 overflow-y-auto relative p-4 md:p-6 flex flex-col justify-between">
          
          {/* A. WORKSPACE: SMART CHAT MODE */}
          {currentMode === 'chat' && (
            <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full h-full relative">
              
              {/* If no chat history is active, show the majestic welcome portal */}
              {!activeSession || activeSession.messages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center px-4 space-y-8 my-auto">
                  <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white">
                      أهلاً بك في <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-red-500 to-emerald-600">Omma ai</span>
                    </h1>
                    <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                      المساعد المغربي الفائق لتوليد النصوص، تحليل الصور، والابتكار الخارق والذكي فائق السرعة.
                    </p>
                  </div>
                  
                  {/* Suggestive quick dynamic prompt grids */}
                  <div className="w-full max-w-2xl pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
                      {QUICK_PROMPTS.map((qp, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setInputText(qp.text);
                            setActivePromptId(qp.category);
                          }}
                          className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-right hover:border-zinc-700 cursor-pointer transition-all flex flex-col justify-between h-32 group"
                        >
                          <div className="w-9 h-9 bg-emerald-550/10 rounded-lg flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <span className="text-lg">{qp.icon}</span>
                          </div>
                          <div>
                            <span className="text-zinc-200 text-sm font-medium leading-snug block">{qp.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* The chat list area filled with interactive message cards */
                <div className="flex-1 space-y-6 pb-24 overflow-y-auto pr-1">
                  {activeSession.messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-4 animate-fade-in ${isUser ? "justify-start" : "justify-end"}`}
                      >
                        {/* Avatar */}
                        {!isUser && (
                          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg flex-shrink-0">
                            <SeroLogo className="w-6.5 h-6.5" glow={false} />
                          </div>
                        )}

                        {/* Content Bubbles */}
                        <div className={`flex flex-col max-w-[85%] ${isUser ? "items-start" : "items-end"}`}>
                          
                          {/* Inner card */}
                          <div className={`p-4 rounded-2xl border ${
                            isUser 
                              ? "bg-zinc-900/90 border-zinc-800/80 text-zinc-100 rounded-tr-none shadow-md" 
                              : "bg-[#111111] border-zinc-800 text-zinc-200 rounded-tl-none shadow-xl"
                          }`}>
                            
                            {/* Multimodal Preview inside user message bubbles if they sent an image */}
                            {isUser && msg.imageBase64 && (
                              <div className="mb-3 max-w-xs rounded-lg overflow-hidden border border-zinc-800/60">
                                <img
                                  src={msg.imageBase64}
                                  alt="تحميل خارجي"
                                  className="object-cover max-h-48 w-full"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {/* Render using the Custom FormattedText parser for complete safety */}
                            <FormattedText text={msg.content} />

                            {/* Search grounding metadata render */}
                            {!isUser && msg.groundingSources && (
                              <div className="mt-4 pt-3 border-t border-zinc-800/60">
                                <div className="text-[11px] text-indigo-400 font-bold mb-1.5 flex items-center gap-1">
                                  <Globe size={11} />
                                  <span>المصادر والمراجع المباشرة للبحث:</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                  {msg.groundingSources.map((source, sIdx) => (
                                    <a
                                      key={sIdx}
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] underline text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded"
                                    >
                                      {source.title.length > 25 ? source.title.substring(0, 25) + "..." : source.title}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Controls (TTS Reader button & Message time indicator) */}
                          <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-zinc-500 font-mono">
                            <span>{msg.timestamp}</span>
                            {!isUser && (
                              <button
                                onClick={() => handleToggleSpeech(msg)}
                                className={`flex items-center gap-1 hover:text-indigo-400 transition cursor-pointer px-1.5 py-0.5 rounded bg-zinc-900/35 hover:bg-zinc-850 border border-zinc-800/30 ${
                                  playingAudioMsgId === msg.id ? "text-indigo-400 font-bold" : ""
                                }`}
                                title={playingAudioMsgId === msg.id ? "إيقاف القراءة" : "الاستماع للرد بصوت ذكائي"}
                              >
                                {msg.isGeneratingAudio ? (
                                  <>
                                    <Loader2 size={10} className="animate-spin text-indigo-400" />
                                    <span>جاري توليد الصوت...</span>
                                  </>
                                ) : playingAudioMsgId === msg.id ? (
                                  <>
                                    <VolumeX size={10} className="text-rose-450 animate-bounce" />
                                    <span className="text-emerald-400">إيقاف الصوت</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 size={10} />
                                    <span>قراءة الرد صوتياً</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                        </div>

                        {/* User custom icon alignment */}
                        {isUser && (
                          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm text-emerald-400 flex-shrink-0">
                            U
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Loader placeholder while waiting for Gemini api response */}
              {isGenerating && (
                <div className="flex items-start gap-4 animate-fade-in justify-end pb-32">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg flex-shrink-0 animate-pulse">
                    <SeroLogo className="w-6.5 h-6.5" glow={false} />
                  </div>
                  <div className="flex flex-col items-end max-w-[80%] rounded-2xl bg-[#111111] border border-zinc-800 p-5 shadow-xl">
                    <div className="flex items-center gap-3 text-zinc-300 text-[13px] font-sans">
                      <Loader2 size={16} className="text-emerald-500 animate-spin" />
                      <span>يقوم Omma AI بصياغة الإجابة الذكية بأقصى سرعة ممكنة...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Form Container pinned in place */}
              <div className="absolute bottom-2 inset-x-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-6 pb-2 z-10">
                <form 
                  onSubmit={handleSendMessage}
                  className="p-2 bg-[#161616] border border-zinc-700 shadow-2xl rounded-2xl flex flex-col gap-2 focus-within:border-emerald-500/80 transition-all"
                >
                  {/* Selected Multimodal Thumbnail preview bar */}
                  {selectedImageBase64 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-805">
                      <div className="flex items-center gap-2">
                        <img
                          src={selectedImageBase64}
                          alt="صورة ملحقة"
                          className="w-10 h-10 object-cover rounded-md"
                        />
                        <span className="text-xs text-zinc-400 font-sans">سيقوم Omma بتحليل هذه اللقطة ورصدها بدقة فائقة</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedImageBase64(null)}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Input row */}
                  <div className="flex items-center gap-2">
                    {/* Multimodal Photo Paperclip button */}
                    <label 
                      className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer border border-zinc-800 flex-shrink-0"
                      title="إرفاق صورة للمناقشة والتحليل"
                    >
                      <ImageIcon size={18} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Main input text field */}
                    <input
                      type="text"
                      dir="auto"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        activePromptId === "coder" 
                          ? "اكتب كوداً أو أسقط برمجية لإصلاحها..."
                          : activePromptId === "translator" 
                          ? "أدخل الجمل التي تريد ترجمتها بأشكال وصياغات متميزة..."
                          : "تحدث مع Omma AI بطلاقة فائقة وبشكل فوري..."
                      }
                      className="flex-1 bg-transparent border-none text-[14px] text-zinc-100 placeholder-zinc-500 focus:ring-0 outline-none px-3 text-right"
                    />

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isGenerating || (!inputText.trim() && !selectedImageBase64)}
                      className={`p-3.5 rounded-xl transition-all duration-155 flex-shrink-0 active:scale-95 cursor-pointer ${
                        (inputText.trim() || selectedImageBase64) && !isGenerating
                          ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                          : "bg-zinc-950 text-zinc-650 cursor-not-allowed border border-zinc-800"
                      }`}
                    >
                      <Send size={16} className="transform rotate-180" />
                    </button>
                  </div>
                </form>
                <p className="text-[10px] text-center text-zinc-500 mt-2 font-sans">
                  Omma AI يعمل بأحدث التقنيات العصبية السحابية الفائقة. يرجى التحقق من المعلومات بالغة الأهمية.
                </p>
              </div>

              {/* Auto scroll anchor */}
              <div ref={messagesEndRef} />

            </div>
          )}

          {/* B. WORKSPACE: IMAGE CREATOR STUDIO */}
          {currentMode === 'image' && (
            <div className="flex-1 max-w-6xl mx-auto w-full h-full flex flex-col lg:flex-row gap-6 animate-fade-in">
              
              {/* Creator Controls inputs (Right Column on English, Left on RTL) */}
              <div className="w-full lg:w-80 flex-shrink-0 flex flex-col justify-between">
                
                <form onSubmit={handleGenerateImage} className="space-y-5 bg-[#111111] border border-zinc-800 p-5 rounded-2xl">
                  
                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-bold text-zinc-300">وصف الصورة بدقة وإبداع</label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="امثلة: رائد فضاء عربي يعزف العود فوق زحل، رسم زيتي تعبيري دقيق بالألوان الدافئة..."
                      rows={4}
                      className="w-full bg-zinc-950 border border-zinc-805 text-[13px] text-zinc-100 placeholder-zinc-500 rounded-xl p-3 outline-none focus:border-emerald-500 text-right leading-relaxed"
                    />
                  </div>

                  {/* Aspect ratio configurations */}
                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-bold text-zinc-300">أبعاد اللوحة (Aspect Ratio)</label>
                    <div className="grid grid-cols-3 gap-2">
                       {[
                        { id: "1:1", label: "مربع (1:1)" },
                        { id: "16:9", label: "عريض (16:9)" },
                        { id: "9:16", label: "جوال (9:16)" },
                        { id: "4:3", label: "لوحي (4:3)" },
                        { id: "3:4", label: "شخصي (3:4)" }
                      ].map((ratio) => (
                        <button
                          key={ratio.id}
                          type="button"
                          onClick={() => setImageAspectRatio(ratio.id)}
                          className={`p-2 rounded-lg border text-[11.5px] font-bold transition-all cursor-pointer ${
                            imageAspectRatio === ratio.id
                              ? "bg-emerald-600/20 border-emerald-500 text-white"
                              : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Styling preset selectors */}
                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-bold text-zinc-300">نمط الرسم الفني</label>
                    <select
                      value={imageStyle}
                      onChange={(e) => setImageStyle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
                    >
                      <option value="Default">نمط الطبيعي (بدون فلتر)</option>
                      <option value="Photorealistic">تصوير واقعي سينمائي (Photorealistic)</option>
                      <option value="Anime">رسوم متحركة يابانية (Anime)</option>
                      <option value="3D Render">رسم ثلاثي الأبعاد (3D Render)</option>
                      <option value="Watercolor">ألوان مائية فنية (Watercolor)</option>
                      <option value="Cyberpunk">عصر النيون المعتم (Cyberpunk)</option>
                      <option value="Pixel Art">ألعاب بكسل كلاسيكية (Pixel Art)</option>
                    </select>
                  </div>

                  {/* Generate Button trigger */}
                  <button
                    type="submit"
                    disabled={isGenerating || !imagePrompt.trim()}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13.5px] font-bold transition-all cursor-pointer ${
                      imagePrompt.trim() && !isGenerating
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-650/40"
                        : "bg-zinc-950 text-zinc-650 cursor-not-allowed border border-zinc-850"
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-white" />
                        <span>جاري الرسم الفني...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-emerald-400" />
                        <span>أطلق العنان وارسم الآن</span>
                      </>
                    )}
                  </button>

                </form>

                {/* Helpful guides inside Image margin helper */}
                <div className="hidden lg:block mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <HelpCircle size={13} className="text-emerald-400" />
                    <span>نصيحة للحصول على صورة مثالية</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed text-right">
                    كلما أضفت تفاصيل هامة عن اللون، الخلفية، واتجاه الضوء، كلما تمكن نموذج الرؤية من صهر لوحة فنية مطابقة لخيالك الإبداعي!
                  </p>
                </div>

              </div>

              {/* Main Visual Display canvas & gallery results */}
              <div className="flex-1 flex flex-col space-y-6">
                
                {/* Error Banner if something went wrong inside image module */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[12.5px] text-rose-300">
                    <p className="font-semibold mb-1">⚠️ حدث عثرة أثناء التوليد الفني:</p>
                    <p className="opacity-90">{errorMessage}</p>
                    <p className="text-[10px] text-zinc-400 mt-2">يرجى التحقق من إعدادات الحساب أو محاولة وصف الفكرة بأسلوب آخر.</p>
                  </div>
                )}

                {/* Display active selected image inside gallery or big placeholder */}
                {selectedGalleryImage ? (
                  <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                    <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-850 flex items-center justify-center max-h-[460px]">
                      <img
                        src={selectedGalleryImage.url}
                        alt={selectedGalleryImage.prompt}
                        className="object-contain max-h-[440px] w-full"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        {/* Download base64 helper anchor link */}
                        <a
                          href={selectedGalleryImage.url}
                          download={`sero-art-${selectedGalleryImage.id}.png`}
                          className="p-2 rounded-xl bg-zinc-900/80 backdrop-blur border border-zinc-700/50 hover:bg-zinc-800 text-white shadow-xl transition active:scale-95 duration-100"
                          title="حفظ الصورة في جهازك المحلية"
                        >
                          <Download size={15} />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-[13px] text-zinc-300 leading-relaxed font-semibold text-right">
                          💡 {selectedGalleryImage.prompt}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                          <span className="bg-zinc-800/80 px-2 py-0.5 rounded-full">النمط: {selectedGalleryImage.style}</span>
                          <span className="bg-zinc-800/80 px-2 py-0.5 rounded-full">الأبعاد: {selectedGalleryImage.aspectRatio}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteImage(selectedGalleryImage.id)}
                        className="p-2 h-max rounded-lg bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition"
                        title="حذف الرسم من المعرض"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[300px] rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/30 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    {isGenerating ? (
                      <div className="space-y-3">
                        <Loader2 size={38} className="text-indigo-400 animate-spin mx-auto" />
                        <p className="text-[13.5px] font-bold text-zinc-200">جاري صياغة الفكرة وحقنها بكسل تلو الآخر بصبر...</p>
                        <p className="text-xs text-zinc-500">هذه العملية قد تستغرق من 3 إلى 8 ثوانٍ بناءً على تعقيد الأبعاد المفروضة.</p>
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={38} className="text-zinc-700 stroke-[1.2]" />
                        <div className="space-y-1">
                          <h3 className="text-[14px] font-bold text-zinc-300">اللوحة الفنية الرقمية فارغة</h3>
                          <p className="text-xs text-zinc-500 max-w-sm">أدخل الوصف على اليمين لتوليد صور فنية بديل للواقع، أو جرب الضغط على اقتراحات الرسم أدناه!</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Suggestive options for Image prompt injection */}
                {!isGenerating && !selectedGalleryImage && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-500">أفكار مذهلة وجاهزة للرسم:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {QUICK_IMAGE_PROMPTS.map((promptText, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => {
                            setImagePrompt(promptText);
                            setImageStyle("Photorealistic");
                          }}
                          className="p-2.5 text-right rounded-lg border border-zinc-900 bg-zinc-900/10 hover:bg-zinc-900/40 hover:border-zinc-800 transition text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer line-clamp-2"
                        >
                          ✨ {promptText.split(",")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Horizontal list of historic generated images (The Gallery tray) */}
                {generatedImages.length > 0 && (
                  <div className="space-y-2.5 border-t border-zinc-900 pt-4">
                    <h4 className="text-[12.5px] font-bold text-zinc-400">معرض الرسوم الفنية المصممة سابقاً ({generatedImages.length})</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {generatedImages.map((img) => {
                        const isSelected = selectedGalleryImage?.id === img.id;
                        return (
                          <div
                            key={img.id}
                            onClick={() => setSelectedGalleryImage(img)}
                            className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all active:scale-95 duration-100 ${
                              isSelected ? "border-indigo-500 scale-105" : "border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <img
                              src={img.url}
                              alt="معرض مصغر"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {/* Short format prompt indicator */}
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[8px] text-center text-white truncate">
                              {img.prompt}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
