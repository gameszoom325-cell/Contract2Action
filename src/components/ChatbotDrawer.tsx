import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  Maximize2, 
  Minimize2,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ChatMessage } from '../types/contract.ts';

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({ isOpen, onClose }) => {
  const { activeContract, currentUser } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      content: `Hello! I am your Contract2Action AI Compliance Assistant. I can answer grounded questions about "${activeContract?.title || 'your contract'}", cite specific clauses, or explain task deadlines.

How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isGrounded: true,
    }
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'When is payment due and what are the preconditions?',
    'Which obligations are marked high risk?',
    'What penalties apply if delivery is late?',
    'Show me active tasks assigned to my role',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = textToSend || inputQuestion;
    if (!question.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/contracts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          contractText: activeContract?.fullText || '',
          contractId: activeContract?.id || '',
          userRole: currentUser.role,
        }),
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'assistant',
        content: data.answer || "I couldn't find that in this contract.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || [],
        isGrounded: data.isGrounded !== false,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        content: "I couldn't find that in this contract.\n\n*AI-generated, review before acting. Not legal advice.*",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: false,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        content: `Conversation cleared. Asking questions about "${activeContract?.title || 'contract'}".`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: true,
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed bottom-0 right-0 z-50 transition-all duration-200 ease-out shadow-2xl flex flex-col ${
        isExpanded ? 'top-0 left-0 sm:left-auto sm:w-[680px] w-full h-full' : 'w-full sm:w-[440px] h-[640px] sm:bottom-4 sm:right-4 sm:rounded-3xl'
      } border`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)'
      }}
    >
      {/* Top Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center space-x-2.5">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-xs" style={{ color: 'var(--text)' }}>
                Contract2Action Assistant
              </h3>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                RAG Grounded
              </span>
            </div>
            <p className="text-[10px] truncate max-w-[220px]" style={{ color: 'var(--muted)' }}>
              Active: {activeContract?.title}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors hidden sm:block"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Questions Bar */}
      <div 
        className="px-3.5 py-2 border-b overflow-x-auto flex space-x-1.5 no-scrollbar"
        style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
      >
        {suggestedQuestions.map(q => (
          <button
            key={q}
            onClick={() => handleSendMessage(q)}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all hover:border-accent cursor-pointer shadow-2xs"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs" style={{ backgroundColor: 'var(--background)' }}>
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div 
              key={msg.id}
              className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div 
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                style={{
                  backgroundColor: isUser ? 'var(--surface-raised)' : 'var(--accent)',
                  color: isUser ? 'var(--text)' : 'var(--accent-foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className="space-y-1.5 max-w-[85%]">
                <div 
                  className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    isUser ? 'rounded-tr-xs' : 'rounded-tl-xs border'
                  }`}
                  style={{
                    backgroundColor: isUser ? 'var(--accent)' : 'var(--surface)',
                    color: isUser ? 'var(--accent-foreground)' : 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                >
                  {msg.content}
                </div>

                {/* Grounded Citations if provided */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-muted block">Grounded Sources:</span>
                    {msg.citations.map((cite, i) => (
                      <div 
                        key={i} 
                        className="p-2 rounded-xl border text-[11px] font-mono space-y-0.5"
                        style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
                      >
                        <span className="font-bold text-accent">{cite.clause} (Page {cite.page})</span>
                        <p className="italic text-muted">"{cite.quote}"</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`text-[9px] text-muted ${isUser ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center space-x-2 text-xs text-muted">
            <div className="w-6 h-6 rounded-xl flex items-center justify-center bg-surface border">
              <Bot className="w-3 h-3 text-accent animate-spin" />
            </div>
            <span>Analyzing contract chunks...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mandatory Disclaimer Notice */}
      <div className="px-4 py-1.5 border-t text-[10px] text-center" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
        AI-generated, review before acting. Not legal advice.
      </div>

      {/* Input Field Form */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t flex items-center space-x-2"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <input 
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="Ask a question about this contract..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
        />
        <button
          type="submit"
          disabled={!inputQuestion.trim() || isTyping}
          className="p-2.5 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)',
          }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
