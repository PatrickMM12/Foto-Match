import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, DollarSign, Camera, User, Info } from 'lucide-react';

interface Session {
  id: number;
  title: string;
  description?: string;
  date: string;
  duration: number;
  location: string;
  status: string;
  totalPrice: number;
  photosIncluded: number;
  photosDelivered: number;
  additionalPhotos: number;
  additionalPhotoPrice: number;
  paymentStatus: string;
  amountPaid: number;
  clientId: number;
  photographerId: number;
  photographerName?: string;
  serviceId: number;
  createdAt: string;
}

interface SessionDetailModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
}

// --- Funções de formatação (copiadas de ClientBookings - idealmente mover para utils) ---
const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmada</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Concluída</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'partial':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Parcial</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pago</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data inválida';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error("Erro ao formatar data:", dateString, e);
        return 'Data inválida';
    }
  };
  
  const formatCurrency = (amount: number | null | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return 'R$ --,--';
    }
    return `R$ ${(amount / 100).toFixed(2).replace('.', ',')}`;
  };
// --- Fim das funções de formatação ---


const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ session, isOpen, onClose }) => {
  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{session.title}</DialogTitle>
          <DialogDescription>
            Detalhes da sessão fotográfica.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            {getStatusBadge(session.status)}
          </div>
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground mr-2">Fotógrafo:</span>
            <span>{session.photographerName || `ID: ${session.photographerId}`}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground mr-2">Data:</span>
            <span>{formatDate(session.date)}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground mr-2">Duração:</span>
            <span>{session.duration} minutos</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground mr-2">Local:</span>
            <span>{session.location}</span>
          </div>
          {session.description && (
            <div className="flex items-start">
              <Info className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
              <span className="text-muted-foreground mr-2">Descrição:</span>
              <span className="flex-1 whitespace-pre-wrap">{session.description}</span>
            </div>
          )}
          
          <hr className="my-2" />
          
          <div className="flex items-center justify-between">
             <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">Valor Total:</span>
                <span>{formatCurrency(session.totalPrice)}</span>
            </div>
            {getPaymentStatusBadge(session.paymentStatus)}
          </div>
           {session.paymentStatus !== 'pending' && (
             <div className="flex items-center">
                 <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                 <span className="text-muted-foreground mr-2">Valor Pago:</span>
                 <span>{formatCurrency(session.amountPaid)}</span>
             </div>
           )}
           <div className="flex items-center">
            <Camera className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground mr-2">Fotos Incluídas:</span>
            <span>{session.photosIncluded}</span>
          </div>
          <div className="flex items-center">
            <Camera className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground mr-2">Fotos Entregues:</span>
            <span>{session.photosDelivered}</span>
          </div>
          {session.additionalPhotos > 0 && (() => {
             // Calcular o custo total das fotos adicionais ANTES de retornar o JSX
             const totalAdditionalCostInCents = session.additionalPhotos * (session.additionalPhotoPrice || 0);
             return (
               <div className="flex items-center">
                   <Camera className="h-4 w-4 mr-2 text-muted-foreground" />
                   <span className="text-muted-foreground mr-2">Fotos Adicionais:</span>
                   {/* Exibir quantidade, custo total e custo unitário */}
                   <span>
                     {session.additionalPhotos} (Custo Total: {formatCurrency(totalAdditionalCostInCents)}) 
                     <span className="text-xs text-muted-foreground ml-1">({formatCurrency(session.additionalPhotoPrice)} cada)</span>
                   </span>
               </div>
             );
           })()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailModal; 