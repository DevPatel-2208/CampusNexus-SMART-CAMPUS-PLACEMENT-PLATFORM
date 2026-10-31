import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Bot,
  Send,
  X,
  Minus,
  RotateCcw,
  User,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Award,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Lightweight, robust markdown text formatter
 * Parses bold, italics, inline code, bullet lists, numbered lists, and headers safely.
 */
function MarkdownRenderer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="cc-ai-markdown-content">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} style={{ height: '6px' }} />;
        }

        // Header ###
        if (trimmed.startsWith('### ')) {
          return (
            <h6 key={idx} style={{ fontWeight: 700, margin: '8px 0 4px', fontSize: '0.9rem' }}>
              {formatInline(trimmed.slice(4))}
            </h6>
          );
        }
        // Header ##
        if (trimmed.startsWith('## ')) {
          return (
            <h5 key={idx} style={{ fontWeight: 700, margin: '10px 0 4px', fontSize: '0.95rem' }}>
              {formatInline(trimmed.slice(3))}
            </h5>
          );
        }
        // Header #
        if (trimmed.startsWith('# ')) {
          return (
            <h5 key={idx} style={{ fontWeight: 700, margin: '12px 0 6px', fontSize: '1rem' }}>
              {formatInline(trimmed.slice(2))}
            </h5>
          );
        }

        // Bullet point: - or * or •
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '6px', margin: '3px 0', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--cc-primary)', fontSize: '1rem', lineHeight: 1 }}>•</span>
              <span style={{ flex: 1 }}>{formatInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list: 1. 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '6px', margin: '3px 0', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--cc-primary)', fontWeight: 600, fontSize: '0.78rem' }}>
                {numMatch[1]}.
              </span>
              <span style={{ flex: 1 }}>{formatInline(numMatch[2])}</span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} style={{ margin: '0 0 5px' }}>
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses bold (**text**), italics (*text*), and inline code (`code`)
 */
function formatInline(text) {
  if (!text) return '';

  // Split tokens by code `...`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={pIdx}>
          {part.slice(1, -1)}
        </code>
      );
    }

    // Split tokens by bold **...**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return <strong key={`${pIdx}-${bIdx}`}>{bPart.slice(2, -2)}</strong>;
      }

      // Split tokens by italics *...*
      const italicParts = bPart.split(/(\*[^*]+\*)/g);
      return italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith('*') && iPart.endsWith('*') && !iPart.startsWith('**')) {
          return <em key={`${pIdx}-${bIdx}-${iIdx}`}>{iPart.slice(1, -1)}</em>;
        }
        return iPart;
      });
    });
  });
}

export function AiWidget() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [overview, setOverview] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Derive first name safely from user context
  const studentFirstName = useMemo(() => {
    if (user?.name) {
      return user.name.trim().split(' ')[0];
    }
    return 'Student';
  }, [user]);

  const isStudent = user?.role === 'student' && !pathname.startsWith('/student/exam/');

  // Load student-specific AI overview on initial mount or student login
  useEffect(() => {
    if (!isStudent || !user?._id) return;
    let isMounted = true;

    async function loadOverview() {
      try {
        const { data } = await api.get('/student/chat/overview');
        if (isMounted && data?.data) {
          setOverview(data.data);
          // Set personalized welcome message
          const welcome = data.data.welcomeMessage ||
            `Hello, ${studentFirstName}! 👋 I'm your CareerConnect AI Assistant. I can help you understand your profile, skills, job opportunities, applications, and placement progress. What would you like to know today?`;

          setMsgs([
            {
              id: 'welcome-init',
              from: 'bot',
              text: welcome,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (err) {
        // Fallback default message using client auth
        if (isMounted) {
          setMsgs([
            {
              id: 'welcome-fallback',
              from: 'bot',
              text: `Hello, ${studentFirstName}! 👋 I'm your CareerConnect AI Assistant. I can help you explore jobs, track applications, analyze your skills, and guide your placement journey. What would you like to check today?`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }
    }

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, [isStudent, user?._id, studentFirstName]);

  // Scroll to bottom smoothly when new messages arrive
  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs, busy, open, minimized]);

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [open, minimized]);

  // Send message to personalized AI assistant
  const sendMessage = async (overrideText) => {
    const textToSend = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!textToSend || busy) return;

    const userMsgId = `user-${Date.now()}`;
    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const newMessages = [
      ...msgs,
      {
        id: userMsgId,
        from: 'me',
        text: textToSend,
        time: userTimestamp,
      },
    ];

    setMsgs(newMessages);
    setInput('');
    setBusy(true);
    setHasInteracted(true);

    try {
      // Build conversation history for multi-turn understanding
      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.from === 'me' ? 'user' : 'assistant',
        content: m.text,
      }));

      const { data } = await api.post('/student/chat', {
        message: textToSend,
        history: historyPayload,
      });

      const reply = data?.data?.reply || "I've reviewed your request, but could not produce a response. Please try again.";
      const botTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMsgs((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          from: 'bot',
          text: reply,
          time: botTimestamp,
          contextType: data?.data?.contextType,
        },
      ]);
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        'I ran into an issue connecting with the CareerConnect AI service. Please try again in a moment.';

      setMsgs((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          from: 'bot',
          text: `⚠️ **Unable to complete request:** ${errorMessage}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear conversation with confirmation
  const handleClearChat = async () => {
    const result = await Swal.fire({
      title: 'Start a new conversation?',
      text: 'This will reset the current chat session and load a fresh prompt.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset',
      cancelButtonText: 'Keep chatting',
      confirmButtonColor: '#4F46E5',
    });

    if (result.isConfirmed) {
      const welcome = overview?.welcomeMessage ||
        `Hello, ${studentFirstName}! 👋 I'm your CareerConnect AI Assistant. How can I help with your placements today?`;

      setMsgs([
        {
          id: `welcome-${Date.now()}`,
          from: 'bot',
          text: welcome,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setHasInteracted(false);
    }
  };

  const defaultSuggestions = [
    { id: 'profile', text: '📊 Analyze My Profile' },
    { id: 'jobs', text: '💼 My Recommended Jobs' },
    { id: 'applications', text: '📝 Check My Applications' },
    { id: 'skills', text: '⚡ Analyze My Skills' },
    { id: 'placement', text: '🎯 My Placement Progress' },
    { id: 'guidance', text: '🚀 Career Guidance' },
  ];

  const suggestions = overview?.suggestions || defaultSuggestions;

  if (!isStudent) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button Launcher */}
      <motion.button
        className="cc-ai-launcher"
        onClick={() => {
          setOpen((prev) => !prev);
          setMinimized(false);
        }}
        aria-label="Open CareerConnect AI Assistant"
        title="CareerConnect AI Assistant"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <span className="cc-ai-launcher-pulse" aria-hidden="true" />
        <span className="cc-ai-badge-live" title="AI Assistant Online" />
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close-icon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={26} />
            </motion.span>
          ) : (
            <motion.span
              key="sparkle-icon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Sparkles size={26} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Floating Chatbot Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={`cc-ai-window ${minimized ? 'cc-ai-minimized' : ''}`}
            role="dialog"
            aria-label="CareerConnect AI Assistant Window"
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: minimized ? '64px' : undefined,
            }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="cc-ai-header">
              <div className="d-flex align-items-center gap-2">
                <div className="cc-ai-avatar-badge">
                  <Bot size={22} />
                  <span className="cc-ai-status-dot" title="Available" />
                </div>
                <div className="cc-ai-head-titles">
                  <h6 className="cc-ai-head-title">
                    CareerConnect AI
                    <span className="cc-ai-online-pill">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                      Active
                    </span>
                  </h6>
                  <span className="cc-ai-head-sub">Personalized Student Assistant</span>
                </div>
              </div>

              <div className="cc-ai-actions">
                {/* Clear / New Chat */}
                <button
                  type="button"
                  className="cc-ai-btn-icon"
                  onClick={handleClearChat}
                  title="New conversation"
                  aria-label="New conversation"
                >
                  <RotateCcw size={15} />
                </button>

                {/* Minimize */}
                <button
                  type="button"
                  className="cc-ai-btn-icon"
                  onClick={() => setMinimized((prev) => !prev)}
                  title={minimized ? 'Expand' : 'Minimize'}
                  aria-label={minimized ? 'Expand' : 'Minimize'}
                >
                  <Minus size={15} />
                </button>

                {/* Close */}
                <button
                  type="button"
                  className="cc-ai-btn-icon"
                  onClick={() => setOpen(false)}
                  title="Close"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Main Conversation Body */}
            {!minimized && (
              <>
                <div className="cc-ai-body">
                  {/* Student Welcome & Quick Actions Card (when conversation is fresh) */}
                  {!hasInteracted && overview?.stats && (
                    <motion.div
                      className="cc-ai-welcome-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="cc-ai-welcome-head">
                        <span className="cc-ai-welcome-badge">
                          <Sparkles size={12} /> Student Dashboard AI
                        </span>
                        {overview.profile?.cgpa && (
                          <span className="badge bg-light text-dark border">
                            CGPA: {overview.profile.cgpa}
                          </span>
                        )}
                      </div>
                      <p className="cc-ai-welcome-desc">
                        Connected to your student profile <b>({studentFirstName})</b>. Click a quick action below or type any question:
                      </p>

                      <div className="cc-ai-chips-label">Suggested Inquiries:</div>
                      <div className="cc-ai-chips">
                        {suggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="cc-ai-chip"
                            onClick={() => sendMessage(item.text.replace(/^[^\w\s]+\s*/, ''))}
                          >
                            {item.text}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Message Stream */}
                  {msgs.map((msg) => (
                    <div
                      key={msg.id}
                      className={`cc-ai-msg-row ${msg.from === 'me' ? 'student' : 'bot'}`}
                    >
                      {msg.from === 'bot' && (
                        <div className="cc-ai-msg-avatar bot" title="CareerConnect AI">
                          <Bot size={17} />
                        </div>
                      )}

                      <div className="cc-ai-bubble">
                        <MarkdownRenderer content={msg.text} />
                        <span className="cc-ai-time">{msg.time}</span>
                      </div>

                      {msg.from === 'me' && (
                        <div className="cc-ai-msg-avatar student" title={user?.name || 'You'}>
                          {studentFirstName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Animated Typing Indicator */}
                  {busy && (
                    <motion.div
                      className="cc-ai-msg-row bot"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="cc-ai-msg-avatar bot">
                        <Bot size={17} />
                      </div>
                      <div className="cc-ai-typing">
                        <span className="cc-ai-typing-dot" />
                        <span className="cc-ai-typing-dot" />
                        <span className="cc-ai-typing-dot" />
                        <span className="cc-ai-typing-text">Analyzing your records…</span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Composer Area */}
                <div className="cc-ai-composer">
                  <div className="cc-ai-composer-row">
                    <textarea
                      ref={inputRef}
                      className="cc-ai-input"
                      rows={1}
                      maxLength={1500}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Ask CareerConnect AI, ${studentFirstName}…`}
                      disabled={busy}
                      aria-label="Message CareerConnect AI Assistant"
                    />

                    <motion.button
                      type="button"
                      className="cc-ai-send-btn"
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || busy}
                      whileHover={input.trim() && !busy ? { scale: 1.05 } : {}}
                      whileTap={input.trim() && !busy ? { scale: 0.95 } : {}}
                      title="Send message"
                      aria-label="Send message"
                    >
                      <Send size={16} />
                    </motion.button>
                  </div>

                  <div className="cc-ai-foot-note">
                    <Sparkles size={11} /> Grounded in your verified CareerConnect academic & placement records
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
export default AiWidget;
