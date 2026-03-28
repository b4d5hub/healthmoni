import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, X, Trash2, MessageCircle, Plus, ChevronLeft, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDevice } from '@/lib/device-context';
import { useAuth } from '@/lib/auth-context';
import { streamFromEdgeFunction } from '@/lib/ai-stream';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

function buildVitalsContext(readings: ReturnType<typeof useDevice>['readings'], latestReading: ReturnType<typeof useDevice>['latestReading']) {
  if (!latestReading) return 'No vitals data available. Device not paired.';
  const last10 = readings.slice(-10);
  const avgHr = Math.round(last10.reduce((a, r) => a + r.heartRate, 0) / last10.length);
  const avgTemp = (last10.reduce((a, r) => a + r.temperature, 0) / last10.length).toFixed(1);
  const avgHrv = Math.round(last10.reduce((a, r) => a + r.hrv, 0) / last10.length);
  return `Latest reading: HR ${latestReading.heartRate} BPM, Temp ${latestReading.temperature}°C, HRV ${latestReading.hrv}ms. Recent averages (last 10): HR ${avgHr} BPM, Temp ${avgTemp}°C, HRV ${avgHrv}ms.`;
}

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const { readings, latestReading } = useDevice();
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('chat_messages')
      .select('conversation_id, role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }
    if (!data) return;
    const rows = data as any[];
    // Group by conversation_id, get first user message as title & latest message
    const convMap = new Map<string, { title: string; lastMessage: string; updatedAt: string }>();
    // Process in reverse (oldest first) to get first user msg as title
    const sorted = [...rows].reverse();
    for (const row of sorted) {
      const existing = convMap.get(row.conversation_id);
      if (!existing) {
        convMap.set(row.conversation_id, {
          title: row.role === 'user' ? truncate(row.content, 50) : 'New chat',
          lastMessage: row.content,
          updatedAt: row.created_at,
        });
      } else {
        // Update title if we find first user message
        if (existing.title === 'New chat' && row.role === 'user') {
          existing.title = truncate(row.content, 50);
        }
        existing.lastMessage = row.content;
        existing.updatedAt = row.created_at;
      }
    }
    const convs: Conversation[] = Array.from(convMap.entries()).map(([id, c]) => ({
      id,
      title: c.title,
      lastMessage: truncate(c.lastMessage, 60),
      updatedAt: c.updatedAt,
    }));
    // Sort by most recent
    convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setConversations(convs);
  }, [user?.id]);

  // Load most recent conversation on mount
  useEffect(() => {
    if (!user?.id || historyLoaded) return;
    (async () => {
      await loadConversations();
      // Load most recent conversation
      const { data } = await supabase
        .from('chat_messages' as any)
        .select('conversation_id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const latestConvId = (data as any[])[0].conversation_id;
        await loadConversation(latestConvId);
      }
      setHistoryLoaded(true);
    })();
  }, [user?.id, historyLoaded]);

  const loadConversation = async (convId: string) => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('chat_messages' as any)
      .select('role, content')
      .eq('user_id', user.id)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) {
      setMessages((data as any[]).map((r: any) => ({ role: r.role, content: r.content })));
      setConversationId(convId);
    }
    setView('chat');
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current?.scrollHeight, behavior: 'instant' }), 100);
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  const saveMessage = async (role: string, content: string, convId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        conversation_id: convId as any, // Using any because of UUID vs string type mismatch in build
        role: role as any,
        content,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save message to Supabase:', err);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setView('chat');
  };

  const deleteConversation = async (convId: string) => {
    if (!user?.id) return;
    await supabase.from('chat_messages' as any).delete().eq('user_id', user.id).eq('conversation_id', convId);
    if (conversationId === convId) {
      setMessages([]);
      setConversationId(null);
    }
    await loadConversations();
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const convId = conversationId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Array.from({length:32},()=>Math.floor(Math.random()*16).toString(16)).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5'));
    if (!conversationId) setConversationId(convId);

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    console.log('Saving user message...');
    await saveMessage('user', userMsg.content, convId);

    let assistantContent = '';
    console.log('Requesting AI response...');
    await streamFromEdgeFunction({
      functionName: 'chat',
      body: { 
        messages: newMessages.map(m => ({ role: m.role, content: m.content })), 
        vitalsContext: buildVitalsContext(readings, latestReading) 
      },
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
        scrollToBottom();
      },
      onDone: async () => {
        setIsLoading(false);
        if (assistantContent) {
          console.log('Saving assistant response...');
          await saveMessage('assistant', assistantContent, convId);
          loadConversations();
        }
      },
      onError: (error) => { 
        setIsLoading(false); 
        console.error('Stream error:', error);
        toast({ 
          title: 'AI Error', 
          description: error.includes('404') ? 'Edge Function "chat" not found. Please deploy your functions.' : error, 
          variant: 'destructive' 
        }); 
      },
    });
  }, [input, messages, isLoading, readings, latestReading, toast, conversationId, loadConversations]);

  const suggestions = ["How's my heart rate?", "Is my HRV healthy?", "Tips for wellness"];

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-elevated lg:bottom-6 lg:right-6"
          >
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-3 z-[60] flex w-[calc(100vw-1.5rem)] max-w-md flex-col rounded-2xl border border-border bg-card shadow-elevated lg:bottom-6 lg:right-6"
            style={{ height: 'min(520px, calc(100vh - 8rem))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                {view === 'history' ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setView('chat')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {view === 'history' ? 'Conversations' : 'Health AI'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {view === 'history' ? `${conversations.length} conversations` : 'Vitals-aware assistant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {view === 'chat' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      title="Conversation history"
                      onClick={() => { loadConversations(); setView('history'); }}
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      title="New conversation"
                      onClick={startNewConversation}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {view === 'history' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    title="New conversation"
                    onClick={startNewConversation}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {view === 'history' ? (
              /* Conversation List */
              <ScrollArea className="flex-1">
                {conversations.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                      <MessageCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <Button variant="outline" size="sm" onClick={startNewConversation} className="text-xs">
                      <Plus className="mr-1.5 h-3 w-3" /> Start a chat
                    </Button>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group flex items-start gap-2 rounded-lg p-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                          conv.id === conversationId ? 'bg-primary/5 border border-primary/20' : ''
                        }`}
                        onClick={() => loadConversation(conv.id)}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{conv.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-1">
                            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            ) : (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Hi {user?.name} 👋</p>
                      <p className="text-xs text-muted-foreground">Ask me anything about your health data.</p>
                      <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                        {suggestions.map((s) => (
                          <button key={s} onClick={() => setInput(s)} className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Bot className="h-3 w-3" />
                          </div>
                        )}
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-xs max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground [&_p]:text-xs [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p>{msg.content}</p>
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/20 text-secondary">
                            <User className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Bot className="h-3 w-3" />
                      </div>
                      <div className="rounded-xl bg-muted/50 px-3 py-2">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-border p-3 flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Ask about your health..."
                    className="min-h-[36px] max-h-[80px] resize-none rounded-lg text-xs"
                    rows={1}
                  />
                  <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" className="h-9 w-9 shrink-0 rounded-lg">
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
