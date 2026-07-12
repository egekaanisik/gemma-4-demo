'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MdOutlineAdd,
  MdChatBubbleOutline,
  MdDeleteOutline,
  MdOutlineDeleteForever,
  MdSend,
  MdStop,
  MdOutlineAccountCircle,
  MdOutlineMenu,
  MdOutlineClose,
  MdOutlineRefresh,
  MdOutlineLightbulb,
  MdOutlineAutoAwesome,
  MdOutlineHistoryEdu,
  MdOutlineScience,
  MdOutlineCode,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdContentCopy,
  MdCheck,
} from 'react-icons/md';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LLMService } from '@/lib/llm';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  reasoning?: string;
  reasoningDuration?: number;
  isReasoningComplete?: boolean;
  isCancelled?: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const MODEL_URL = "https://egekaan.dev/uploads/gemma-4-E4B-it-web.litertlm";

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

const CopyButton = ({ text, className = "", iconSize = 16 }: { text: string; className?: string; iconSize?: number }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 transition-all duration-300",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <MdCheck size={iconSize} className="text-green-400" />
          <span className="text-[10px] font-bold text-green-400 tracking-tight">Copied</span>
        </>
      ) : (
        <>
          <MdContentCopy size={iconSize} />
          <span className="text-[10px] font-bold tracking-tight">Copy</span>
        </>
      )}
    </button>
  );
};

// Utility for formatting time
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

const extractText = (children: any): string => {
  return React.Children.toArray(children)
    .map((child: any) => {
      if (typeof child === 'string') return child;
      if (typeof child === 'number') return String(child);
      if (child.props?.children) return extractText(child.props.children);
      return '';
    })
    .join('');
};

// Sub-component for Collapsible Reasoning
const ReasoningBlock = ({ reasoning, duration, isComplete }: { reasoning?: string; duration?: number; isComplete?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded while generating
  const [hasManuallyCollapsed, setHasManuallyCollapsed] = useState(false);

  // Auto-expand/collapse logic
  useEffect(() => {
    if (isComplete && !hasManuallyCollapsed) {
      setIsExpanded(false);
    }
  }, [isComplete, hasManuallyCollapsed]);

  if (!reasoning) return null;

  return (
    <div className="w-full mb-2">
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (isExpanded) setHasManuallyCollapsed(true);
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border",
          isExpanded
            ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
            : "bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/60"
        )}
      >
        <MdOutlineLightbulb size={14} />
        <span>
          {isComplete
            ? `Thought for ${duration?.toFixed(1) || '0.0'}s`
            : `Reasoning in progress... ${duration?.toFixed(1) || '0.0'}s`}
        </span>
        {isExpanded ? <MdKeyboardArrowUp size={16} /> : <MdKeyboardArrowDown size={16} />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 bg-zinc-900/40 border-l-2 border-primary/40 rounded-r-xl text-xs italic text-zinc-400 font-medium backdrop-blur-md prose prose-invert prose-sm max-w-full prose-p:leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { strict: false }], rehypeHighlight, rehypeRaw]}
              >
                {reasoning}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Message item component for better performance and hook support
const ChatMessage = ({
  msg,
  activeChatId,
  generatingChatId,
  isLoading,
  isLast
}: {
  msg: Message;
  activeChatId?: string | null;
  generatingChatId?: string | null;
  isLoading: boolean;
  isLast: boolean;
}) => {
  const isGeneratingCurrent = isLoading && isLast && msg.role === 'assistant' && activeChatId === generatingChatId;

  // Memoize markdown components to prevent flickering during streams
  const markdownComponents = useMemo(() => ({
    pre: ({ node, children, ...props }: any) => {
      const codeContent = extractText(children);
      return (
        <div className="relative group/code my-6">
          <pre {...props} className="!my-0">
            {children}
          </pre>
          {!isGeneratingCurrent && (
            <div className="absolute top-3 right-3 opacity-0 group-hover/code:opacity-100 transition-opacity">
              <CopyButton
                text={codeContent}
                className="bg-black/60 hover:bg-black/80 text-zinc-400 hover:text-white px-2 py-1 rounded-md border border-white/10 backdrop-blur-md shadow-lg"
              />
            </div>
          )}
        </div>
      );
    }
  }), [isGeneratingCurrent]);

  const isCanceledAtThought = msg.isCancelled && !msg.content;
  const hasContent = msg.content || (msg.reasoning && !isCanceledAtThought);

  if (!hasContent && msg.role === 'assistant' && msg.isCancelled) {
    return (
      <div className="flex items-center gap-4 my-6 text-[#5f6368] select-none">
        <div className="flex-1 border-t border-[#28292a]"></div>
        <span className="text-[10px] font-bold tracking-widest text-red-500/40 uppercase">
          Generation canceled
        </span>
        <div className="flex-1 border-t border-[#28292a]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn(
        "flex gap-4 md:gap-6",
        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          msg.role === 'user' ? "bg-primary" : "bg-[#1e1f20] border border-[#28292a]"
        )}>
          {msg.role === 'user' ? <MdOutlineAccountCircle size={28} /> : <GemmaIcon size={28} className="text-primary" />}
        </div>
        <div className={cn(
          "flex-1 min-w-0 space-y-2",
          msg.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
        )}>
          {msg.role === 'assistant' && msg.reasoning && !isCanceledAtThought && (
            <ReasoningBlock
              reasoning={msg.reasoning}
              duration={msg.reasoningDuration}
              isComplete={msg.isReasoningComplete}
            />
          )}

          {(msg.role === 'user' || msg.content) && (
            <>
              <div className={cn(
                "block max-w-full p-4 rounded-2xl text-sm leading-relaxed min-w-0 shadow-sm transition-all duration-500 break-words",
                msg.role === 'user'
                  ? "bg-[#28292a] text-white rounded-tr-none ml-4"
                  : "bg-[#1e1f20] text-[#e3e3e3] border border-[#28292a] rounded-tl-none mr-4"
              )}>
                <div className="prose prose-invert max-w-full prose-p:leading-relaxed min-w-0">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[
                      [rehypeKatex, { strict: false, output: 'html', throwOnError: false }],
                      rehypeHighlight,
                      rehypeRaw
                    ]}
                    components={markdownComponents}
                  >
                    {msg.content || (isLoading && msg.role === 'assistant' && !msg.reasoning ? "..." : "")}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="flex items-center gap-3 px-1">
                <div className="text-[10px] text-[#5f6368]">
                  {msg.timestamp ? formatTime(msg.timestamp) : ''}
                </div>
                {msg.role === 'assistant' && !isGeneratingCurrent && msg.content && (
                  <CopyButton
                    text={msg.content}
                    className="text-[#5f6368] hover:text-primary p-0 bg-transparent border-none"
                    iconSize={14}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {msg.isCancelled && (
        <div className="flex items-center gap-4 my-6 text-[#5f6368] select-none">
          <div className="flex-1 border-t border-[#28292a]"></div>
          <span className="text-[10px] font-bold tracking-widest text-red-500/40 uppercase">
            Generation canceled
          </span>
          <div className="flex-1 border-t border-[#28292a]"></div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [chats, setChats] = useLocalStorage<Chat[]>('gemma-chats', []);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [inputCharLimit] = useState(4000);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [initStatus, setInitStatus] = useState('Initializing');
  const [generatingChatId, setGeneratingChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deleteModalTarget, setDeleteModalTarget] = useState<'all' | string | null>(null);
  const [isReasoningEnabled, setIsReasoningEnabled] = useLocalStorage<boolean>('gemma-reasoning', true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [loadingInfoIndex, setLoadingInfoIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const isCancelledRef = useRef(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const UA = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(UA.toLowerCase());
    };
    if (checkMobile()) {
      setIsMobile(true);
      setInitStatus('Compatibility Error');
      setError('Gemma 4 E4B on web is not fully compatible with mobile devices. For the best experience and to access on-device processing, please visit this page from a computer.');
    }
  }, []);

  const loadingInfos = useMemo(() => [
    { title: "On-Device Processing", desc: "Your data never leaves your machine. Computation happens locally in your GPU." },
    { title: "Deep Thinking", desc: "Advanced reasoning mode allows the model to think through complex problems step-by-step." },
    { title: "Self-Caching", desc: "Once downloaded, the model is stored in your browser's persistent cache." },
    { title: "High Performance", desc: "Leveraging LiteRT-LM for low-latency browser AI." },
    { title: "Total Privacy", desc: "Works even without an internet connection after the initialization phase." }
  ], []);

  useEffect(() => {
    if (isInitializing) {
      const interval = setInterval(() => {
        setLoadingInfoIndex(prev => (prev + 1) % loadingInfos.length);
      }, 6000); // Extended for better readability
      return () => clearInterval(interval);
    }
  }, [isInitializing, loadingInfos.length]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateInput = (value: string) => {
    setInput(value);
    setDrafts(prev => ({ ...prev, [activeChatId || 'default']: value }));
  };

  // Sync input with drafts when switching chats
  useEffect(() => {
    if (mounted) {
      setInput(drafts[activeChatId || 'default'] || '');
    }
  }, [activeChatId, mounted, drafts]);

  // Handle hydration and initial sidebar state
  useEffect(() => {
    setMounted(true);

    // Clean up empty chats on load
    setChats(prev => prev.filter(c => c.messages && c.messages.length > 0));

    // Clean up legacy .task files from cache (ensure only .litertlm remains)
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.open('gemma-model-cache').then((cache) => {
        cache.keys().then((requests) => {
          requests.forEach((request) => {
            const url = request.url;
            if (url.includes('.task')) {
              cache.delete(request).then(
                (success) => {
                  if (success) console.log('Successfully removed cached legacy model:', url);
                }
              ).catch(err => console.error('Failed to delete cached legacy model:', err));
            }
          });
        });
      }).catch(err => console.warn('Could not access model cache for cleanup:', err));
    }

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
      if (isMobile) return;
      setIsInitializing(true);
      setInitProgress(0);
      setInitStatus('Initializing');
      setError(null);
      try {
        await LLMService.getInstance(MODEL_URL, (progress, status) => {
          setInitProgress(progress);
          setInitStatus(status);
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
        // Add a small delay to ensure the user sees the 'Model ready' status
        setTimeout(() => setIsInitializing(false), 800);
      }
    };
    initModel();
  }, [mounted]);

  // Prevent tab closing during generation and cancel active generation on unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLoading) {
        e.preventDefault();
      }
    };

    const handleUnload = () => {
      if (isLoading) {
        LLMService.cancel();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [isLoading]);

  const activeChat = useMemo(() =>
    chats.find(c => c.id === activeChatId) || null,
    [chats, activeChatId]);

  const sortedChats = useMemo(() =>
    [...chats].sort((a, b) => b.updatedAt - a.updatedAt),
    [chats]);

  const prevActiveChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    const chatChanged = prevActiveChatIdRef.current !== activeChatId;
    prevActiveChatIdRef.current = activeChatId;

    if (chatChanged) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat?.messages, activeChatId]);

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
          <MdOutlineRefresh className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  const createNewChat = () => {
    const emptyChat = chats.find(c => !c.messages || c.messages.length === 0);
    if (emptyChat) {
      setActiveChatId(emptyChat.id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      return;
    }

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

  const generateChatTitle = async (chatId: string, firstMessage: string) => {
    // Basic fallback title from the first message
    const getFallbackTitle = (msg: string) => {
      const trimmed = msg.trim();
      if (trimmed.length <= 40) return trimmed;
      // Try to cut at the last space within 40 chars
      const lastSpace = trimmed.substring(0, 40).lastIndexOf(' ');
      if (lastSpace > 20) return trimmed.substring(0, lastSpace) + '...';
      return trimmed.substring(0, 40) + '...';
    };

    try {
      const messages = [
        {
          role: 'system',
          content: `You are a professional summarizer. Your goal is to capture the USER'S INTENT and summarize their message into a SINGLE brief title (max 5 words). (Conversation Fingerprint: ${chatId || Date.now()})
RULES:
1. Respond ONLY with the title text itself.
2. NO numbering (e.g., do NOT start with "1." or "1 ").
3. NO bullet points or prefixes.
4. NO quotes or periods.
5. NO mentioning or including the "Conversation Fingerprint".
6. Use Title Case.
7. Use the SAME language as the user input (e.g., if user writes in Turkish, title must be Turkish). Use English as a fallback if you're unsure.
8. NO emojis.`
        },
        {
          role: 'user',
          content: firstMessage
        }
      ];

      const generatedTitle = await LLMService.generateResponse(MODEL_URL, messages);

      // Clean up the title more robustly
      let cleanTitle = generatedTitle
        .replace(/<\|channel>[\s\S]*?<channel\|>/g, '') // Remove reasoning blocks
        .trim() // Trim after removing reasoning to handle leading spaces
        .replace(/^\d+[\s.)-]+\s*/, '') // Strip leading numbers like "1.", "1)", "1 - "
        .replace(/^Title:\s*/i, '')
        .replace(/^["']|["']$/g, '')
        .split('\n')[0]
        .trim();

      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, title: cleanTitle || getFallbackTitle(firstMessage) } : c
      ));
    } catch (err) {
      console.error("Failed to generate title:", err);
      // Even on error, set a fallback so it doesn't stay as "..."
      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, title: getFallbackTitle(firstMessage) } : c
      ));
    }
  };

  const handleStopGeneration = () => {
    isCancelledRef.current = true;
    LLMService.cancel();
  };

  const handleSendMessage = async () => {
    if (!input.trim() || input.length > inputCharLimit || isLoading || isInitializing) return;

    let assistantMessageId = "";
    let currentChatId = activeChatId;
    let currentChats = [...chats];

    // Create chat if none active
    if (!currentChatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: '...',
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
          title: '...',
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
            title: currentMessages.length === 0 ? '...' : c.title
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

    updateInput('');
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
      // Only add the <|think|> token if enabled, without adding extra textual instructions
      const systemInstruction = `${isReasoningEnabled ? '<|think|>' : ''}You are Gemma 4 E4B, a high-performance model created by Google DeepMind and featured in this text-only chat demo by Ege Kaan Işık. Your goal is to be a brilliant, supportive, and witty collaborator providing accurate text responses in the same language as the user's input. Avoid filler phrases, generic AI introductions, or unnecessary prose, and use standard Markdown for all formatting. Your guiding principle is that intelligence-per-parameter is the ultimate metric for exploring the capabilities of this model. Your messages should not contain any 'Self-Correction/Analysis' or internal reasoning blocks. IMPORTANT: Generate ONLY the Assistant's response. Do NOT generate any 'User:' turns or additional dialogue. Stop immediately after finishing your answer. (Conversation Fingerprint: ${activeChatId || Date.now()})`;

      // Construct structured message objects for the LiteRT-LM preface (LiteRT-LM best practice)
      const structuredMessages = [
        { role: 'system', content: systemInstruction }
      ];

      for (const m of allMessages) {
        let content = m.content;
        // Clean previous assistant messages from reasoning blocks (<|channel>...<channel|>) 
        // to prevent the model from seeing its own previous thoughts in the context window.
        if (m.role === 'assistant') {
          content = content.replace(/<\|channel>[\s\S]*?<channel\|>/g, '').trim();
        }
        structuredMessages.push({
          role: m.role === 'assistant' ? 'assistant' : m.role,
          content: content
        });
      }

      // If this was the first exchange (only 1 user message in history), generate a creative title BEFORE the main response
      if (allMessages.length === 1) {
        await generateChatTitle(currentChatId!, userMessage.content);
      }

      assistantMessageId = (Date.now() + 1).toString();

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

      let reasoningStartTime: number | null = null;
      let reasoningEndTime: number | null = null;

      await LLMService.generateResponse(MODEL_URL, structuredMessages, (partial, done) => {
        // Parse reasoning blocks and final content
        let reasoning = "";
        let finalContent = partial;

        const startIdx = partial.indexOf("<|channel>thought");
        const endIdx = partial.indexOf("<channel|>");

        if (startIdx !== -1) {
          if (!reasoningStartTime) reasoningStartTime = Date.now();

          if (endIdx !== -1) {
            if (!reasoningEndTime) reasoningEndTime = Date.now();
            reasoning = partial.substring(startIdx + 17, endIdx).trim();
            finalContent = partial.substring(endIdx + 10).trim();
          } else {
            reasoning = partial.substring(startIdx + 17).trim();
            finalContent = "";
          }
        }

        // Truncate if model starts generating new turns or fallback markers
        const stopMarkers = ['<|turn>', 'User:', 'Assistant:', 'user:', 'assistant:'];
        for (const marker of stopMarkers) {
          const index = finalContent.indexOf(marker);
          if (index !== -1) {
            finalContent = finalContent.slice(0, index).trim();
            break;
          }
        }

        const duration = reasoningStartTime && reasoningEndTime
          ? (reasoningEndTime - reasoningStartTime) / 1000
          : reasoningStartTime ? (Date.now() - reasoningStartTime) / 1000 : 0;

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
                  {
                    ...lastMsg,
                    content: finalContent,
                    reasoning: reasoning,
                    reasoningDuration: duration,
                    isReasoningComplete: !!reasoningEndTime
                  }
                ]
              };
            }
          }
          return c;
        }));
      });

    } catch (err: any) {
      console.error(err);
      if (isCancelledRef.current) {
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
                  {
                    ...lastMsg,
                    isCancelled: true,
                    isReasoningComplete: true
                  }
                ]
              };
            }
          }
          return c;
        }));
        isCancelledRef.current = false;
      } else {
        setError(err.message || "Failed to generate response. Make sure your browser supports WebGPU.");
      }
    } finally {
      setIsLoading(false);
      setGeneratingChatId(null);
    }
  };

  return (
    <div className={cn(
      "flex h-[100dvh] bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden",
      (isInitializing || (isMobile && mounted)) && "fixed inset-0"
    )}>
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

      <AnimatePresence>
        {(isInitializing || (isMobile && mounted)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={isMobile ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#131314] flex flex-col items-center justify-center space-y-6 overflow-hidden overscroll-none"
          >
            <div className="relative mb-12">
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -inset-16 bg-primary/20 blur-3xl rounded-full"
              />
              <div className="relative">
                <div className="w-32 h-32 border-b-2 border-primary/20 border-t-2 border-primary rounded-full animate-spin duration-[2000ms]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <GemmaIcon size={72} className="text-primary" />
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-lg flex flex-col items-center space-y-16 z-10">
              <div className="text-center space-y-4 px-6">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl md:text-6xl font-medium tracking-tight text-white"
                >
                  Gemma 4
                </motion.h2>
                {!isMobile && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-[#9aa0a6] text-sm md:text-base font-medium tracking-wide"
                  >
                    Downloading and initializing Gemma 4 E4B...
                  </motion.p>
                )}
              </div>

              <div className="h-24 flex items-center justify-center max-w-sm mx-auto text-center">
                {isMobile ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                    className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 backdrop-blur-md mx-6"
                  >
                    <p className="text-red-200/80 text-sm leading-relaxed font-medium">
                      {error}
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={loadingInfoIndex}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-2 px-6"
                    >
                      <p className="text-white text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">{loadingInfos[loadingInfoIndex].title}</p>
                      <p className="text-[#9aa0a6] text-[13px] leading-relaxed font-medium">{loadingInfos[loadingInfoIndex].desc}</p>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {!isMobile && (
                <div className="w-full max-w-[280px] space-y-4">
                  <div className="h-[2px] w-full bg-[#1e1f20] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#446EFF] via-[#2E96FF] to-[#B1C5FF]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, initProgress)}%` }}
                      transition={{ type: 'spring', damping: 25, stiffness: 80 }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-bold">
                    <span className="animate-pulse text-[#5f6368]">
                      {initStatus}
                    </span>
                    <span className="text-primary">{initProgress}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-8 left-0 right-0 text-center flex flex-col gap-1">
              <div className="text-[10px] text-[#5f6368] font-medium">
                Demo not affiliated with Google.
              </div>
              <div className="text-[10px] text-[#5f6368] font-medium">
                Made by <a href="https://egekaan.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ege Kaan Işık</a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Application Layout */}
      {!isMobile && mounted && (
        <>
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
                  <MdOutlineAdd size={24} />
                  <span>New Chat</span>
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-3 hover:bg-[#28292a] rounded-xl transition-colors"
                >
                  <MdOutlineClose size={24} />
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
                    <MdChatBubbleOutline size={20} className="shrink-0" />
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
                      <MdDeleteOutline size={18} />
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
                  <MdOutlineDeleteForever size={20} />
                  <span>Clear all chats</span>
                </button>

                <div className="px-4 py-2 flex flex-col gap-1">
                  <div className="text-[10px] text-[#5f6368] font-medium">
                    Demo not affiliated with Google.
                  </div>
                  <div className="text-[10px] text-[#5f6368] font-medium">
                    Made by <a href="https://egekaan.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ege Kaan Işık</a>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col relative min-w-0">
            {/* Header */}
            <header className={cn(
              "h-16 flex items-center px-4 md:px-6 relative shrink-0 transition-colors duration-300",
              activeChat && activeChat.messages && activeChat.messages.length > 0 ? "border-b border-[#28292a]" : "border-b border-transparent"
            )}>
              <div className="flex items-center z-10 min-w-0">
                <div className={cn(
                  "flex items-center transition-all duration-300 overflow-hidden",
                  isSidebarOpen ? "w-0 opacity-0" : "w-11 opacity-100 mr-2"
                )}>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 hover:bg-[#28292a] rounded-lg shrink-0"
                  >
                    <MdOutlineMenu size={24} />
                  </button>
                </div>
                {activeChat && activeChat.messages && activeChat.messages.length > 0 && (
                  <h1 className="hidden md:block text-sm md:text-base font-semibold text-[#e3e3e3] truncate whitespace-nowrap">
                    Gemma 4 Demo
                  </h1>
                )}
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300">
                {activeChat && activeChat.messages && activeChat.messages.length > 0 && (
                  <h2 className="text-sm md:text-base font-medium text-[#9aa0a6] truncate px-32 md:px-48 animate-in fade-in slide-in-from-top-1 duration-500">
                    {activeChat.title}
                  </h2>
                )}
              </div>

              <div className="ml-auto z-10 flex items-center gap-2">
                {activeChat && activeChat.messages && activeChat.messages.length > 0 && (
                  <button
                    onClick={(e) => deleteChat(activeChat.id, e)}
                    disabled={activeChat.id === generatingChatId || isInitializing}
                    className={cn(
                      "p-2 hover:bg-red-400/10 text-[#9aa0a6] hover:text-red-400 rounded-lg transition-all",
                      (activeChat.id === generatingChatId || isInitializing)
                        ? "opacity-40 cursor-not-allowed text-zinc-500 grayscale"
                        : "opacity-100"
                    )}
                  >
                    <MdDeleteOutline size={24} />
                  </button>
                )}
              </div>
            </header>

            {/* Chat Area */}
            <div className={cn(
              "flex-1 overflow-y-auto px-4 py-8 md:px-0 scroll-smooth",
              (!activeChat || !activeChat.messages || activeChat.messages.length === 0) && "flex flex-col"
            )}>
              <div className={cn(
                "max-w-4xl mx-auto space-y-8 w-full px-6",
                (!activeChat || !activeChat.messages || activeChat.messages.length === 0) && "my-auto py-6"
              )}>
                {!isInitializing && (!activeChat || !activeChat.messages || activeChat.messages.length === 0) ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center text-center space-y-9 px-0 md:px-6"
                  >
                    <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 text-center md:text-left max-w-6xl px-0 md:px-6">
                      <div className="relative group shrink-0">
                        <motion.div
                          animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute -inset-6 bg-primary/20 blur-3xl rounded-full"
                        />
                        <div className="relative w-32 h-32 bg-[#1e1f20]/80 backdrop-blur-xl rounded-full flex items-center justify-center text-primary shadow-2xl border border-[#28292a] group-hover:border-primary/50 transition-colors duration-500">
                          <GemmaIcon size={96} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <motion.h2
                          initial={{ opacity: 0, filter: "blur(10px)" }}
                          animate={{ opacity: 1, filter: "blur(0px)" }}
                          transition={{ delay: 0.2, duration: 0.8 }}
                          className="text-4xl md:text-5xl font-medium text-white tracking-tight"
                        >
                          Hello! I&apos;m <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#B1C5FF]">Gemma 4</span>.
                        </motion.h2>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4, duration: 0.8 }}
                          className="text-[#9aa0a6] text-base md:text-lg leading-relaxed"
                        >
                          I run entirely in your browser. No data ever leaves your device.
                          <br />
                          <span className="text-white">How can I help you today?</span>
                        </motion.p>
                      </div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.8 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl pt-2"
                    >
                      {[
                        {
                          text: "Explain quantum computing",
                          icon: <MdOutlineScience size={18} className="text-orange-400" />,
                          label: "Knowledge"
                        },
                        {
                          text: "Write a poem about space",
                          icon: <MdOutlineHistoryEdu size={18} className="text-purple-400" />,
                          label: "Creative"
                        },
                        {
                          text: "Write a React hook for fetch",
                          icon: <MdOutlineCode size={18} className="text-blue-400" />,
                          label: "Code"
                        },
                        {
                          text: "Analyze this idea: Local-first AI",
                          icon: <MdOutlineLightbulb size={18} className="text-yellow-400" />,
                          label: "Strategy"
                        }
                      ].map((suggestion, index) => (
                        <motion.button
                          key={suggestion.text}
                          whileHover={{ scale: 1.02, backgroundColor: "rgba(40, 41, 42, 0.8)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateInput(suggestion.text)}
                          className="group p-4 bg-[#1e1f20]/50 backdrop-blur-md rounded-2xl text-left transition-all border border-[#28292a] hover:border-[#3c4043] flex flex-col gap-2 relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-1.5 bg-[#131314] rounded-lg border border-[#28292a] group-hover:border-primary/30 transition-colors">
                              {suggestion.icon}
                            </div>
                            <span className="text-[9px] uppercase tracking-widest text-[#5f6368] font-bold group-hover:text-primary transition-colors">
                              {suggestion.label}
                            </span>
                          </div>
                          <span className="text-[13px] font-medium text-[#e3e3e3] group-hover:text-white transition-colors">
                            {suggestion.text}
                          </span>
                          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MdOutlineAutoAwesome size={12} className="text-primary/50" />
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                ) : (
                  activeChat?.messages.map((msg, idx) => (
                    <ChatMessage
                      key={msg.id}
                      msg={msg}
                      activeChatId={activeChatId}
                      generatingChatId={generatingChatId}
                      isLoading={isLoading}
                      isLast={idx === activeChat.messages.length - 1}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-5 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent">
              <div className="max-w-4xl mx-auto relative">
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
                            className="w-1.5 h-1.5 bg-primary rounded-full"
                          />
                          <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            className="w-1.5 h-1.5 bg-primary rounded-full"
                          />
                          <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                            className="w-1.5 h-1.5 bg-primary rounded-full"
                          />
                        </div>
                        <span className="text-[11px] font-medium text-[#9aa0a6]">Gemma 4 is thinking...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="absolute bottom-full left-0 right-0 mb-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-xs rounded-lg flex items-center gap-2 z-20">
                    <MdOutlineClose size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="flex flex-col bg-[#1e1f20] rounded-2xl border border-[#28292a] focus-within:border-[#3c4043] transition-all shadow-lg overflow-hidden">
                  <div className="px-4 pt-2">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      disabled={isLoading}
                      onChange={(e) => updateInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={isLoading ? "Gemma 4 is generating..." : "Message Gemma 4..."}
                      maxLength={inputCharLimit}
                      className="w-full bg-transparent py-4 resize-none focus:outline-none text-sm max-h-[160px] overflow-y-auto custom-scrollbar disabled:opacity-50 disabled:cursor-not-allowed"
                      rows={1}
                    />
                  </div>

                  <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsReasoningEnabled(!isReasoningEnabled)}
                        disabled={isLoading}
                        className={cn(
                          "p-1.5 rounded-lg transition-all duration-300 relative group flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                          isReasoningEnabled
                            ? "text-primary bg-primary/10 border border-primary/20"
                            : "text-[#5f6368] hover:text-[#9aa0a6] hover:bg-[#28292a] border border-transparent"
                        )}
                      >
                        <MdOutlineLightbulb size={18} />
                        <span className="text-[12px] font-medium pr-1">
                          {isReasoningEnabled ? "Thinking On" : "Thinking Off"}
                        </span>
                        {isReasoningEnabled && (
                          <motion.div
                            layoutId="input-glow"
                            className="absolute inset-0 bg-primary/10 blur-sm rounded-lg -z-10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <AnimatePresence>
                        {input.length > 3000 && (
                          <motion.div
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 5 }}
                            className={cn(
                              "text-[10px] font-bold tracking-tighter tabular-nums px-1.5 py-0.5 rounded-md border transition-colors",
                              input.length >= inputCharLimit
                                ? "bg-red-500/10 border-red-500/30 text-red-500"
                                : "bg-zinc-800/50 border-zinc-700/50 text-[#5f6368]"
                            )}
                          >
                            {input.length.toLocaleString()}/{inputCharLimit.toLocaleString()}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={isLoading ? handleStopGeneration : handleSendMessage}
                        disabled={!isLoading && !input.trim()}
                        className={cn(
                          "p-2 rounded-xl transition-all shrink-0",
                          isLoading
                            ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20"
                            : input.trim()
                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                            : "text-[#5f6368] cursor-not-allowed"
                        )}
                      >
                        {isLoading ? <MdStop size={22} /> : <MdSend size={22} />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-center text-[#5f6368] leading-relaxed max-w-lg mx-auto">
                  This demo is not created, endorsed, or affiliated with Google or Google DeepMind.
                  <br />
                  Gemma may display inaccurate info, so double-check its responses.
                  <span className="ml-1 font-medium text-primary/80">Running 100% on-device.</span>
                </p>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
