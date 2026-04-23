import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Candidate, ActivityLog, Job } from '@/src/types';
import { useData } from '@/src/contexts/DataContext';
import { Mail, Phone, MapPin, BrainCircuit, History, Link as LinkIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { generateInterviewQuestions } from '@/src/services/geminiService';
import { toast } from 'sonner';

export function CandidateProfileDialog({ 
  candidateId, 
  isOpen, 
  onClose 
}: { 
  candidateId: string | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { candidates, activityLogs, applications, jobs } = useData();
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewGuide, setInterviewGuide] = useState<string[] | null>(null);

  if (!candidateId) return null;

  const candidate = candidates.find(c => c.id === candidateId);
  const logs = activityLogs.filter(log => log.candidateId === candidateId).sort((a, b) => b.timestamp - a.timestamp);
  const candidateApps = applications.filter(a => a.candidateId === candidateId);
  const candidateJobs = jobs.filter(j => candidateApps.some(a => a.jobId === j.id));

  if (!candidate) return null;

  const handleGenerateGuide = async (job: Job) => {
    setIsGenerating(true);
    try {
      const qs = await generateInterviewQuestions(candidate, job);
      setInterviewGuide(qs);
      toast.success('Interview guide generated!');
    } catch (error) {
      toast.error('Failed to generate interview guide.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">{candidate.name}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Source: {candidate.source} • Added: {format(candidate.createdAt, 'MMM d, yyyy')}
              </DialogDescription>
            </div>
            {candidate.resumeUrl && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(candidate.resumeUrl, '_blank')}>
                <Download className="h-4 w-4" /> View Resume
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4 bg-muted/10">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <section className="space-y-3 bg-card p-4 rounded-xl border shadow-sm">
                <h3 className="font-semibold text-lg border-b pb-2">Profile Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mr-1" />
                    <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline">{candidate.email}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mr-1" />
                    <span>{candidate.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mr-1" />
                    <span>{candidate.location || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-muted-foreground mr-1" />
                    <span>{candidate.experience} years experience</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map(s => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              </section>

              {candidateApps.length > 0 && (
                <section className="space-y-3 bg-card p-4 rounded-xl border shadow-sm">
                  <h3 className="font-semibold text-lg border-b pb-2">Active Applications</h3>
                  <div className="space-y-4">
                    {candidateApps.map(app => {
                      const job = jobs.find(j => j.id === app.jobId);
                      if (!job) return null;
                      return (
                        <div key={app.id} className="p-3 border rounded-lg bg-muted/20">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{job.roleTitle}</h4>
                            <Badge>{app.status}</Badge>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                              onClick={() => handleGenerateGuide(job)}
                              disabled={isGenerating}
                            >
                              <BrainCircuit className="h-3 w-3 mr-1" />
                              Generate Interview Guide
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {interviewGuide && (
                <section className="space-y-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center border-b border-indigo-200 pb-2">
                    <h3 className="font-semibold text-indigo-900 text-lg flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5" /> AI Interview Guide
                    </h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-400 hover:text-indigo-600" onClick={() => setInterviewGuide(null)}>×</Button>
                  </div>
                  <ul className="space-y-3 mt-3 text-sm text-indigo-900">
                    {interviewGuide.map((q, i) => (
                      <li key={i} className="flex gap-3 items-start bg-white p-3 rounded-lg border border-indigo-50">
                        <span className="font-bold text-indigo-400">{i + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            </div>

            <div className="col-span-1">
              <section className="space-y-4 bg-card p-4 rounded-xl border shadow-sm h-full">
                <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Activity Log
                </h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="relative flex items-start gap-3">
                        <div className="absolute left-0 mt-1 h-2 w-2 rounded-full border-2 border-primary bg-background" />
                        <div className="pl-5 space-y-1">
                          <p className="text-xs font-medium">{log.action}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{log.details}</p>
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            <span>{log.userName}</span>
                            <span>•</span>
                            <span>{format(log.timestamp, 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
