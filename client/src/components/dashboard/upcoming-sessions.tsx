import { formatDistance, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Link } from 'wouter';

interface Session {
  id: number;
  title: string;
  date: string;
  location: string;
  duration: number;
  status: string;
  clientId: number;
  clientName?: string;
}

interface UpcomingSessionsProps {
  sessions: Session[];
}

const UpcomingSessions: React.FC<UpcomingSessionsProps> = ({ sessions }) => {
  // Filter and sort upcoming sessions
  const upcomingSessions = sessions
    ?.filter(session => {
      const sessionDate = new Date(session.date);
      const today = new Date();
      return sessionDate > today && (session.status === 'confirmed' || session.status === 'pending');
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3); // Show only the next 3 sessions

  // Format session date
  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: format(date, 'dd', { locale: ptBR }),
      month: format(date, 'MMM', { locale: ptBR }).toUpperCase(),
      time: format(date, 'HH:mm', { locale: ptBR }),
      relative: formatDistance(date, new Date(), { addSuffix: true, locale: ptBR })
    };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Próximas Sessões</CardTitle>
        <Link href="/photographer/sessions">
          <Button variant="ghost" className="h-8 px-2 text-sm">Ver todas</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {upcomingSessions && upcomingSessions.length > 0 ? (
          <div className="space-y-4">
            {upcomingSessions.map((session) => {
              const dateInfo = formatSessionDate(session.date);
              
              return (
                <div 
                  key={session.id} 
                  className={`flex p-3 rounded-lg ${
                    session.status === 'pending' 
                      ? 'bg-yellow-50' 
                      : session.status === 'confirmed' 
                        ? 'bg-blue-50' 
                        : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-12 h-12 ${
                    session.status === 'pending' 
                      ? 'bg-yellow-400 text-white' 
                      : session.status === 'confirmed' 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-300 text-gray-700'
                  } rounded-lg flex items-center justify-center font-bold shrink-0`}>
                    <div className="text-center">
                      <div className="text-xs">{dateInfo.month}</div>
                      <div className="text-lg leading-none">{dateInfo.day}</div>
                    </div>
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900">{session.title}</p>
                      <span className="text-xs text-muted-foreground">{dateInfo.relative}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{dateInfo.time}</span>
                      <span className="mx-1">•</span>
                      <span>{session.duration} min</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="truncate">{session.location}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">Nenhuma sessão agendada nos próximos dias.</p>
            <Link href="/photographer/calendar">
              <Button variant="ghost" className="mt-2">Configurar disponibilidade</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingSessions;
