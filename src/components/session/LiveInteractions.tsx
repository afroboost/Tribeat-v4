'use client';

import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart } from 'lucide-react';

type Message = {
  id: string;
  userName: string;
  userRole: string;
  content: string;
  timestamp: string | Date;
};

export function LiveInteractions(props: {
  isConnected: boolean;
  chatEnabled: boolean;
  messages: Message[];
  likesCount: number;
  onSendMessage: (content: string) => Promise<void>;
  onLike: () => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const sortedMessages = useMemo(() => props.messages, [props.messages]);

  async function send() {
    const value = content.trim();
    if (!value) return;
    setSending(true);
    setError(null);
    try {
      await props.onSendMessage(value);
      setContent('');
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 0);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setSending(false);
    }
  }

  async function like() {
    setLiking(true);
    setError(null);
    try {
      await props.onLike();
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLiking(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center justify-between">
            <span>❤️ Likes</span>
            <span className="text-sm text-gray-300">{props.likesCount}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={like}
            disabled={!props.isConnected || liking}
            variant="outline"
          >
            <Heart className="w-4 h-4 mr-2" />
            {liking ? '...' : 'Like'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center justify-between">
            <span>Chat</span>
            <span className="text-xs text-gray-400">{props.chatEnabled ? 'ON' : 'OFF'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div ref={scrollRef} className="h-64 overflow-y-auto border border-gray-700 rounded-md p-2 space-y-2">
            {sortedMessages.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun message.</p>
            ) : (
              sortedMessages.map((m) => (
                <div key={m.id} className="text-sm text-gray-200">
                  <span className="text-gray-400">{m.userName}</span>
                  <span className="text-gray-500">: </span>
                  <span>{m.content}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={props.chatEnabled ? 'Votre message…' : 'Chat désactivé'}
              disabled={!props.isConnected || sending || !props.chatEnabled}
            />
            <Button onClick={send} disabled={!props.isConnected || sending || !props.chatEnabled}>
              {sending ? '...' : 'Envoyer'}
            </Button>
          </div>

          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

