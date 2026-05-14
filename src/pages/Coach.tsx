import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addTruthStatement, getTruthStatements } from '@/lib/store';
import { Brain, Send, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEPTH_LABELS = [
  'Surface Level',
  'Going Deeper',
  'Revealing Patterns',
  'Core Values',
  'Deep Identity',
  'Life Purpose',
  'Root Why',
];

import { supabase } from '@/integrations/supabase/client';
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/boundless-coach`;

const CoachPage = () => {
  const navigate = useNavigate();
  const [priority, setPriority] = useState('');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [depth, setDepth] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [truthStatement, setTruthStatement] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const savedTruths = getTruthStatements();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const streamChat = async (allMessages: Message[]) => {
    setIsLoading(true);
    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(err.error || `Error: ${resp.status}`);
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        toast.error('No response stream');
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const snapshot = assistantContent;
              setMessages((prev) =>
                prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m))
              );
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Check for truth statement in the response
      const truthMatch = assistantContent.match(/TRUTH_STATEMENT:\s*"([^"]+)"/);
      if (truthMatch) {
        setTruthStatement(truthMatch[1]);
        setDepth(8);
      } else {
        // Count user messages to determine depth
        const userCount = allMessages.filter((m) => m.role === 'user').length;
        setDepth(Math.min(userCount + 1, 7));
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to connect to AI Coach');
    }

    setIsLoading(false);
  };

  const startSession = async () => {
    if (!priority.trim()) return;
    setStarted(true);
    const initialMessages: Message[] = [
      {
        role: 'user',
        content: `My current priority is: "${priority}". Please begin the 7 Levels of Why exercise with me. This is level 1.`,
      },
    ];
    setMessages([{ role: 'user', content: `My priority: "${priority}"` }]);
    setDepth(1);
    await streamChat(initialMessages);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input };
    setInput('');
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const userCount = updatedMessages.filter((m) => m.role === 'user').length;
    const levelHint = userCount <= 7 ? ` [This is the user's response for level ${userCount} of 7.]` : ' [The user has completed all 7 levels. Generate the TRUTH_STATEMENT now.]';

    const apiMessages = [
      ...updatedMessages.slice(0, -1),
      { role: 'user' as const, content: input + levelHint },
    ];

    await streamChat(apiMessages);
  };

  const saveTruth = () => {
    addTruthStatement({
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      priority,
      levels: messages.filter((m) => m.role === 'user').map((m) => m.content),
      statement: truthStatement,
    });
    setStarted(false);
    setMessages([]);
    setPriority('');
    setDepth(0);
    setTruthStatement('');
    toast.success('Truth Statement saved!');
  };

  const complete = truthStatement.length > 0;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto flex flex-col">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="mb-1">
        <span className="eyebrow">The "So That" Coach</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="h-display text-2xl md:text-3xl">Find your <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">root why</span></h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        AI-guided coaching through 7 levels of depth.
      </p>

      {!started ? (
        <div className="space-y-6">
          <Card className="border-2 rounded-3xl">
            <CardContent className="p-6">
              <p className="text-sm font-semibold mb-3">What is your current priority?</p>
              <Input
                placeholder="e.g. Get promoted at work"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-2xl mb-4"
                onKeyDown={(e) => e.key === 'Enter' && startSession()}
              />
              <Button className="w-full font-bold rounded-2xl" onClick={startSession} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Start Session
              </Button>
            </CardContent>
          </Card>

          {savedTruths.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-3">Your Truth Statements</h2>
              <div className="space-y-3">
                {savedTruths.map((t) => (
                  <Card key={t.id} className="border-2 rounded-3xl bg-primary/5">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t.date} · {t.priority}
                      </p>
                      <p className="text-sm font-semibold italic">"{t.statement}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Depth Indicator */}
          <div className="flex gap-1 mb-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                  i < Math.min(depth, 7) ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center font-semibold mb-4">
            {depth <= 7
              ? `${DEPTH_LABELS[Math.max(depth - 1, 0)]} (${Math.min(depth, 7)}/7)`
              : 'Complete ✨'}
          </p>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto max-h-[55vh] mb-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl text-sm whitespace-pre-line ${
                  m.role === 'assistant'
                    ? 'bg-card border-2 border-border'
                    : 'bg-primary text-primary-foreground ml-8'
                }`}
              >
                {m.role === 'assistant'
                  ? m.content.replace(/TRUTH_STATEMENT:\s*"([^"]+)"/, '🌟 Your Truth Statement:\n\n"$1"')
                  : m.content}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 p-4 bg-card border-2 border-border rounded-2xl text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          {!complete ? (
            <div className="flex gap-2">
              <Input
                placeholder="Answer... so that..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="rounded-2xl flex-1"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="rounded-2xl shrink-0"
                onClick={handleSend}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Button className="w-full font-bold rounded-2xl h-12" onClick={saveTruth}>
              <Sparkles className="h-4 w-4 mr-2" />
              Save Truth Statement
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default CoachPage;
