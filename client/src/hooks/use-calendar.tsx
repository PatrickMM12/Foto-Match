import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

interface Booking {
  date: Date;
  title: string;
  duration: number;
}

type AvailableTimes = Record<string, string[]>;
type BlockedTimes = Record<string, string[]>;

export const useCalendar = (
  initialAvailableTimes: any = {},
  sessionsData: any[] = []
) => {
  const [availableTimes, setAvailableTimes] = useState<AvailableTimes>(
    initialAvailableTimes || {}
  );
  const [blockedTimes, setBlockedTimes] = useState<BlockedTimes>({});
  const [bookings, setBookings] = useState<Booking[]>([]);

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
      
      // Generate all possible time slots
      const allTimeSlots = Array.from({ length: 24 }, (_, i) => i).flatMap(hour => [
        `${hour.toString().padStart(2, '0')}:00`,
        `${hour.toString().padStart(2, '0')}:30`
      ]);
      
      // Set as blocked all times that are not available
      newBlockedTimes[dateStr] = allTimeSlots.filter(time => !availableForDay.includes(time));
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

  return {
    availableTimes,
    blockedTimes,
    bookings,
    toggleTimeBlock,
  };
};
