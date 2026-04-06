'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Send,
  User,
  Menu,
  X,
  Loader2,
  Trash
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LLMService } from '@/lib/llm';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const MODEL_URL = "https://egekaan.dev/uploads/gemma-4-E4B-it-web.task";

const GemmaIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>Gemma</title>
    <defs>
      <linearGradient id="lobe-icons-gemma-fill" x1="24.419%" x2="75.194%" y1="75.581%" y2="25.194%">
        <stop offset="0%" stopColor="#446EFF"></stop>
        <stop offset="36.661%" stopColor="#2E96FF"></stop>
        <stop offset="83.221%" stopColor="#B1C5FF"></stop>
      </linearGradient>
    </defs>
    <path
      d="M12.34 5.953a8.233 8.233 0 01-.247-1.125V3.72a8.25 8.25 0 015.562 2.232H12.34zm-.69 0c.113-.373.199-.755.257-1.145V3.72a8.25 8.25 0 00-5.562 2.232h5.304zm-5.433.187h5.373a7.98 7.98 0 01-.267.696 8.41 8.41 0 01-1.76 2.65L6.216 6.14zm-.264-.187H2.977v.187h2.915a8.436 8.436 0 00-2.357 5.767H0v.186h3.535a8.436 8.436 0 002.357 5.767H2.977v.186h2.976v2.977h.187v-2.915a8.436 8.436 0 005.767 2.357V24h.186v-3.535a8.436 8.436 0 005.767-2.357v2.915h.186v-2.977h2.977v-.186h-2.915a8.436 8.436 0 002.357-5.767H24v-.186h-3.535a8.436 8.436 0 00-2.357-5.767h2.915v-.187h-2.977V2.977h-.186v2.915a8.436 8.436 0 00-5.767-2.357V0h-.186v3.535A8.436 8.436 0 006.14 5.892V2.977h-.187v2.976zm6.14 14.326a8.25 8.25 0 005.562-2.233H12.34c-.108.367-.19.743-.247 1.126v1.107zm-.186-1.087a8.015 8.015 0 00-.258-1.146H6.345a8.25 8.25 0 005.562 2.233v-1.087zm-8.186-7.285h1.107a8.23 8.23 0 001.125-.247V6.345a8.25 8.25 0 00-2.232 5.562zm1.087.186H3.72a8.25 8.25 0 002.232 5.562v-5.304a8.012 8.012 0 00-1.145-.258zm15.47-.186a8.25 8.25 0 00-2.232-5.562v5.315c.367.108.743.19 1.126.247h1.107zm-1.086.186c-.39.058-.772.144-1.146.258v5.304a8.25 8.25 0 002.233-5.562h-1.087zm-1.332 5.69V12.41a7.97 7.97 0 00-.696.267 8.409 8.409 0 00-2.65 1.76l3.346 3.346zm0-6.18v-5.45l-.012-.013h-5.451c.076.235.162.468.26.696a8.698 8.698 0 001.819 2.688 8.698 8.698 0 002.688 1.82c.228.097.46.183.696.259zM6.14 17.848V12.41c.235.078.468.167.696.267a8.403 8.403 0 012.688 1.799 8.404 8.404 0 011.799 2.688c.1.228.19.46.267.696H6.152l-.012-.012zm0-6.245V6.326l3.29 3.29a8.716 8.716 0 01-2.594 1.728 8.14 8.14 0 01-.696.259zm6.257 6.257h5.277l-3.29-3.29a8.716 8.716 0 00-1.728 2.594 8.135 8.135 0 00-.259.696zm-2.347-7.81a9.435 9.435 0 01-2.88 1.96 9.14 9.14 0 012.88 1.94 9.14 9.14 0 011.94 2.88 9.435 9.435 0 011.96-2.88 9.14 9.14 0 012.88-1.94 9.435 9.435 0 01-2.88-1.96 9.434 9.434 0 01-1.96-2.88 9.14 9.14 0 01-1.94 2.88z"
      fill="url(#lobe-icons-gemma-fill)"
      fillRule="evenodd"
    />
  </svg>
);

export default function Home() {
  const [chats, setChats] = useLocalStorage<Chat[]>('gemma-chats', []);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [generatingChatId, setGeneratingChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deleteModalTarget, setDeleteModalTarget] = useState<'all' | string | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(new Date(timestamp));
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Handle hydration and initial sidebar state
  useEffect(() => {
    setMounted(true);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }

    // Register Service Worker for offline support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => console.log('SW registered:', registration),
        (err) => console.log('SW registration failed:', err)
      );
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize model on first load
  useEffect(() => {
    if (!mounted) return;
    const initModel = async () => {
      setIsInitializing(true);
      setInitProgress(0);
      setError(null);
      try {
        await LLMService.getInstance(MODEL_URL, (progress) => {
          setInitProgress(progress);
        });
      } catch (err: any) {
        console.error("Initialization error:", err);
        let message = "Failed to initialize model.";
        if (err.message === "Failed to fetch") {
          message = "Failed to download model. This is likely due to a CORS issue or Mixed Content (HTTP on an HTTPS site). Please ensure the model URL is HTTPS and supports CORS.";
        } else {
          message = err.message || message;
        }
        setError(message);
      } finally {
        // Add a small delay to ensure the user sees the transition
        setTimeout(() => setIsInitializing(false), 500);
      }
    };
    initModel();
  }, [mounted]);

  // Prevent tab closing during generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLoading) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLoading]);

  const activeChat = useMemo(() =>
    chats.find(c => c.id === activeChatId) || null,
    [chats, activeChatId]);

  const sortedChats = useMemo(() =>
    [...chats].sort((a, b) => b.updatedAt - a.updatedAt),
    [chats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Max height for approx 5 lines (20px line height * 5 + 32px padding)
      textareaRef.current.style.height = `${Math.min(scrollHeight, 132)}px`;
    }
  }, [input]);

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    if (id === generatingChatId) return;
    e.stopPropagation();
    setDeleteModalTarget(id);
  };

  const deleteAllChats = () => {
    if (isLoading) return;
    setDeleteModalTarget('all');
  };

  const confirmDelete = () => {
    if (deleteModalTarget === 'all') {
      setChats([]);
      setActiveChatId(null);
    } else if (deleteModalTarget) {
      setChats(chats.filter(c => c.id !== deleteModalTarget));
      if (activeChatId === deleteModalTarget) setActiveChatId(null);
    }
    setDeleteModalTarget(null);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || isInitializing) return;

    let currentChatId = activeChatId;
    let currentChats = [...chats];

    // Create chat if none active
    if (!currentChatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [],
        updatedAt: Date.now(),
      };
      currentChatId = newChat.id;
      currentChats = [newChat, ...currentChats];
      setActiveChatId(currentChatId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    // Update state with user message
    setChats(prev => {
      let currentChats = [...prev];
      let currentChatId = activeChatId;

      // Create chat if none active
      if (!currentChatId) {
        const newChat: Chat = {
          id: Date.now().toString(),
          title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
          messages: [],
          updatedAt: Date.now(),
        };
        currentChatId = newChat.id;
        currentChats = [newChat, ...currentChats];
        // We need to set this but it's outside the functional update
        // We'll handle this with a side effect or just by knowing currentChatId here
      }

      const updated = currentChats.map(c => {
        if (c.id === currentChatId) {
          const currentMessages = c.messages || [];
          return {
            ...c,
            messages: [...currentMessages, userMessage],
            updatedAt: Date.now(),
            title: currentMessages.length === 0 ? input.slice(0, 30) : c.title
          };
        }
        return c;
      });

      // If we created a new chat, we must update the activeChatId state
      if (!activeChatId) {
        setActiveChatId(currentChatId);
      }

      return updated;
    });

    setInput('');
    setIsLoading(true);
    setGeneratingChatId(currentChatId);
    setError(null);

    try {
      // We need the latest chats to process
      const chatToProcess = (activeChatId ? chats.find(c => c.id === activeChatId) : null);
      const previousMessages = chatToProcess?.messages || [];

      // Limit context to last 14 messages for a balanced 7-turn 'memory'
      // Provides deep conversational history while staying lightning fast on mobile and low-end PCs.
      const contextMessages = previousMessages.slice(-14);
      const allMessages = [...contextMessages, userMessage];

      // System instructions for Gemma with per-chat entropy injection
      const systemInstruction = `You are Gemma 4 E4B, a high-performance model created by Google DeepMind and featured in this text-only chat demo by Ege Kaan Işık. Your goal is to be a brilliant, supportive, and witty collaborator providing accurate text responses in the same language as the user's input. Avoid filler phrases, generic AI introductions, or unnecessary prose, and use standard Markdown for all formatting. Your guiding principle is that intelligence-per-parameter is the ultimate metric for exploring the capabilities of this model. Your messages should not contain any 'Self-Correction/Analysis' or internal reasoning blocks. IMPORTANT: Generate ONLY the Assistant's response. Do NOT generate any 'User:' turns or additional dialogue. Stop immediately after finishing your answer. (Conversation Fingerprint: ${activeChatId || Date.now()})`;

      // Construct prompt with context
      const context = allMessages.map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`
      ).join('\n');

      const fullPrompt = `${systemInstruction}\n\n${context}Assistant: `;

      const assistantMessageId = (Date.now() + 1).toString();

      // Add placeholder assistant message
      setChats(prev => prev.map(c => {
        const isTargetChat = c.id === activeChatId || (c.messages.length > 0 && c.messages[c.messages.length - 1].id === userMessage.id);

        if (isTargetChat) {
          return {
            ...c,
            messages: [...(c.messages || []), {
              id: assistantMessageId,
              role: 'assistant',
              content: '',
              timestamp: Date.now()
            }]
          };
        }
        return c;
      }));

      await LLMService.generateResponse(MODEL_URL, fullPrompt, (partial, done) => {
        // Truncate if model starts generating User turns
        let cleanPartial = partial;
        const stopMarkers = ['User:', 'Assistant:', 'user:', 'assistant:'];
        for (const marker of stopMarkers) {
          const index = cleanPartial.indexOf(marker);
          if (index !== -1) {
            cleanPartial = cleanPartial.slice(0, index).trim();
            break;
          }
        }

        setChats(prev => prev.map(c => {
          const isTargetChat = c.id === activeChatId || (c.messages.length > 0 && c.messages[c.messages.length - 1].id === assistantMessageId);
          if (isTargetChat) {
            const msgs = c.messages || [];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.id === assistantMessageId) {
              return {
                ...c,
                messages: [
                  ...msgs.slice(0, -1),
                  { ...lastMsg, content: cleanPartial }
                ]
              };
            }
          }
          return c;
        }));
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate response. Make sure your browser supports WebGPU.");
    } finally {
      setIsLoading(false);
      setGeneratingChatId(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalTarget && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModalTarget(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#1e1f20] border border-[#28292a] rounded-2xl p-6 shadow-2xl space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  {deleteModalTarget === 'all' ? 'Clear all chats?' : 'Delete chat?'}
                </h3>
                <p className="text-[#9aa0a6] text-sm">
                  {deleteModalTarget === 'all' 
                    ? 'This will permanently delete your entire chat history. This action cannot be undone.'
                    : 'This will permanently delete this conversation from your history. This action cannot be undone.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#28292a] hover:bg-[#333537] text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                >
                  {deleteModalTarget === 'all' ? 'Clear All' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Initialization Loading Screen */}
      <AnimatePresence>
        {isInitializing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#131314] flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <GemmaIcon size={56} className="text-blue-400" />
              </div>
            </div>
            <div className="text-center space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-white">Initializing Gemma 4 E4B</h2>
                <p className="text-[#9aa0a6] text-xs max-w-xs">
                  Downloading and preparing the model for on-device inference.
                </p>
              </div>

              <div className="w-64 mx-auto space-y-2">
                <div className="h-1.5 w-full bg-[#28292a] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${initProgress}%` }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#5f6368] font-medium uppercase tracking-wider">
                  <span>{initProgress < 100 ? 'Downloading' : 'Ready'}</span>
                  <span>{initProgress}%</span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center flex flex-col gap-1">
              <div className="text-[10px] text-[#5f6368] font-medium">
                Demo not affiliated with Google.
              </div>
              <div className="text-[10px] text-[#5f6368] font-medium">
                Made by <a href="https://egekaan.dev" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Ege Kaan Işık</a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar Backdrop for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : -280,
          width: isSidebarOpen ? 280 : (windowWidth >= 768 ? 0 : 280)
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "bg-[#1e1f20] flex flex-col h-full z-50 border-r border-[#28292a] fixed md:relative inset-y-0 left-0 overflow-hidden",
          !isSidebarOpen && "pointer-events-none md:pointer-events-auto"
        )}
      >
        <div className="w-[280px] h-full flex flex-col">
          <div className="p-4 flex items-center gap-2">
            <button
              onClick={createNewChat}
              className="flex items-center gap-3 px-4 py-3 bg-[#28292a] hover:bg-[#333537] rounded-xl transition-colors flex-1 text-sm font-medium"
            >
              <Plus size={20} />
              <span>New Chat</span>
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-3 hover:bg-[#28292a] rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            <div className="px-4 py-2 text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider">
              Recent
            </div>
            {mounted && sortedChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => {
                  setActiveChatId(chat.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={cn(
                  "group flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-sm",
                  activeChatId === chat.id ? "bg-[#28292a] text-white" : "hover:bg-[#28292a] text-[#e3e3e3]"
                )}
              >
                <MessageSquare size={18} className="shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{chat.title}</span>
                  <span className="text-[10px] text-[#5f6368]">{formatRelativeTime(chat.updatedAt)}</span>
                </div>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  disabled={chat.id === generatingChatId}
                  className={cn(
                    "opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 transition-all",
                    chat.id === generatingChatId ? "cursor-not-allowed text-[#3c4043]" : "hover:text-red-400"
                  )}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#28292a] space-y-2">
            <button
              onClick={deleteAllChats}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-xl transition-colors w-full text-sm",
                isLoading 
                  ? "cursor-not-allowed text-[#3c4043] bg-transparent" 
                  : "hover:bg-red-400/10 text-[#9aa0a6] hover:text-red-400"
              )}
            >
              <Trash size={18} />
              <span>Clear all chats</span>
            </button>

            <div className="px-4 py-2 flex flex-col gap-1">
              <div className="text-[10px] text-[#5f6368] font-medium">
                Demo not affiliated with Google.
              </div>
              <div className="text-[10px] text-[#5f6368] font-medium">
                Made by <a href="https://egekaan.dev" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Ege Kaan Işık</a>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center px-4 md:px-6 border-b border-[#28292a] relative shrink-0">
          <div className="flex items-center z-10">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={cn(
                "p-2 hover:bg-[#28292a] rounded-lg transition-opacity",
                isSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
              )}
            >
              <Menu size={24} />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="text-lg md:text-xl font-medium text-[#e3e3e3] truncate px-12">Gemma 4 Demo</h1>
          </div>

          <div className="ml-auto z-10 flex items-center gap-2" />
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-0">
          <div className="max-w-3xl mx-auto space-y-8">
            {!activeChat || !activeChat.messages || activeChat.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pt-20">
                <div className="w-24 h-24 bg-[#1e1f20] rounded-full flex items-center justify-center text-blue-400 shadow-xl border border-[#28292a]">
                  <GemmaIcon size={72} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold text-white">Hello! I&apos;m Gemma 4 E4B.</h2>
                  <p className="text-[#9aa0a6] max-w-md">
                    I run entirely in your browser. No data ever leaves your device.
                    How can I help you today?
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg mt-8">
                  {[
                    "Explain quantum computing",
                    "Write a poem about space",
                    "How do I bake a cake?",
                    "What is React.js?"
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="p-4 bg-[#1e1f20] hover:bg-[#28292a] rounded-xl text-sm text-left transition-colors border border-[#28292a]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-4 md:gap-6",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-blue-600" : "bg-[#1e1f20] border border-[#28292a]"
                  )}>
                    {msg.role === 'user' ? <User size={20} /> : <GemmaIcon size={24} className="text-blue-400" />}
                  </div>
                  <div className={cn(
                    "flex-1 min-w-0 space-y-2",
                    msg.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
                  )}>
                    <div className={cn(
                      "block max-w-full p-4 rounded-2xl text-sm leading-relaxed min-w-0 shadow-sm",
                      msg.role === 'user'
                        ? "bg-[#28292a] text-white rounded-tr-none ml-4"
                        : "bg-[#1e1f20] text-[#e3e3e3] border border-[#28292a] rounded-tl-none mr-4"
                    )}>
                      <div className="prose prose-invert max-w-full prose-p:leading-relaxed min-w-0">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[
                            [rehypeKatex, { strict: false, output: 'html', throwOnError: false }],
                            rehypeHighlight
                          ]}
                        >
                          {msg.content || (isLoading && msg.role === 'assistant' ? "..." : "")}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#5f6368] px-1">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full left-0 mb-4 z-10"
                >
                  <div className="flex items-center gap-3 px-4 py-2 bg-[#1e1f20]/80 backdrop-blur-md border border-[#28292a] rounded-2xl shadow-xl">
                    <div className="flex gap-1.5">
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#9aa0a6]">Gemma is thinking...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="absolute bottom-full left-0 right-0 mb-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-xs rounded-lg flex items-center gap-2 z-20">
                <X size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="relative flex items-end bg-[#1e1f20] rounded-2xl border border-[#28292a] focus-within:border-[#3c4043] transition-all shadow-lg overflow-hidden">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message Gemma 4..."
                className="flex-1 bg-transparent p-4 resize-none focus:outline-none text-sm max-h-[132px] overflow-y-auto custom-scrollbar"
                rows={1}
              />
              <div className="p-2 flex items-center justify-center">
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2 rounded-xl transition-all shrink-0",
                    input.trim() && !isLoading
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "text-[#5f6368] cursor-not-allowed"
                  )}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-center text-[#5f6368] leading-relaxed max-w-lg mx-auto">
              This demo is not created, endorsed, or affiliated with Google or Google DeepMind.
              <br />
              Gemma may display inaccurate info, so double-check its responses.
              <span className="ml-1 font-medium text-blue-400/80">Running 100% on-device.</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
