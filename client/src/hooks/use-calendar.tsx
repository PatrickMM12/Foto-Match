import { useState, useEffect } from 'react';
import { format, parseISO, getDay, addMonths } from 'date-fns';

interface Booking {
  date: Date;
  title: string;
  duration: number;
}

// Interface para configuração de disponibilidade por dia da semana
export interface WeekdayAvailability {
  day: number; // 0-6, onde 0 é domingo
  enabled: boolean;
  timeSlots: string[]; // Horários disponíveis, ex: ["09:00", "09:30", ...]
}

type AvailableTimes = Record<string, string[]>;
type BlockedTimes = Record<string, string[]>;

// Dias da semana
export const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

// Gerar todos os slots de horário possíveis (de 30 em 30 minutos)
export const ALL_TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i).flatMap(hour => [
  `${hour.toString().padStart(2, '0')}:00`,
  `${hour.toString().padStart(2, '0')}:30`
]);

export const useCalendar = (
  initialAvailableTimes: any = {},
  sessionsData: any[] = []
) => {
  const [availableTimes, setAvailableTimes] = useState<AvailableTimes>(
    initialAvailableTimes || {}
  );
  const [blockedTimes, setBlockedTimes] = useState<BlockedTimes>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // Estado para dias da semana e suas disponibilidades
  const [weekdayAvailability, setWeekdayAvailability] = useState<WeekdayAvailability[]>(
    WEEKDAYS.map(day => ({
      day: day.value,
      enabled: false,
      timeSlots: []
    }))
  );

  // Inicializar configuração de dias da semana com base nos dados existentes
  useEffect(() => {
    if (initialAvailableTimes && Object.keys(initialAvailableTimes).length > 0) {
      // Analisa os horários disponíveis existentes para extrair padrões por dia da semana
      const weekdayPatterns: Record<number, Set<string>> = {
        0: new Set(), 1: new Set(), 2: new Set(), 
        3: new Set(), 4: new Set(), 5: new Set(), 6: new Set()
      };
      
      // Conta ocorrências de horários para cada dia da semana
      Object.entries(initialAvailableTimes).forEach(([dateStr, times]) => {
        try {
          const date = parseISO(dateStr);
          const dayOfWeek = getDay(date);
          
          // Adiciona os horários ao conjunto para este dia da semana
          (times as string[]).forEach(time => {
            weekdayPatterns[dayOfWeek].add(time);
          });
        } catch (e) {
          console.error('Erro ao processar data:', dateStr, e);
        }
      });
      
      // Atualiza o estado de configuração de dias da semana
      const updatedWeekdayAvailability = WEEKDAYS.map(day => {
        const timeSlotsForDay = Array.from(weekdayPatterns[day.value]);
        return {
          day: day.value,
          enabled: timeSlotsForDay.length > 0,
          timeSlots: timeSlotsForDay.sort()
        };
      });
      
      setWeekdayAvailability(updatedWeekdayAvailability);
    }
  }, [initialAvailableTimes]);

  // Process sessions data to create bookings
  useEffect(() => {
    if (sessionsData && sessionsData.length > 0) {
      const formattedBookings = sessionsData
        .filter(session => session.status !== 'canceled')
        .map(session => ({
          date: new Date(session.date),
          title: session.title,
          duration: session.duration,
        }));
      
      setBookings(formattedBookings);
    }
  }, [sessionsData]);

  // Process available times to also generate blocked times
  useEffect(() => {
    const newBlockedTimes: BlockedTimes = {};
    
    // For each day in availableTimes
    Object.keys(availableTimes).forEach(dateStr => {
      const availableForDay = availableTimes[dateStr] || [];
      
      // Set as blocked all times that are not available
      newBlockedTimes[dateStr] = ALL_TIME_SLOTS.filter(time => !availableForDay.includes(time));
    });
    
    setBlockedTimes(newBlockedTimes);
  }, [availableTimes]);

  // Toggle a time slot's availability
  const toggleTimeBlock = (date: Date, isBlocked: boolean) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = format(date, 'HH:mm');
    
    // Create a copy of the current available times for that date
    const currentAvailable = [...(availableTimes[dateStr] || [])];
    
    if (isBlocked) {
      // If we're blocking a time, remove it from available times
      const updatedAvailable = currentAvailable.filter(time => time !== timeStr);
      const newAvailableTimes = {
        ...availableTimes,
        [dateStr]: updatedAvailable,
      };
      setAvailableTimes(newAvailableTimes);
      return newAvailableTimes;
    } else {
      // If we're unblocking a time, add it to available times
      if (!currentAvailable.includes(timeStr)) {
        const updatedAvailable = [...currentAvailable, timeStr].sort();
        const newAvailableTimes = {
          ...availableTimes,
          [dateStr]: updatedAvailable,
        };
        setAvailableTimes(newAvailableTimes);
        return newAvailableTimes;
      }
    }
    
    return availableTimes;
  };

  // Atualiza a configuração de disponibilidade para um dia da semana específico
  const updateWeekdayAvailability = (
    dayOfWeek: number, 
    update: Partial<Omit<WeekdayAvailability, 'day'>>
  ) => {
    const updatedWeekdayAvailability = weekdayAvailability.map(day => {
      if (day.day === dayOfWeek) {
        return { ...day, ...update };
      }
      return day;
    });
    
    setWeekdayAvailability(updatedWeekdayAvailability);
  };
  
  // Aplica configuração de dias da semana ao calendário para um período futuro
  const applyWeekdayAvailability = (months = 3) => {
    const today = new Date();
    const endDate = addMonths(today, months);
    const newAvailableTimes = { ...availableTimes };
    
    // Para cada dia entre hoje e o final do período
    let currentDate = today;
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = getDay(currentDate);
      
      // Procura a configuração para este dia da semana
      const config = weekdayAvailability.find(day => day.day === dayOfWeek);
      
      if (config && config.enabled) {
        // Se o dia estiver habilitado, define os horários disponíveis
        newAvailableTimes[dateStr] = [...config.timeSlots];
      } else if (config && !config.enabled && newAvailableTimes[dateStr]) {
        // Se o dia estiver desabilitado, remove os horários disponíveis existentes
        delete newAvailableTimes[dateStr];
      }
      
      // Avança para o próximo dia
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }
    
    setAvailableTimes(newAvailableTimes);
    return newAvailableTimes;
  };

  return {
    availableTimes,
    blockedTimes,
    bookings,
    toggleTimeBlock,
    weekdayAvailability,
    updateWeekdayAvailability,
    applyWeekdayAvailability,
    ALL_TIME_SLOTS,
    WEEKDAYS
  };
};
