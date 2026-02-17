"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import MathGraph, { extractGraphExpressions } from "./MathGraph";
import PracticeMode from "./PracticeMode";
import OllamaSetup from "./OllamaSetup";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  MessageSquare,
  ChevronLeft,
  Copy,
  Check,
  Sun,
  Moon,
  Trash2,
  GraduationCap,
  MessageCircle,
  Code2,
  Search,
} from "lucide-react";

// --- Types ---

interface FileData {
  name: string;
  type: "image" | "text";
  data: string;
  preview?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  fileData?: FileData;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

type Tab = "chat" | "practice";

// --- Suggestion chips ---

const SUGGESTIONS = [
  { label: "Solve equation", prompt: "Solve the equation: " },
  { label: "Explain concept", prompt: "Explain this math concept: " },
  { label: "Step-by-step", prompt: "Solve this step by step: " },
  { label: "Check my work", prompt: "Check if this solution is correct: " },
  { label: "Simplify", prompt: "Simplify this expression: " },
  { label: "Find derivative", prompt: "Find the derivative of: " },
  { label: "Integrate", prompt: "Evaluate the integral: " },
  { label: "Factor", prompt: "Factor this expression: " },
];

// --- Copy button for code blocks ---

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100"
      title={label || "Copy"}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// --- LaTeX export button for assistant messages ---

function LatexExportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
      title="Copy as LaTeX"
    >
      {copied ? <Check size={10} /> : <Code2 size={10} />}
      {copied ? "copied" : "copy latex"}
    </button>
  );
}

// --- Local storage helpers ---

const STORAGE_KEY = "mathbot_conversations";
const THEME_KEY = "mathbot_theme";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(convos: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
}

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// --- Main component ---

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [attachedFile, setAttachedFile] = useState<FileData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [ollamaError, setOllamaError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load saved data on mount
  useEffect(() => {
    setConversations(loadConversations());
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  // Apply theme
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  // Save conversations when they change
  useEffect(() => {
    if (mounted && conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations, mounted]);

  // Sync messages to active conversation
  useEffect(() => {
    if (activeId && messages.length > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, messages } : c))
      );
    }
  }, [messages, activeId]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key === "n") {
        e.preventDefault();
        newChat();
      }
      if (mod && e.key === "k") {
        e.preventDefault();
        if (activeTab === "chat") {
          textareaRef.current?.focus();
        }
      }
      if (mod && e.key === "p") {
        e.preventDefault();
        setActiveTab((t) => (t === "chat" ? "practice" : "chat"));
      }
      if (mod && e.key === "f") {
        e.preventDefault();
        setSearchOpen((s) => !s);
        setSidebarOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  // --- Conversation management ---

  const newChat = () => {
    setMessages([]);
    setActiveId(null);
    setInput("");
    setAttachedFile(null);
    setSidebarOpen(false);
    setActiveTab("chat");
  };

  const loadConversation = (convo: Conversation) => {
    setMessages(convo.messages);
    setActiveId(convo.id);
    setSidebarOpen(false);
    setActiveTab("chat");
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(updated);
      return updated;
    });
    if (activeId === id) {
      setMessages([]);
      setActiveId(null);
    }
  };

  const generateTitle = (text: string) => {
    const clean = text.replace(/\n/g, " ").trim();
    return clean.length > 40 ? clean.slice(0, 40) + "..." : clean;
  };

  // --- Filtered conversations for search ---
  const filteredConversations = searchQuery
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : conversations;

  // --- File handling ---

  const processFile = useCallback((file: File): Promise<FileData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith("image/");

      if (isImage) {
        reader.onload = () => {
          resolve({
            name: file.name,
            type: "image",
            data: reader.result as string,
            preview: reader.result as string,
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          resolve({
            name: file.name,
            type: "text",
            data: reader.result as string,
          });
        };
        reader.readAsText(file);
      }

      reader.onerror = () => reject(new Error("Failed to read file"));
    });
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        const fileData = await processFile(file);
        setAttachedFile(fileData);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const fileData = await processFile(file);
        setAttachedFile(fileData);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [processFile]
  );

  // --- Send message with streaming ---

  const sendMessage = async (overrideText?: string) => {
    const trimmed = (overrideText || input).trim();
    if (!trimmed && !attachedFile) return;
    if (loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: trimmed || (attachedFile ? `Solve the math in this ${attachedFile.type === "image" ? "image" : "file"}` : ""),
      fileData: attachedFile || undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setAttachedFile(null);
    setLoading(true);
    setStreaming(true);

    // Create conversation if new
    let currentId = activeId;
    if (!currentId) {
      currentId = Date.now().toString();
      const newConvo: Conversation = {
        id: currentId,
        title: generateTitle(userMessage.text),
        messages: newMessages,
        createdAt: Date.now(),
      };
      setConversations((prev) => [newConvo, ...prev]);
      setActiveId(currentId);
    }

    const assistantId = (Date.now() + 1).toString();

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            text: m.text,
            fileData: m.fileData,
          })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", text: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.replace(/^data: /, "").trim();
          if (!trimmedLine || trimmedLine === "[DONE]") continue;

          try {
            const json = JSON.parse(trimmedLine);
            if (json.token) {
              fullText += json.token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, text: fullText } : m
                )
              );
            }
            if (json.error) {
              throw new Error(json.error);
            }
          } catch (e: any) {
            if (e.message === "Stream interrupted") throw e;
          }
        }
      }

      // Ensure final text is set
      if (fullText) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, text: fullText } : m
          )
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;

      // Check if it's an Ollama connection error
      if (err.message.includes("Ollama") || err.message.includes("ECONNREFUSED")) {
        setOllamaError(true);
      }

      const errorText = `Error: ${err.message}. Make sure Ollama is running.`;
      setMessages((prev) => {
        const hasAssistant = prev.some((m) => m.id === assistantId);
        if (hasAssistant) {
          return prev.map((m) =>
            m.id === assistantId ? { ...m, text: errorText } : m
          );
        }
        return [...prev, { id: assistantId, role: "assistant", text: errorText }];
      });
    } finally {
      setLoading(false);
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 transition-colors duration-300">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-50 h-full w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800/50 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 space-y-2">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Plus size={16} />
            new chat
          </button>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors ${
                activeTab === "chat"
                  ? "bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shadow-sm"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <MessageCircle size={12} />
              chat
            </button>
            <button
              onClick={() => setActiveTab("practice")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors ${
                activeTab === "practice"
                  ? "bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shadow-sm"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <GraduationCap size={12} />
              practice
            </button>
          </div>

          {/* Search */}
          {searchOpen && (
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search chats..."
                autoFocus
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-zinc-300 dark:focus:border-zinc-600 transition-colors"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {filteredConversations.map((convo) => (
            <div
              key={convo.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-sm ${
                activeId === convo.id
                  ? "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
              onClick={() => loadConversation(convo)}
            >
              <MessageSquare size={14} className="shrink-0 opacity-40" />
              <span className="truncate flex-1">{convo.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(convo.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 transition-all p-0.5"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {searchQuery && filteredConversations.length === 0 && (
            <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-4">no results</p>
          )}
        </div>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/50 space-y-2">
          <button
            onClick={() => {
              setSearchOpen((s) => !s);
              if (searchOpen) setSearchQuery("");
            }}
            className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <Search size={14} />
            search
            <span className="ml-auto text-[10px] text-zinc-300 dark:text-zinc-700">⌘F</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "light mode" : "dark mode"}
          </button>
        </div>
      </div>

      {/* Main area */}
      {activeTab === "practice" ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Practice header */}
          <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <ChevronLeft size={20} className={`transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
            </button>
            <h1 className="text-sm font-medium tracking-wide text-zinc-400 dark:text-zinc-500 uppercase">
              practice mode
            </h1>
            <span className="text-[10px] text-zinc-300 dark:text-zinc-700">⌘P to switch</span>
          </div>
          <PracticeMode />
        </div>
      ) : ollamaError ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <ChevronLeft size={20} className={`transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
            </button>
            <h1 className="text-sm font-medium tracking-wide text-zinc-400 dark:text-zinc-500 uppercase">
              setup required
            </h1>
            <button
              onClick={() => setOllamaError(false)}
              className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
          <OllamaSetup />
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col min-w-0 relative"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Header */}
          <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <ChevronLeft size={20} className={`transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
            </button>
            <h1 className="text-sm font-medium tracking-wide text-zinc-400 dark:text-zinc-500 uppercase">
              mathbot
            </h1>
            <div className="flex-1" />
            {loading && (
              <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                  <div className="space-y-3">
                    <div className="text-4xl">∑</div>
                    <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                      mathbot
                    </h2>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                      type a problem, drop a file, or pick a suggestion below
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => handleSuggestion(s.prompt)}
                        className="px-3 py-1.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-zinc-300 dark:text-zinc-700">
                    <span>⌘N new chat</span>
                    <span>⌘K focus input</span>
                    <span>⌘P practice mode</span>
                    <span>⌘F search</span>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-br-md px-4 py-3"
                        : ""
                    }`}
                  >
                    {msg.fileData?.preview && (
                      <img
                        src={msg.fileData.preview}
                        alt="uploaded"
                        className="max-w-[240px] rounded-lg mb-2"
                      />
                    )}
                    {msg.fileData && msg.fileData.type === "text" && (
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2 bg-zinc-200/50 dark:bg-zinc-700/50 rounded-lg px-3 py-2">
                        <FileText size={14} />
                        {msg.fileData.name}
                      </div>
                    )}
                    {msg.role === "user" ? (
                      <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    ) : (
                      <div className="group/msg relative">
                        <div className="prose prose-zinc dark:prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              pre: ({ children, ...props }) => {
                                const codeEl = React.Children.toArray(children).find(
                                  (child: any) => child?.type === "code"
                                ) as React.ReactElement<{ children?: React.ReactNode }> | undefined;
                                const codeText =
                                  codeEl?.props?.children?.toString() || "";
                                return (
                                  <div className="relative group">
                                    <pre {...props}>{children}</pre>
                                    <CopyButton text={codeText} />
                                  </div>
                                );
                              },
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                          {/* Typing cursor while streaming */}
                          {streaming && msg.id === messages[messages.length - 1]?.id && msg.role === "assistant" && (
                            <span className="inline-block w-0.5 h-4 bg-zinc-400 dark:bg-zinc-500 animate-pulse ml-0.5 align-text-bottom" />
                          )}
                        </div>
                        {/* Inline graphs */}
                        {msg.text && !streaming && (() => {
                          const exprs = extractGraphExpressions(msg.text);
                          return exprs.map((expr, i) => (
                            <MathGraph key={`${msg.id}-graph-${i}`} expression={expr} />
                          ));
                        })()}
                        {/* LaTeX export button */}
                        {msg.text && !streaming && (
                          <div className="mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                            <LatexExportButton text={msg.text} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role === "user" && !streaming && (
                <div className="flex justify-start animate-in">
                  <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-sm">thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Drag overlay */}
          {dragOver && (
            <div className="absolute inset-0 bg-white/90 dark:bg-zinc-950/90 flex items-center justify-center z-30 backdrop-blur-sm transition-all">
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl px-12 py-10 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">drop your file here</p>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="px-4 md:px-6 pb-4 md:pb-6 pt-3">
            <div className="max-w-2xl mx-auto">
              {attachedFile && (
                <div className="flex items-center gap-2 mb-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2.5 w-fit">
                  {attachedFile.type === "image" ? (
                    <ImageIcon size={14} className="text-zinc-400" />
                  ) : (
                    <FileText size={14} className="text-zinc-400" />
                  )}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">
                    {attachedFile.name}
                  </span>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ml-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 px-4 py-3 transition-all focus-within:border-zinc-300 dark:focus-within:border-zinc-700 focus-within:shadow-sm">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors pb-0.5"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.txt,.pdf,.tex,.md,.csv"
                  onChange={handleFileSelect}
                />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ask me anything about math..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 resize-none outline-none leading-relaxed"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || (!input.trim() && !attachedFile)}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed pb-0.5"
                >
                  <Send size={18} />
                </button>
              </div>

              <p className="text-[10px] text-zinc-300 dark:text-zinc-700 text-center mt-3">
                shift + enter for new line · drop files anywhere · runs locally via ollama
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
