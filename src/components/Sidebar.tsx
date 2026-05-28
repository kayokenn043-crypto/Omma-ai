import React from "react";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Code, 
  Languages, 
  PenTool, 
  Globe, 
  Volume2, 
  MessageSquare,
  History,
  Info
} from "lucide-react";
import { ChatSession, SystemPrompt } from "../types";
import { SYSTEM_PROMPTS } from "../data/systemPrompts";
import { SeroLogo } from "./SeroLogo";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  webSearch: boolean;
  setWebSearch: (val: boolean) => void;
  activePromptId: string;
  onChangePrompt: (id: string) => void;
  voice: string;
  setVoice: (voiceName: string) => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  webSearch,
  setWebSearch,
  activePromptId,
  onChangePrompt,
  voice,
  setVoice,
}: SidebarProps) {

  // Map icon strings to Lucide components
  const getPromptIcon = (iconName: string) => {
    switch (iconName) {
      case "Code": return <Code size={16} className="text-emerald-500" />;
      case "Languages": return <Languages size={16} className="text-red-500" />;
      case "PenTool": return <PenTool size={16} className="text-emerald-400" />;
      default: return <Sparkles size={16} className="text-red-500" />;
    }
  };

  // Human-friendly voice labels
  const voices = [
    { id: "Kore", label: "كوري (أنثوي - قوي)" },
    { id: "Zephyr", label: "زيفير (ذكوري - ناعم)" },
    { id: "Puck", label: "باك (حيوي ومرح)" },
    { id: "Charon", label: "شارون (عميق ومميز)" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#111111] border-r border-zinc-800 text-zinc-200 overflow-hidden w-full select-none">
      {/* Platform Branding Logo */}
      <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
          <SeroLogo className="w-7.5 h-7.5" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            <span>Omma</span>
            <span className="text-emerald-500">ai</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest">MOROCCAN COGNITIVE V3.0</p>
        </div>
      </div>

      {/* Primary Actions: New Conversation */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          id="btn-new-chat"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 transition-all rounded-xl text-[14px] font-semibold text-white shadow-xl shadow-emerald-950/20 border border-emerald-400/20 active:scale-95 duration-100 cursor-pointer"
        >
          <Plus size={16} />
          <span>محادثة جديدة</span>
        </button>
      </div>

      {/* Scrollable control workspace */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 scrollbar-none">
        
        {/* Section 1: System Presets (Personas) */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-2">
            <span>تخصيص نمط المساعد</span>
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {SYSTEM_PROMPTS.map((prompt) => {
              const isActive = activePromptId === prompt.id;
              return (
                <button
                  key={prompt.id}
                  onClick={() => onChangePrompt(prompt.id)}
                  className={`w-full flex items-center justify-between text-right p-3 rounded-xl border text-[13px] font-medium transition-all duration-100 cursor-pointer ${
                    isActive
                      ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-400 shadow-sm"
                      : "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/65 hover:border-zinc-700/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {getPromptIcon(prompt.icon)}
                    <span className="font-semibold">{prompt.nameAr}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
                    {prompt.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Advanced Capabilities Configuration */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
            ميزات متطورة مفعلة
          </label>
          
          <div className="space-y-2">
            {/* Live Web Grounding Search Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/35">
              <div className="flex items-center gap-2">
                <Globe size={16} className={webSearch ? "text-emerald-400" : "text-zinc-500"} />
                <span className="text-[13px] font-semibold text-zinc-200">البحث المباشر (ويب)</span>
              </div>
              <button
                onClick={() => setWebSearch(!webSearch)}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-all outline-none duration-100 cursor-pointer ${
                  webSearch ? "bg-emerald-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                }`}
              >
                <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Default speech voice setting */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/35 space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-red-500" />
                <span className="text-[13px] font-semibold text-zinc-200">القارئ الصوتي (TTS)</span>
              </div>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full bg-[#161616] border border-zinc-700 text-[12px] text-zinc-300 rounded-lg p-2 outline-none focus:border-emerald-500"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#161616] text-white">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Conversation History */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-2">
            <History size={13} className="text-zinc-500" />
            <span>سجل المحادثات السابقة</span>
          </label>

          {sessions.length === 0 ? (
            <div className="p-4 text-center rounded-xl border border-dashed border-zinc-800 bg-[#161616]/30">
              <MessageSquare size={24} className="mx-auto text-zinc-650 mb-2 stroke-[1.5]" />
              <p className="text-[11px] text-zinc-500">لا توجد محادثات محفوظة हालياً</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between p-2.5 rounded-xl border text-[12.5px] transition-all duration-100 ${
                      isActive
                        ? "bg-zinc-900/80 border-emerald-500/30 text-emerald-400"
                        : "bg-[#161616]/30 border-transparent hover:bg-zinc-850/50 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className="flex-1 text-right truncate overflow-hidden flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <MessageSquare size={13} className={isActive ? "text-emerald-400" : "text-zinc-500"} />
                      <span className="truncate">{session.title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all duration-100 cursor-pointer"
                      title="حذف المحادثة"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Sero Description Panel in margin */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 relative">
        <div className="flex items-start gap-2.5">
          <Info size={14} className="text-zinc-500 mt-0.5" />
          <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans text-right">
            قم بالتحويل لوضعية توليد الصور بواسطة زر التبديل بالأعلى، لتصميم رسومات رقمية احترافية فوراً!
          </p>
        </div>
      </div>
    </div>
  );
}
