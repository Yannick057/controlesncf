import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamNotes } from '@/hooks/useTeamNotes';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Trash2, Check, User, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserOption {
  id: string;
  email: string;
  fullName: string | null;
}

export function TeamNotesPanel() {
  const { user } = useAuth();
  const { notes, unreadCount, loading, addNote, markAsRead, deleteNote, refetch } = useTeamNotes();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'received' | 'sent'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profiles) {
        setUsers(profiles.filter(p => p.id !== user?.id).map(p => ({
          id: p.id,
          email: p.email || '',
          fullName: p.full_name,
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSend = async () => {
    if (!selectedRecipient || !content.trim()) return;

    setSending(true);
    await addNote(selectedRecipient, content.trim());
    setContent('');
    setSelectedRecipient('');
    setSending(false);
  };

  const filteredNotes = notes.filter(note => {
    if (filter === 'received') return note.recipientId === user?.id;
    if (filter === 'sent') return note.authorId === user?.id;
    return true;
  });

  const myReceivedNotes = notes.filter(n => n.recipientId === user?.id);
  const mySentNotes = notes.filter(n => n.authorId === user?.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Notes d'équipe
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>Communiquez avec votre équipe</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compose */}
        <div className="space-y-3 rounded-lg border p-4">
          <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un destinataire" />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Écrire une note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={handleSend} 
            disabled={!selectedRecipient || !content.trim() || sending}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes ({notes.length})
          </Button>
          <Button 
            variant={filter === 'received' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('received')}
          >
            Reçues ({myReceivedNotes.length})
          </Button>
          <Button 
            variant={filter === 'sent' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('sent')}
          >
            Envoyées ({mySentNotes.length})
          </Button>
        </div>

        {/* Notes list */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p>Aucune note</p>
              </div>
            ) : (
              filteredNotes.map(note => {
                const isReceived = note.recipientId === user?.id;
                const isSent = note.authorId === user?.id;
                
                return (
                  <div 
                    key={note.id} 
                    className={cn(
                      "rounded-lg border p-4 space-y-2",
                      isReceived && !note.isRead && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {isSent ? (
                          <span>
                            Vers: <strong>{note.recipientName || note.recipientEmail}</strong>
                          </span>
                        ) : (
                          <span>
                            De: <strong>{note.authorName || note.authorEmail}</strong>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isReceived && !note.isRead && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => markAsRead(note.id)}
                            title="Marquer comme lu"
                          >
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                        )}
                        {isSent && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteNote(note.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
