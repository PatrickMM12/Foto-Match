import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { WeekdayAvailability, WEEKDAYS, ALL_TIME_SLOTS } from '@/hooks/use-calendar';
import { Badge } from '@/components/ui/badge';
import { X, Check, Plus, Edit, Clock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AvailabilityScheduleProps {
  weekdayAvailability: WeekdayAvailability[];
  onUpdateWeekday: (dayOfWeek: number, update: Partial<Omit<WeekdayAvailability, 'day'>>) => void;
  onApply: (months: number) => void;
}

export const AvailabilitySchedule = ({
  weekdayAvailability,
  onUpdateWeekday,
  onApply
}: AvailabilityScheduleProps) => {
  const [months, setMonths] = useState(3);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Opções pré-definidas para horários comerciais
  const businessHoursPresets = {
    morning: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    afternoon: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
    evening: ['18:00', '18:30', '19:00', '19:30', '20:00'],
    all: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
          '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
          '18:00', '18:30', '19:00', '19:30', '20:00']
  };

  // Aplica horários predefinidos a um dia da semana
  const applyPreset = (dayOfWeek: number, preset: keyof typeof businessHoursPresets) => {
    onUpdateWeekday(dayOfWeek, {
      timeSlots: [...businessHoursPresets[preset]]
    });
  };

  // Aplica o mesmo horário para todos os dias selecionados
  const applyToSelected = (sourceDay: number) => {
    const sourceConfig = weekdayAvailability.find(d => d.day === sourceDay);
    if (!sourceConfig) return;

    weekdayAvailability
      .filter(d => d.enabled && d.day !== sourceDay)
      .forEach(d => {
        onUpdateWeekday(d.day, {
          timeSlots: [...sourceConfig.timeSlots]
        });
      });
  };

  // Alterna a seleção de um horário específico
  const toggleTimeSlot = (dayOfWeek: number, timeSlot: string) => {
    const config = weekdayAvailability.find(d => d.day === dayOfWeek);
    if (!config) return;

    const newTimeSlots = config.timeSlots.includes(timeSlot)
      ? config.timeSlots.filter(t => t !== timeSlot)
      : [...config.timeSlots, timeSlot].sort();

    onUpdateWeekday(dayOfWeek, { timeSlots: newTimeSlots });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Configuração Básica</TabsTrigger>
          <TabsTrigger value="advanced">Configuração Avançada</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4 pt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os dias em que você estará disponível para sessões fotográficas e 
              escolha um dos horários pré-definidos ou configure manualmente na guia avançada.
            </p>
            
            {WEEKDAYS.map(day => {
              const config = weekdayAvailability.find(d => d.day === day.value);
              if (!config) return null;
              
              return (
                <Card key={day.value} className={config.enabled ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`day-${day.value}`}
                        checked={config.enabled}
                        onCheckedChange={(checked) => 
                          onUpdateWeekday(day.value, { enabled: !!checked })
                        }
                      />
                      <Label 
                        htmlFor={`day-${day.value}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>
                  </CardHeader>
                  
                  {config.enabled && (
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            {config.timeSlots.length} horários disponíveis
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => applyPreset(day.value, 'morning')}
                          >
                            Manhã
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => applyPreset(day.value, 'afternoon')}
                          >
                            Tarde
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => applyPreset(day.value, 'evening')}
                          >
                            Noite
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => applyPreset(day.value, 'all')}
                          >
                            Dia todo
                          </Button>
                        </div>
                        
                        {config.timeSlots.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => applyToSelected(day.value)}
                          >
                            Aplicar este horário aos outros dias selecionados
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Configure horários específicos para cada dia da semana. 
            Clique nos horários para ativá-los ou desativá-los.
          </p>
          
          <Accordion type="single" collapsible className="w-full">
            {WEEKDAYS.map(day => {
              const config = weekdayAvailability.find(d => d.day === day.value);
              if (!config || !config.enabled) return null;
              
              return (
                <AccordionItem key={day.value} value={`day-${day.value}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{day.label}</span>
                      <Badge variant="outline" className="border-green-500 text-green-600">
                        {config.timeSlots.length} horários
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 py-2">
                      {ALL_TIME_SLOTS.map(timeSlot => {
                        const isSelected = config.timeSlots.includes(timeSlot);
                        return (
                          <Button
                            key={`${day.value}-${timeSlot}`}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={isSelected ? "bg-green-600 hover:bg-green-700" : ""}
                            onClick={() => toggleTimeSlot(day.value, timeSlot)}
                          >
                            {timeSlot}
                          </Button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aplicar configuração ao calendário</CardTitle>
          <CardDescription>
            A configuração será aplicada a partir de hoje pelos próximos meses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="months">Número de meses:</Label>
            <Select 
              value={months.toString()} 
              onValueChange={(value) => setMonths(parseInt(value))}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="2">2 meses</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => onApply(months)}
            className="w-full"
          >
            Aplicar configuração ao calendário
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}; 