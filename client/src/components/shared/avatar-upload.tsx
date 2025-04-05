import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatar?: string;
  onUpload: (url: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  currentAvatar,
  onUpload
}) => {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || '');
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tempUrl) {
      setAvatarUrl(tempUrl);
      onUpload(tempUrl);
    }
    
    setIsEditing(false);
  };
  
  // Get initials from random name for avatar fallback
  const getInitials = () => {
    return 'FC';
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-32 w-32">
        <AvatarImage src={avatarUrl} alt="Avatar" />
        <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
      </Avatar>
      
      {isEditing ? (
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div className="space-y-2">
            <Label htmlFor="avatar-url">URL da Imagem</Label>
            <Input
              id="avatar-url"
              type="text"
              placeholder="https://exemplo.com/foto.jpg"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!tempUrl}
            >
              Salvar
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsEditing(false);
                setTempUrl('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsEditing(true);
              setTempUrl(avatarUrl);
            }}
            className="flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            {avatarUrl ? 'Alterar Foto' : 'Adicionar Foto'}
          </Button>
          
          {avatarUrl && (
            <Button 
              variant="outline" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => {
                if (confirm('Deseja remover sua foto de perfil?')) {
                  setAvatarUrl('');
                  onUpload('');
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Para melhores resultados, use uma imagem com proporção 1:1 (quadrada) em formato JPG, PNG ou GIF.
      </p>
    </div>
  );
};

export default AvatarUpload;
