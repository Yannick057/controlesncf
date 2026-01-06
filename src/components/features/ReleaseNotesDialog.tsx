import { useState } from 'react';
import { useReleaseNotes } from '@/hooks/useReleaseNotes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, RefreshCw } from 'lucide-react';

interface ReleaseNotesDialogProps {
  children?: React.ReactNode;
}

export function ReleaseNotesDialog({ children }: ReleaseNotesDialogProps) {
  const { releaseNotes, loading, refetch } = useReleaseNotes();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Notes de version
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Notes de version
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : releaseNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Sparkles className="h-8 w-8 mb-2" />
              <p>Aucune note de version</p>
            </div>
          ) : (
            <div className="space-y-6 pr-4">
              {releaseNotes.map((note, index) => (
                <div key={note.id} className="relative pl-6 pb-6 border-l-2 border-border last:border-0">
                  <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-primary" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        v{note.version}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(note.releaseDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      {index === 0 && (
                        <Badge variant="outline" className="text-success border-success">
                          Actuelle
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{note.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
