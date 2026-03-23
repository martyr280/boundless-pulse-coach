import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addTruthStatement, getTruthStatements } from '@/lib/store';
import { Brain, Send, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'coach';
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

const CoachPage = () => {
  const navigate = useNavigate();
  const [priority, setPriority] = useState('');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [depth, setDepth] = useState(0);
  const [complete, setComplete] = useState(false);
  const [truthStatement, setTruthStatement] = useState('');

  const savedTruths = getTruthStatements();

  const startSession = () => {
    if (!priority.trim()) return;
    setStarted(true);
    setMessages([
      {
        role: 'coach',
        content: `Great. Your priority is: "${priority}"\n\nWhy is this important to you? Please end your answer with "So that..."`,
      },
    ]);
    setDepth(1);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input };
    setInput('');

    const nextDepth = depth + 1;

    if (nextDepth > 7) {
      // Extract "so that" chain and create truth statement
      const allResponses = [...messages, userMsg]
        .filter((m) => m.role === 'user')
        .map((m) => m.content);

      const statement = `I pursue "${priority}" because ultimately ${allResponses[allResponses.length - 1].replace(/so that\.{0,3}$/i, '').trim()}.`;

      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          role: 'coach',
          content: `🌟 You've reached your Root Why.\n\nHere is your Truth Statement:\n\n"${statement}"`,
        },
      ]);
      setTruthStatement(statement);
      setComplete(true);
      setDepth(8);
    } else {
      const lastSoThat = input.match(/so that[:\s]*(.*)/i)?.[1] || input;
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          role: 'coach',
          content: `Level ${nextDepth}/7 — ${DEPTH_LABELS[nextDepth - 1]}\n\nYou said: "...so that ${lastSoThat}"\n\nGo deeper. Why does that matter to you? End with "So that..."`,
        },
      ]);
      setDepth(nextDepth);
    }
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
    setComplete(false);
    setTruthStatement('');
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="flex items-center gap-2 mb-1">
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">The "So That" Coach</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Find your Root Why through 7 levels of depth.
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
              <Button className="w-full font-bold rounded-2xl" onClick={startSession}>
                <Sparkles className="h-4 w-4 mr-2" />
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
                      <p className="text-xs text-muted-foreground mb-1">{t.date} · {t.priority}</p>
                      <p className="text-sm font-semibold italic">"{t.statement}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Depth Indicator */}
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i < depth ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center font-semibold">
            {depth <= 7 ? `${DEPTH_LABELS[depth - 1]} (${depth}/7)` : 'Complete ✨'}
          </p>

          {/* Messages */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl text-sm whitespace-pre-line ${
                  m.role === 'coach'
                    ? 'bg-card border-2 border-border'
                    : 'bg-primary text-primary-foreground ml-8'
                }`}
              >
                {m.content}
              </div>
            ))}
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
              />
              <Button size="icon" className="rounded-2xl shrink-0" onClick={handleSend}>
                <Send className="h-4 w-4" />
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
