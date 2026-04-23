/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, MapPin, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InterviewSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  jobTitle: string;
  onSchedule: (details: { date: string; time: string; interviewer: string; location: string }) => void;
}

export function InterviewScheduler({ isOpen, onClose, candidateName, jobTitle, onSchedule }: InterviewSchedulerProps) {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [interviewer, setInterviewer] = useState('');
  const [location, setLocation] = useState('Google Meet');
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!date || !time || !interviewer || !location) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsScheduling(true);
    
    // Simulate API call to Google Calendar
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Interview scheduled and invites sent!');
    setIsScheduling(false);
    
    onSchedule({
      date: format(date, 'yyyy-MM-dd'),
      time,
      interviewer,
      location
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Set up an interview for {candidateName} for the {jobTitle} role. This will send calendar invites to both parties.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger render={
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                />
              }>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="time" 
                type="time" 
                className="pl-9" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="interviewer">Interviewer</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="interviewer" 
                placeholder="e.g. Sarah Jenkins" 
                className="pl-9"
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location / Meeting Link</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="location" 
                placeholder="e.g. Google Meet link" 
                className="pl-9"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isScheduling}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={isScheduling}>
            {isScheduling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              'Send Invites'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
