import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader, AlertCircle, RefreshCw, CheckCircle2, TrendingUp, Truck, AlertTriangle, BarChart3, Navigation, Clock, Shield, FileText, UserCheck, Route } from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { sendChatMessage, checkAIStatus } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * Formatted Markdown Message Component
 * Cleanly renders markdown text (headers, bolding, bullet points) without raw markdown syntax
 */
const FormattedMessage = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Header: ### Title
        if (trimmed.startsWith('###')) {
          const content = trimmed.replace(/^###\s*/, '');
          return (
            <h3 key={idx} className="text-sm font-bold text-customPrimary tracking-wide mt-2 mb-1">
              {renderBoldText(content)}
            </h3>
          );
        }

        // Bullet point: • Item or - Item
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          const content = trimmed.replace(/^[•\-]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 ml-2 text-customText">
              <span className="text-customPrimary mt-0.5">•</span>
              <span>{renderBoldText(content)}</span>
            </div>
          );
        }

        // Horizontal Rule: ---
        if (trimmed === '---') {
          return <hr key={idx} className="my-2 border-darkBorder" />;
        }

        // Regular Paragraph
        return (
          <p key={idx} className="text-customText">
            {renderBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

function renderBoldText(str) {
  if (!str) return '';
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const AIAssistantPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const role = (user?.role || 'ADMIN').toUpperCase();

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState({ available: true, checking: true, mode: 'operational' });
  const messagesEndRef = useRef(null);

  const driverQuestions = [
    { icon: Truck, text: t('showMyActiveShipment', 'Show my active shipment'), color: "text-customPrimary" },
    { icon: Navigation, text: t('whereIsMyPickup', 'Where is my pickup?'), color: "text-blue-400" },
    { icon: Clock, text: t('whatIsMyEta', 'What is my ETA?'), color: "text-green-400" },
    { icon: Shield, text: t('whichVehicleAssigned', 'Which vehicle is assigned?'), color: "text-purple-400" },
    { icon: AlertTriangle, text: t('showRouteAlerts', 'Show route alerts'), color: "text-customDanger" },
    { icon: Route, text: t('amIOffRoute', 'Am I off route?'), color: "text-orange-400" },
    { icon: BarChart3, text: t('showMyShipmentStatus', 'Show my shipment status'), color: "text-teal-400" }
  ];

  const ngoQuestions = [
    { icon: FileText, text: t('showMyActiveOrders', 'Show my active orders'), color: "text-blue-400" },
    { icon: Truck, text: t('showMyActiveShipments', 'Show my active shipments'), color: "text-customPrimary" },
    { icon: Navigation, text: t('whereIsMyShipment', 'Where is my shipment?'), color: "text-green-400" },
    { icon: Clock, text: t('whatIsTheEta', 'What is the ETA?'), color: "text-purple-400" },
    { icon: UserCheck, text: t('whichDriverAssigned', 'Which driver is assigned?'), color: "text-orange-400" },
    { icon: AlertTriangle, text: t('showMyShipmentAlerts', 'Show my shipment alerts'), color: "text-customDanger" },
    { icon: BarChart3, text: t('showMyDeliveryPerformance', 'Show my delivery performance'), color: "text-teal-400" }
  ];

  const adminQuestions = [
    { icon: Truck, text: t('showDelayedShipments', 'Show delayed shipments'), color: "text-orange-400" },
    { icon: TrendingUp, text: t('whatShipmentsActive', 'What shipments are active?'), color: "text-customPrimary" },
    { icon: BarChart3, text: t('giveTodaySummary', "Give me today's summary"), color: "text-blue-400" },
    { icon: AlertTriangle, text: t('showCriticalAlerts', 'Show critical alerts'), color: "text-customDanger" }
  ];

  const suggestedQuestions = role === 'DRIVER' ? driverQuestions : role === 'NGO' ? ngoQuestions : adminQuestions;

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkStatus = async () => {
    setAiStatus({ available: true, checking: true, mode: 'operational' });
    const status = await checkAIStatus();
    setAiStatus({
      available: status.success ? (status.data?.available ?? true) : true,
      checking: false,
      mode: status.data?.mode || 'operational',
      message: status.data?.message || 'AI Assistant Operational'
    });
  };

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || inputMessage.trim();
    
    if (!textToSend) return;

    setError(null);
    setInputMessage('');

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
      // Send exact message AND conversation history AND preferred language to backend
      const response = await sendChatMessage(textToSend, currentHistory, language);

      if (response.success && response.data?.message) {
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
      const errorMessage = err.response?.data?.message || err.message || 'Error processing request.';
      
      setError({
        type: 'general',
        message: errorMessage
      });

      const errorMsg = {
        id: Date.now() + 1,
        type: 'error',
        text: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
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

  return (
    <div className="h-full flex flex-col bg-darkBg p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 bg-customPrimary/10 border border-customPrimary/30 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-customPrimary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-customText uppercase tracking-tight truncate">
              {role === 'DRIVER' ? t('driverAiAssistant', 'Driver AI Assistant') : role === 'NGO' ? t('ngoAiAssistant', 'NGO AI Assistant') : t('aiLogisticsAssistant', 'AI Logistics Assistant')}
            </h1>
            <p className="text-[10px] sm:text-xs text-customMuted mt-0.5 truncate">
              {t('aiSub', 'Powered by Gemini AI • Real-time Logistics Intelligence')}
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {aiStatus.checking ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-darkCard border border-darkBorder rounded-lg text-xs">
              <Loader className="w-3.5 h-3.5 animate-spin text-customMuted" />
              <span className="text-customMuted">{t('loading', 'Loading...')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-customSuccess/10 border border-customSuccess/30 rounded-lg text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-customSuccess" />
              <span className="text-customSuccess font-semibold">
                {aiStatus.mode === 'gemini' ? t('connectedGemini', 'Connected (Gemini AI)') : t('operationalStatus', 'Operational')}
              </span>
              <button onClick={checkStatus} className="ml-1 hover:text-customText text-customMuted">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Suggested Actions - Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-darkCard border-darkBorder">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-customText">{t('quickActions', 'Quick Actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQuestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(item.text)}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2.5 bg-darkBgSecondary hover:bg-darkBorder/30 disabled:hover:bg-darkBgSecondary border border-darkBorder/40 rounded-lg text-xs text-customText transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span>{item.text}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="bg-darkCard border-darkBorder">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-customText">{t('whatICanDo', 'What I Can Do')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-customMuted">
                <li className="flex items-start gap-2">
                  <span className="text-customPrimary mt-0.5">•</span>
                  <span>{t('ansProjectOperational', 'Answer project & operational questions')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-customPrimary mt-0.5">•</span>
                  <span>{t('analyzeActiveShipments', 'Analyze active shipments and routes')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-customPrimary mt-0.5">•</span>
                  <span>{t('explainDisasterProtocols', 'Explain disaster management protocols')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-customPrimary mt-0.5">•</span>
                  <span>{t('reviewAlertsHazards', 'Review alerts and environmental hazards')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area - Main Content */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col bg-darkCard border-darkBorder min-h-0">
            
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="p-4 bg-customPrimary/10 rounded-full">
                    <Sparkles className="w-12 h-12 text-customPrimary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-customText text-base mb-2">
                      Welcome to {role === 'DRIVER' ? t('driverAiAssistant', 'Driver AI Assistant') : role === 'NGO' ? t('ngoAiAssistant', 'NGO AI Assistant') : t('aiLogisticsAssistant', 'AI Assistant')}
                    </h3>
                    <p className="text-sm text-customMuted max-w-md">
                      {t('askQuestionPlaceholder', 'Ask any question about orders, shipments, tracking...')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded-lg text-sm ${
                          message.type === 'user'
                            ? 'bg-customPrimary text-white font-medium'
                            : message.type === 'error'
                            ? 'bg-customDanger/10 border border-customDanger/30 text-customDanger'
                            : 'bg-darkBgSecondary border border-darkBorder text-customText'
                        }`}
                      >
                        {message.type === 'ai' && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-darkBorder/40">
                            <Sparkles className="w-4 h-4 text-customPrimary" />
                            <span className="text-xs text-customMuted font-semibold">{t('aiAssistant', 'AI Assistant')}</span>
                          </div>
                        )}
                        {message.type === 'ai' ? (
                          <FormattedMessage text={message.text} />
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                        )}
                        <p className="text-[10px] text-customMuted mt-2 opacity-70 text-right">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] p-4 rounded-lg text-sm bg-darkBgSecondary border border-darkBorder">
                        <div className="flex items-center gap-3 text-customMuted text-xs">
                          <Loader className="w-4 h-4 animate-spin text-customPrimary" />
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
              <div className="mx-6 mb-2 p-3 bg-customDanger/10 border border-customDanger/30 rounded-lg text-xs text-customDanger flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{typeof error === 'string' ? error : error.message}</span>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  className="px-2 py-1 bg-customDanger/20 hover:bg-customDanger/30 rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> {t('refresh', 'Retry')}
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-6 border-t border-darkBorder bg-darkBgSecondary/30">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-xs text-customMuted hover:text-customText mb-3 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t('clearConversation', 'Clear conversation')}
                </button>
              )}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('askQuestionPlaceholder', 'Ask any question...')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-darkCard border border-darkBorder rounded-lg text-sm text-customText placeholder-customMuted focus:outline-none focus:border-customPrimary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  variant="primary"
                  className="px-6 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
