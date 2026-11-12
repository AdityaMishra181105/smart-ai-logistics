import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader, AlertCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import Button from '../ui/Button';
import { sendChatMessage, checkAIStatus } from '../../services/aiService';
import { useLanguage } from '../../context/LanguageContext';

/**
 * AI Assistant Component
 * 
 * Floating AI chat interface that matches existing dark UI
 * - Uses backend AI service (no exposed API keys)
 * - Real data from database
 * - NO demo responses
 */

const AIAssistant = () => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(true);
  const messagesEndRef = useRef(null);

  // Suggested questions
  const suggestedQuestions = [
    "Show delayed shipments",
    "What shipments are active?",
    "Give me today's summary",
    "Which drivers are active?",
    "Show critical alerts"
  ];

  // Check AI service status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkAIStatus();
      setAiAvailable(status.data?.available || false);
    };
    checkStatus();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || inputMessage.trim();
    
    if (!textToSend) return;

    setError(null);
    setInputMessage('');

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    const currentHistory = [...messages];
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(textToSend, currentHistory, language);

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          text: response.data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.message || 'Failed to get AI response');
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send message. Please try again.');
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        text: err.response?.data?.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question) => {
    handleSendMessage(question);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  if (!isOpen) {
    // Floating AI Button
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-customPrimary hover:bg-customPrimaryHover text-customText rounded-full shadow-lg transition-all duration-200 hover:scale-105 font-semibold text-sm cursor-pointer"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-5 h-5" />
        <span>{t('aiAssistant', 'AI Assistant')}</span>
      </button>
    );
  }

  return (
    <div className={`fixed ${isMinimized ? 'bottom-6 right-6' : 'bottom-6 right-6'} z-50 flex flex-col bg-darkCard border border-darkBorder rounded-lg shadow-2xl transition-all duration-200 ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-darkBorder bg-darkBgSecondary rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-customPrimary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-customPrimary" />
          </div>
          <div>
            <h3 className="font-bold text-customText text-sm">{t('aiAssistant', 'AI Assistant')}</h3>
            {!isMinimized && (
              <p className="text-[10px] text-customMuted">
                {aiAvailable ? t('aiOperational', 'AI Assistant Operational') : 'AI service unavailable'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-darkBorder/30 rounded transition-colors cursor-pointer"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-customMuted" />
            ) : (
              <Minimize2 className="w-4 h-4 text-customMuted" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-darkBorder/30 rounded transition-colors cursor-pointer"
            aria-label="Close AI Assistant"
          >
            <X className="w-4 h-4 text-customMuted" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* AI Unavailable Warning */}
          {!aiAvailable && (
            <div className="mx-4 mt-4 p-3 bg-customWarning/10 border border-customWarning/30 rounded-lg flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-customWarning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-customWarning">AI Service Unavailable</p>
                <p className="text-customMuted text-[10px] mt-0.5">
                  The AI assistant requires Gemini API configuration. Contact your administrator.
                </p>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-darkBgSecondary">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-4 bg-customPrimary/10 rounded-full">
                  <Sparkles className="w-8 h-8 text-customPrimary" />
                </div>
                <div>
                  <h4 className="font-bold text-customText text-sm mb-1">{t('aiAssistant', 'AI Assistant')}</h4>
                  <p className="text-xs text-customMuted max-w-xs">
                    {t('aiGreeting', 'Hello! How can I help you with the Smart Logistics project today?')}
                  </p>
                </div>

                {/* Suggested Questions */}
                {aiAvailable && (
                  <div className="w-full space-y-2">
                    <p className="text-[10px] text-customMuted uppercase font-semibold tracking-wider">
                      Try asking:
                    </p>
                    {suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="w-full text-left px-3 py-2 bg-darkCard hover:bg-darkBorder/30 border border-darkBorder rounded-lg text-xs text-customText transition-colors cursor-pointer"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-xs ${
                        message.type === 'user'
                          ? 'bg-customPrimary text-customText'
                          : message.type === 'error'
                          ? 'bg-customDanger/10 border border-customDanger/30 text-customDanger'
                          : 'bg-darkCard border border-darkBorder text-customText'
                      }`}
                    >
                      {message.type === 'ai' && (
                        <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-darkBorder/40">
                          <Sparkles className="w-3 h-3 text-customPrimary" />
                          <span className="text-[10px] text-customMuted font-semibold">{t('aiAssistant', 'AI Assistant')}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                      <p className="text-[9px] text-customMuted mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-lg text-xs bg-darkCard border border-darkBorder">
                      <div className="flex items-center gap-2 text-customMuted">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>{t('thinking', 'Thinking...')}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-4 mb-2 p-2 bg-customDanger/10 border border-customDanger/30 rounded text-xs text-customDanger flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-darkBorder bg-darkCard rounded-b-lg">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-[10px] text-customMuted hover:text-customText mb-2 transition-colors cursor-pointer"
              >
                {t('clearConversation', 'Clear Conversation')}
              </button>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={aiAvailable ? t('askQuestionPlaceholder', 'Ask any question about orders, shipments, tracking...') : 'AI service unavailable'}
                disabled={!aiAvailable || isLoading}
                className="flex-1 px-3 py-2 bg-darkBgSecondary border border-darkBorder rounded-lg text-xs text-customText placeholder-customMuted focus:outline-none focus:border-customPrimary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!aiAvailable || !inputMessage.trim() || isLoading}
                size="sm"
                variant="primary"
                className="px-3 cursor-pointer"
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
