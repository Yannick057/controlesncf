import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useReleaseNotes } from '@/hooks/useReleaseNotes';

export function ReleaseNoteForm() {
  const { addReleaseNote } = useReleaseNotes();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async () => {
    if (!version || !title || !content) return;
    
    setLoading(true);
    const result = await addReleaseNote(version, title, content, releaseDate);
    setLoading(false);
    
    if (result) {
      setOpen(false);
      setVersion('');
      setTitle('');
      setContent('');
      setReleaseDate(new Date().toISOString().split('T')[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle version
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une note de version</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="1.6.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="release-date">Date de sortie</Label>
              <Input
                id="release-date"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              placeholder="Nouvelles fonctionnalités"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Contenu (Markdown supporté)</Label>
            <Textarea
              id="content"
              placeholder="### Ajouté&#10;- Nouvelle fonctionnalité&#10;&#10;### Corrigé&#10;- Correction de bug"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !version || !title || !content}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
