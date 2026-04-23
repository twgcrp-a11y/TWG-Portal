/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Filter, 
  MoreVertical, 
  UserCircle, 
  Briefcase,
  ArrowRight,
  XCircle,
  CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PIPELINE_STAGES } from '@/src/constants';
import { Application, PipelineStatus } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { InterviewScheduler } from '@/src/components/InterviewScheduler';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function Pipeline() {
  const { applications, candidates, jobs, updateApplicationStatus } = useData();
  const [selectedJob, setSelectedJob] = useState<string | 'all'>('all');
  const [schedulingAppId, setSchedulingAppId] = useState<string | null>(null);
  const { user } = useAuth();
  
  const canEdit = user?.role === 'Admin' || user?.role === 'Recruiter';

  const moveApplication = async (id: string, newStatus: PipelineStatus) => {
    if (!canEdit) return;
    await updateApplicationStatus(id, newStatus);
  };

  const handleScheduleInterview = async (details: { date: string; time: string; interviewer: string; location: string }) => {
    if (!schedulingAppId) return;
    
    await updateApplicationStatus(schedulingAppId, 'Interview', { interviewDetails: details });
    setSchedulingAppId(null);
  };

  const onDragEnd = (result: DropResult) => {
    if (!canEdit) return;
    if (!result.destination) return;
    
    const appId = result.draggableId;
    const newStatus = result.destination.droppableId as PipelineStatus;
    
    if (result.source.droppableId !== result.destination.droppableId) {
      moveApplication(appId, newStatus);
    }
  };

  const schedulingApp = applications.find(a => a.id === schedulingAppId);
  const schedulingCandidate = schedulingApp ? candidates.find(c => c.id === schedulingApp.candidateId) : null;
  const schedulingJob = schedulingApp ? jobs.find(j => j.id === schedulingApp.jobId) : null;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruitment Pipeline</h1>
          <p className="text-muted-foreground">Track candidates across different stages. Drag and drop to move.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {PIPELINE_STAGES.map((stage) => {
            const stageApps = applications.filter(app => app.status === stage.id && (selectedJob === 'all' || app.jobId === selectedJob));
            
            return (
              <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Badge className={stage.color}>{stage.label}</Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {stageApps.length}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <ScrollArea 
                      className="flex-1 rounded-xl bg-muted/30 p-2 border border-dashed"
                      {...provided.droppableProps}
                    >
                      <div ref={provided.innerRef} className={`flex flex-col gap-3 min-h-[500px] ${snapshot.isDraggingOver ? 'bg-primary/5 rounded-xl' : ''}`}>
                        <AnimatePresence mode="popLayout">
                          {stageApps.map((app, index) => {
                            const candidate = candidates.find(c => c.id === app.candidateId);
                            const job = jobs.find(j => j.id === app.jobId);
                            return (
                              <Draggable key={app.id} draggableId={app.id} index={index} isDragDisabled={!canEdit}>
                                {(provided, snapshot) => (
                                  <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                      opacity: snapshot.isDragging ? 0.8 : 1,
                                    }}
                                  >
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={{ ...provided.draggableProps.style }}
                                    >
                                      <Card className={`shadow-sm transition-shadow ${canEdit ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''}`}>
                                      <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center">
                                              <UserCircle className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold truncate">{candidate?.name || 'Unknown Candidate'}</p>
                                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate border-blue-200">
                                                <Briefcase className="h-3 w-3 shrink-0" /> <span className="truncate">{job?.roleTitle || 'Unknown Job'}</span>
                                              </p>
                                            </div>
                                          </div>
                                          {app.matchScore && (
                                            <Badge variant="secondary" className="shrink-0 text-[10px] bg-green-50 text-green-700 border-green-200">
                                              {app.matchScore}% Match
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        {candidate?.skills && candidate.skills.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {candidate.skills.slice(0, 3).map(skill => (
                                              <Badge key={skill} variant="outline" className="text-[9px] px-1 py-0 h-4">
                                                {skill}
                                              </Badge>
                                            ))}
                                            {candidate.skills.length > 3 && (
                                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground">
                                                +{candidate.skills.length - 3}
                                              </Badge>
                                            )}
                                          </div>
                                        )}

                                        {app.interviewDetails && (
                                          <div className="bg-blue-50 border border-blue-100 rounded-md p-2 mt-2 text-xs text-blue-800">
                                            <div className="flex items-center gap-1 font-medium mb-1">
                                              <CalendarIcon className="h-3 w-3" />
                                              {app.interviewDetails.date} at {app.interviewDetails.time}
                                            </div>
                                            <div className="text-[10px] opacity-80">
                                              With: {app.interviewDetails.interviewer}
                                            </div>
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t mt-2">
                                          <div className="flex gap-1">
                                            {canEdit && stage.id !== 'Dropped' && (
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => moveApplication(app.id, 'Dropped')}
                                              >
                                                <XCircle className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </div>
                                          <div className="flex gap-1">
                                            {canEdit && stage.id === 'Interview' && !app.interviewDetails && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[10px] gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                                                onClick={() => setSchedulingAppId(app.id)}
                                              >
                                                <CalendarIcon className="h-3 w-3" /> Schedule
                                              </Button>
                                            )}
                                            {canEdit && PIPELINE_STAGES.findIndex(s => s.id === stage.id) < PIPELINE_STAGES.length - 1 && stage.id !== 'Dropped' && (
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 text-[10px] gap-1"
                                                onClick={() => {
                                                  const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
                                                  moveApplication(app.id, PIPELINE_STAGES[currentIndex + 1].id as PipelineStatus);
                                                }}
                                              >
                                                Next Stage <ArrowRight className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    </div>
                                  </motion.div>
                                )}
                              </Draggable>
                            );
                          })}
                        </AnimatePresence>
                        {provided.placeholder}
                      </div>
                    </ScrollArea>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {schedulingApp && (
        <InterviewScheduler
          isOpen={!!schedulingAppId}
          onClose={() => setSchedulingAppId(null)}
          candidateName={schedulingCandidate?.name || 'Unknown'}
          jobTitle={schedulingJob?.roleTitle || 'Unknown'}
          onSchedule={handleScheduleInterview}
        />
      )}
    </div>
  );
}
