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
  Maximize2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { swalBase } from '../services/alerts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Professional Markdown & Table Renderer for CampusNexus AI
 * Parses tables (even with blank line gaps), headers, lists, code, and inline status badges.
 */
function isTableRow(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('|') || trimmed.endsWith('|')) return true;
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  return pipeCount >= 2;
}

function isSeparatorRow(line) {
  const trimmed = line.trim();
  return /^\|?\s*:?-{2,}:?\s*(\|?\s*:?-{2,}:?\s*)+\|?$/.test(trimmed);
}

function isTableCandidate(line, idx, allLines) {
  if (!isTableRow(line)) return false;
  for (let k = idx + 1; k < Math.min(idx + 4, allLines.length); k++) {
    const nextTrimmed = allLines[k].trim();
    if (!nextTrimmed) continue;
    if (isSeparatorRow(nextTrimmed)) return true;
    break;
  }
  return false;
}

function parseTable(lines) {
  if (!lines || lines.length < 2) return null;

  const splitRow = (rowStr) => {
    let s = rowStr.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  };

  const headerCells = splitRow(lines[0]);
  let sepIdx = 1;
  while (sepIdx < lines.length && !isSeparatorRow(lines[sepIdx])) {
    sepIdx++;
  }
  if (sepIdx >= lines.length) return null;

  const sepCells = splitRow(lines[sepIdx]);
  const alignments = sepCells.map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });

  const rows = [];
  for (let r = sepIdx + 1; r < lines.length; r++) {
    const rawRow = lines[r];
    if (isSeparatorRow(rawRow)) continue;
    const cells = splitRow(rawRow);
    if (cells.some((c) => c.length > 0)) {
      rows.push(cells);
    }
  }

  return {
    type: 'table',
    headers: headerCells,
    alignments,
    rows,
  };
}

function parseMarkdownBlocks(text) {
  if (!text) return [];
  const normalized = text.replace(/\r\n/g, '\n');
  const rawLines = normalized.split('\n');
  const blocks = [];
  let i = 0;

  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code_block', lang, content: codeLines.join('\n') });
      continue;
    }

    // Table candidate
    if (isTableCandidate(rawLine, i, rawLines)) {
      const tableLines = [];
      while (i < rawLines.length) {
        const cur = rawLines[i].trim();
        if (!cur) {
          let nextNonEmpty = -1;
          for (let k = i + 1; k < rawLines.length; k++) {
            if (rawLines[k].trim()) {
              nextNonEmpty = k;
              break;
            }
          }
          if (nextNonEmpty !== -1 && isTableRow(rawLines[nextNonEmpty])) {
            i++;
            continue;
          } else {
            break;
          }
        }
        if (isTableRow(cur)) {
          tableLines.push(cur);
          i++;
        } else {
          break;
        }
      }

      if (tableLines.length >= 2) {
        const parsedTable = parseTable(tableLines);
        if (parsedTable) {
          blocks.push(parsedTable);
          continue;
        }
      }
    }

    // Headers
    if (trimmed.startsWith('#### ')) { blocks.push({ type: 'h4', text: trimmed.slice(5) }); i++; continue; }
    if (trimmed.startsWith('### ')) { blocks.push({ type: 'h3', text: trimmed.slice(4) }); i++; continue; }
    if (trimmed.startsWith('## ')) { blocks.push({ type: 'h2', text: trimmed.slice(3) }); i++; continue; }
    if (trimmed.startsWith('# ')) { blocks.push({ type: 'h1', text: trimmed.slice(2) }); i++; continue; }

    // Emoji section header (e.g. 🛠️ Projects & Certifications, 📝 Application & Interview Insights)
    if (/^\p{Extended_Pictographic}/u.test(trimmed) && trimmed.length < 80 && !trimmed.endsWith('.')) {
      blocks.push({ type: 'section_header', text: trimmed });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines = [trimmed.replace(/^>\s*/, '')];
      i++;
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    // Bullet lists (including lone bullet on its own line)
    if (trimmed === '•' || trimmed === '-' || trimmed === '*') {
      let nextLine = '';
      i++;
      while (i < rawLines.length && !rawLines[i].trim()) i++;
      if (i < rawLines.length) {
        nextLine = rawLines[i].trim();
        i++;
      }
      if (nextLine) blocks.push({ type: 'bullet', text: nextLine });
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ') || trimmed.startsWith('+ ')) {
      blocks.push({ type: 'bullet', text: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push({ type: 'numbered', num: numMatch[1], text: numMatch[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'p', text: rawLine });
    i++;
  }

  return blocks;
}

function renderTableCellContent(val) {
  if (!val) return '—';
  const clean = val.trim();
  const lower = clean.toLowerCase();

  // Highlight level badges
  if (lower === 'expert') {
    return <span className="cc-ai-pill pill-expert"><Award size={12} /> Expert</span>;
  }
  if (lower === 'advanced') {
    return <span className="cc-ai-pill pill-advanced"><Zap size={12} /> Advanced</span>;
  }
  if (lower === 'intermediate') {
    return <span className="cc-ai-pill pill-intermediate"><TrendingUp size={12} /> Intermediate</span>;
  }
  if (lower === 'beginner') {
    return <span className="cc-ai-pill pill-beginner"><AlertCircle size={12} /> Beginner</span>;
  }

  return formatInline(clean);
}

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
    const boldParts = part.split(/(\**[^*]+\**)/g);
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

        if (typeof iPart === 'string') {
          // Highlight callouts like 🌟 Strength:, ⚠️ Critical Gap:, ⚠️ Gap:, Priority Action:, Recommendation:
          const tagRegex = /(🌟\s*Strength:|⚠️\s*Critical Gap:|⚠️\s*Gap:|Priority Action:|Recommendation:)/g;
          const tagParts = iPart.split(tagRegex);
          if (tagParts.length > 1) {
            return tagParts.map((tp, tpIdx) => {
              if (/^🌟\s*Strength:/.test(tp)) {
                return <span key={`tag-${tpIdx}`} className="cc-ai-tag tag-strength">{tp}</span>;
              }
              if (/^⚠️\s*Critical Gap:/.test(tp)) {
                return <span key={`tag-${tpIdx}`} className="cc-ai-tag tag-critical">{tp}</span>;
              }
              if (/^⚠️\s*Gap:/.test(tp)) {
                return <span key={`tag-${tpIdx}`} className="cc-ai-tag tag-gap">{tp}</span>;
              }
              if (/^Priority Action:/.test(tp) || /^Recommendation:/.test(tp)) {
                return <span key={`tag-${tpIdx}`} className="cc-ai-tag tag-action">{tp}</span>;
              }
              return tp;
            });
          }
        }

        return iPart;
      });
    });
  });
}

function MarkdownRenderer({ content }) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="cc-ai-markdown-content">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'table':
            return (
              <div key={idx} className="cc-ai-table-wrap">
                <table className="cc-ai-table">
                  <thead>
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx} style={{ textAlign: block.alignments[hIdx] || 'left' }}>
                          {formatInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {block.headers.map((_, cIdx) => {
                          const cellVal = row[cIdx] || '';
                          return (
                            <td key={cIdx} style={{ textAlign: block.alignments[cIdx] || 'left' }}>
                              {renderTableCellContent(cellVal)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'code_block':
            return (
              <div key={idx} className="cc-ai-code-block mb-2">
                {block.lang && <div className="cc-ai-code-lang">{block.lang}</div>}
                <pre><code>{block.content}</code></pre>
              </div>
            );

          case 'section_header':
            return (
              <div key={idx} className="cc-ai-section-head">
                {formatInline(block.text)}
              </div>
            );

          case 'h1':
            return <h5 key={idx} style={{ fontWeight: 750, margin: '12px 0 6px', fontSize: '1rem', color: 'var(--cc-dark, #0f172a)' }}>{formatInline(block.text)}</h5>;
          case 'h2':
            return <h5 key={idx} style={{ fontWeight: 750, margin: '10px 0 5px', fontSize: '0.95rem', color: 'var(--cc-dark, #0f172a)' }}>{formatInline(block.text)}</h5>;
          case 'h3':
            return <h6 key={idx} style={{ fontWeight: 700, margin: '8px 0 4px', fontSize: '0.9rem', color: 'var(--cc-dark, #0f172a)' }}>{formatInline(block.text)}</h6>;
          case 'h4':
            return <h6 key={idx} style={{ fontWeight: 700, margin: '6px 0 3px', fontSize: '0.85rem', color: 'var(--cc-dark, #0f172a)' }}>{formatInline(block.text)}</h6>;

          case 'bullet':
            return (
              <div key={idx} style={{ display: 'flex', gap: '6px', margin: '3px 0', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--cc-primary, #4f46e5)', fontSize: '0.95rem', lineHeight: 1 }}>•</span>
                <span style={{ flex: 1, fontSize: '0.86rem', lineHeight: 1.5 }}>{formatInline(block.text)}</span>
              </div>
            );

          case 'numbered':
            return (
              <div key={idx} style={{ display: 'flex', gap: '6px', margin: '3px 0', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--cc-primary, #4f46e5)', fontWeight: 700, fontSize: '0.78rem' }}>
                  {block.num}.
                </span>
                <span style={{ flex: 1, fontSize: '0.86rem', lineHeight: 1.5 }}>{formatInline(block.text)}</span>
              </div>
            );

          case 'quote':
            return (
              <blockquote key={idx} className="cc-ai-quote">
                {formatInline(block.text)}
              </blockquote>
            );

          case 'hr':
            return <hr key={idx} style={{ margin: '8px 0', borderColor: 'var(--cc-border, #e2e8f0)' }} />;

          case 'p':
          default:
            return (
              <p key={idx} style={{ margin: '0 0 6px', fontSize: '0.86rem', lineHeight: 1.55 }}>
                {formatInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
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
            `Hello, ${studentFirstName}! 👋 I'm your CampusNexus AI Assistant. I can help you understand your profile, skills, job opportunities, applications, and placement progress. What would you like to know today?`;

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
              text: `Hello, ${studentFirstName}! 👋 I'm your CampusNexus AI Assistant. I can help you explore jobs, track applications, analyze your skills, and guide your placement journey. What would you like to check today?`,
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
        'I ran into an issue connecting with the CampusNexus AI service. Please try again in a moment.';

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
    const result = await Swal.fire(swalBase({
      title: 'Start a new conversation?',
      text: 'This will reset the current chat session and load a fresh prompt.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset',
      cancelButtonText: 'Keep chatting',
      confirmButtonColor: '#4F46E5',
    }));

    if (result.isConfirmed) {
      const welcome = overview?.welcomeMessage ||
        `Hello, ${studentFirstName}! 👋 I'm your CampusNexus AI Assistant. How can I help with your placements today?`;

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
        className={`cc-ai-launcher ${open && !minimized ? 'is-chat-open' : ''}`}
        onClick={() => {
          setOpen((prev) => !prev);
          setMinimized(false);
        }}
        aria-label="Open CampusNexus AI Assistant"
        title="CampusNexus AI Assistant"
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
            aria-label="CampusNexus AI Assistant Window"
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
            <div
              className={`cc-ai-header ${minimized ? 'is-minimized' : ''}`}
              onClick={minimized ? () => setMinimized(false) : undefined}
              role={minimized ? 'button' : undefined}
              tabIndex={minimized ? 0 : undefined}
              title={minimized ? 'Click to expand chat' : undefined}
            >
              <div className="d-flex align-items-center gap-2 min-w-0">
                <div className="cc-ai-avatar-badge">
                  <Bot size={22} />
                  <span className="cc-ai-status-dot" title="Available" />
                </div>
                <div className="cc-ai-head-titles">
                  <h6 className="cc-ai-head-title">
                    CampusNexus AI
                    <span className="cc-ai-online-pill">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                      Active
                    </span>
                  </h6>
                  <span className="cc-ai-head-sub">
                    {minimized ? 'Tap anywhere to expand' : 'Personalized Student Assistant'}
                  </span>
                </div>
              </div>

              <div className="cc-ai-actions" onClick={(e) => e.stopPropagation()}>
                {/* Clear / New Chat */}
                {!minimized && (
                  <button
                    type="button"
                    className="cc-ai-btn-icon"
                    onClick={handleClearChat}
                    title="New conversation"
                    aria-label="New conversation"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}

                {/* Minimize / Expand */}
                <button
                  type="button"
                  className="cc-ai-btn-icon"
                  onClick={() => setMinimized((prev) => !prev)}
                  title={minimized ? 'Expand' : 'Minimize'}
                  aria-label={minimized ? 'Expand' : 'Minimize'}
                >
                  {minimized ? <Maximize2 size={15} /> : <Minus size={15} />}
                </button>

                {/* Close */}
                <button
                  type="button"
                  className="cc-ai-btn-icon"
                  onClick={() => {
                    setOpen(false);
                    setMinimized(false);
                  }}
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
                        <div className="cc-ai-msg-avatar bot" title="CampusNexus AI">
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
                      placeholder={`Ask CampusNexus AI, ${studentFirstName}…`}
                      disabled={busy}
                      aria-label="Message CampusNexus AI Assistant"
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
                    <Sparkles size={11} /> Grounded in your verified CampusNexus academic & placement records
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
