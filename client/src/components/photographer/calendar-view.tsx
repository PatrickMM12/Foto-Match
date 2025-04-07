import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarClock, Clock, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPickerRangeProps } from 'react-day-picker';

// Define the time slots for the day
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i).flatMap(hour => [
  `${hour.toString().padStart(2, '0')}:00`,
  `${hour.toString().padStart(2, '0')}:30`
]);

interface CalendarViewProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  availableTimes: Record<string, string[]>;
  blockedTimes: Record<string, string[]>;
  bookings: { date: Date; title: string; duration: number }[];
  onBlockTime: (date: Date, blocked: boolean) => void;
  isBlockingTime: boolean;
  setIsBlockingTime: (value: boolean) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  setSelectedDate,
  availableTimes,
  blockedTimes,
  bookings,
  onBlockTime,
  isBlockingTime,
  setIsBlockingTime,
}) => {
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Generate days of the week for week view
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 0 }),
    });
  }, [weekStart]);

  // Move to next/previous week
  const navigateWeek = (direction: 'next' | 'prev') => {
    const days = direction === 'next' ? 7 : -7;
    setWeekStart(addDays(weekStart, days));
  };

  // Calculate available and booked time slots for a specific date
  const getDateTimeSlots = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    const available = availableTimes[dateString] || [];
    const blocked = blockedTimes[dateString] || [];
    
    const booked = bookings
      .filter(booking => isSameDay(booking.date, date))
      .map(booking => {
        const time = format(booking.date, 'HH:mm');
        return { time, title: booking.title, duration: booking.duration };
      });

    return { available, blocked, booked };
  };

  // Handle time slot click - toggle available/blocked
  const handleTimeSlotClick = (date: Date, time: string) => {
    if (!isBlockingTime) return;

    const dateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      parseInt(time.split(':')[0]),
      parseInt(time.split(':')[1] || '0')
    );

    // Check if the time is blocked
    const dateString = format(date, 'yyyy-MM-dd');
    const blocked = blockedTimes[dateString]?.includes(time);
    
    onBlockTime(dateTime, !blocked);
  };

  // Render the day view with all time slots
  const renderDayView = () => {
    if (!selectedDate) return null;

    const { available, blocked, booked } = getDateTimeSlots(selectedDate);

    return (
      <div className="space-y-4">
        <div className="text-center text-lg font-medium">
          {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: ptBR })}
        </div>
        
        <div className="h-[500px] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 gap-1">
            {TIME_SLOTS.map((time) => {
              const isBlocked = blocked.includes(time);
              const isAvailable = available.includes(time);
              const booking = booked.find(b => b.time === time);
              
              return (
                <div
                  key={time}
                  className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                    booking
                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                      : isBlocked
                        ? 'bg-red-100 hover:bg-red-200 text-red-800'
                        : isAvailable
                          ? 'bg-green-100 hover:bg-green-200 text-green-800'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  } ${isBlockingTime ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => handleTimeSlotClick(selectedDate, time)}
                >
                  <div className="w-16 text-sm font-medium">{time}</div>
                  
                  {booking ? (
                    <div className="text-sm">{booking.title} ({booking.duration} min)</div>
                  ) : isBlocked ? (
                    <div className="text-sm flex items-center"><X className="h-3 w-3 mr-1" /> Bloqueado</div>
                  ) : isAvailable ? (
                    <div className="text-sm flex items-center"><Check className="h-3 w-3 mr-1" /> Disponível</div>
                  ) : (
                    <div className="text-sm text-gray-500">Não configurado</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render the week view with days and time slots
  const renderWeekView = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center font-medium">
            {format(weekStart, 'dd MMM', { locale: ptBR })} - {format(weekDays[6], 'dd MMM, yyyy', { locale: ptBR })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {weekDays.map((day) => (
              <div key={day.toString()} className="text-center">
                <div className="font-medium mb-1">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div 
                  className={`text-sm rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 ${
                    isSameDay(day, new Date()) ? 'bg-primary text-white' : ''
                  }`}
                >
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map((time) => {
                    const { available, blocked, booked } = getDateTimeSlots(day);
                    const isBlocked = blocked.includes(time);
                    const isAvailable = available.includes(time);
                    const booking = booked.find(b => b.time === time);
                    
                    return (
                      <div
                        key={`${day.toString()}-${time}`}
                        className={`text-xs rounded-md p-1 text-center ${
                          booking
                            ? 'bg-blue-100 text-blue-800'
                            : isBlocked
                              ? 'bg-red-100 text-red-800'
                              : isAvailable
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-500'
                        } ${isBlockingTime ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => isBlockingTime && handleTimeSlotClick(day, time)}
                      >
                        {time}
                        {booking && (
                          <div className="truncate mt-1 font-medium">{booking.title}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render the month view (calendar)
  const renderMonthView = () => {
    // Personalização do dia no calendário para mostrar status
    const dayClassNames = (date: Date): string => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Verificar status do dia
      const hasBooking = bookings.some(booking => isSameDay(booking.date, date));
      const isAvailable = availableTimes[dateStr] && availableTimes[dateStr].length > 0;
      const isFullyBlocked = blockedTimes[dateStr] && 
                              blockedTimes[dateStr].length === TIME_SLOTS.length;
      
      if (hasBooking) return 'border-2 border-primary bg-blue-50';
      if (isAvailable) return 'bg-green-50 text-green-600 font-medium';
      if (isFullyBlocked) return 'bg-red-50 text-red-600 opacity-70';
      
      return '';
    };

    return (
      <div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="mx-auto"
          locale={ptBR}
          modifiers={{
            booked: bookings.map(booking => booking.date),
            available: Object.keys(availableTimes).map(dateStr => {
              try {
                const parts = dateStr.split('-').map(p => parseInt(p));
                return new Date(parts[0], parts[1] - 1, parts[2]);
              } catch (e) {
                return new Date(); // fallback
              }
            }),
            blocked: Object.keys(blockedTimes)
              .filter(dateStr => blockedTimes[dateStr].length === TIME_SLOTS.length)
              .map(dateStr => {
                try {
                  const parts = dateStr.split('-').map(p => parseInt(p));
                  return new Date(parts[0], parts[1] - 1, parts[2]);
                } catch (e) {
                  return new Date(); // fallback
                }
              }),
          }}
          modifiersClassNames={{
            booked: 'border-2 border-primary bg-blue-50',
            available: 'bg-green-50 text-green-600 font-medium',
            blocked: 'bg-red-50 text-red-600 opacity-70'
          }}
          classNames={{
            day: 'rounded-full'
          }}
        />
        
        {selectedDate && (
          <div className="mt-4 border-t pt-4">
            <h3 className="font-medium mb-2">
              {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: ptBR })}
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {TIME_SLOTS.filter((_, i) => i % 2 === 0).map(time => {
                const { available, blocked, booked } = getDateTimeSlots(selectedDate);
                const isBlocked = blocked.includes(time);
                const isAvailable = available.includes(time);
                const booking = booked.find(b => b.time === time);
                
                return (
                  <div
                    key={`summary-${time}`}
                    className={`p-2 rounded-md text-sm ${
                      booking
                        ? 'bg-blue-100 text-blue-800'
                        : isBlocked
                          ? 'bg-red-100 text-red-800'
                          : isAvailable
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-500'
                    } ${isBlockingTime ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => isBlockingTime && handleTimeSlotClick(selectedDate, time)}
                  >
                    <div className="font-medium">{time}</div>
                    {booking ? (
                      <div className="truncate text-xs">{booking.title}</div>
                    ) : isBlocked ? (
                      <div className="text-xs">Bloqueado</div>
                    ) : isAvailable ? (
                      <div className="text-xs">Disponível</div>
                    ) : (
                      <div className="text-xs">Não configurado</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Tabs value={view} onValueChange={(value) => setView(value as any)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isBlockingTime ? "default" : "outline"}
            size="sm"
            onClick={() => setIsBlockingTime(!isBlockingTime)}
            className="flex items-center"
          >
            <Clock className="mr-2 h-4 w-4" />
            {isBlockingTime ? "Concluir edição" : "Editar disponibilidade"}
          </Button>
        </div>
      </div>
      
      <div>
        {view === 'day' && renderDayView()}
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
      </div>
      
      {isBlockingTime && (
        <div className="flex gap-4 mt-2 rounded-md bg-blue-50 p-3 text-sm">
          <CalendarClock className="h-5 w-5 text-blue-500 shrink-0" />
          <div className="text-blue-700">
            <p className="font-medium">Modo de edição ativado</p>
            <p className="text-blue-600 text-xs mt-1">
              Clique nos horários para marcar como disponível ou bloqueado. Clique em "Concluir edição" quando terminar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
