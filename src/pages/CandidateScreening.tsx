/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/src/contexts/DataContext';
import { 
  ArrowLeft, 
  BrainCircuit, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  UserCircle,
  Briefcase,
  Star,
  MessageSquare,
  Tag as TagIcon,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { calculateMatchScore } from '@/src/services/geminiService';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export default function CandidateScreening() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { candidates, jobs, addApplication } = useData();
  
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState<{ score: number; reasoning: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const candidate = candidates.find(c => c.id === id);
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const handleAnalyze = async () => {
    if (!selectedJob) {
      toast.error('Please select a job to screen against');
      return;
    }
    if (!candidate) return;

    setIsAnalyzing(true);
    try {
      const result = await calculateMatchScore(candidate, selectedJob);
      setMatchResult(result);
      toast.success("AI Analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze candidate.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveScreening = async (status: 'Relevant' | 'Rejected' | 'Hold') => {
    if (!selectedJobId) {
      toast.error('Please select a job first');
      return;
    }
    if (!candidate) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'screenings'), {
        candidateId: candidate.id,
        jobId: selectedJobId,
        score: matchResult?.score || 0,
        notes,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        status,
        createdAt: Date.now()
      });

      if (status === 'Relevant') {
        await addApplication({
          candidateId: candidate.id,
          jobId: selectedJobId,
          status: 'Shortlisted',
          matchScore: matchResult?.score,
          notes,
        });
      }

      toast.success(`Candidate marked as ${status}`);
      navigate('/candidates');
    } catch (error) {
      console.error('Error saving screening:', error);
      toast.error('Failed to save screening result');
    } finally {
      setIsSaving(false);
    }
  };

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground mb-4">Candidate not found.</p>
        <Button onClick={() => navigate('/candidates')}>Back to Candidates</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidate Screening</h1>
          <p className="text-muted-foreground">Screen {candidate.name} against open positions.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>{candidate.name}</CardTitle>
                  <CardDescription>{candidate.location} • {candidate.experience} years exp.</CardDescription>
                </div>
              </div>
              {candidate.resumeUrl && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(candidate.resumeUrl, '_blank')}>
                  <FileText className="h-4 w-4" /> View Resume
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map(skill => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Email</h4>
                  <p className="text-sm text-muted-foreground">{candidate.email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Phone</h4>
                  <p className="text-sm text-muted-foreground">{candidate.phone || 'N/A'}</p>
                </div>
              </div>
              {candidate.parsedData?.education && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Education</h4>
                    <p className="text-sm text-muted-foreground">{candidate.parsedData.education}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                AI Match Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium">Select Job to Screen Against</label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.filter(j => j.status === 'Open').map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.roleTitle} at {job.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedJob ? (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a job above to begin analysis.
                </div>
              ) : !matchResult ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <BrainCircuit className={cn("h-8 w-8 text-primary", isAnalyzing && "animate-pulse")} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Ready to Analyze</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      AI will compare skills, experience, and location to generate a match score.
                    </p>
                  </div>
                  <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? "Analyzing..." : "Start AI Analysis"}
                  </Button>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-center">
                    <div className="relative h-32 w-32 flex items-center justify-center">
                      <svg className="h-full w-full" viewBox="0 0 100 100">
                        <circle
                          className="text-muted stroke-current"
                          strokeWidth="8"
                          fill="transparent"
                          r="40"
                          cx="50"
                          cy="50"
                        />
                        <circle
                          className={cn(
                            "stroke-current transition-all duration-1000 ease-out",
                            matchResult.score >= 75 ? "text-green-500" : matchResult.score >= 50 ? "text-yellow-500" : "text-red-500"
                          )}
                          strokeWidth="8"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * matchResult.score) / 100}
                          strokeLinecap="round"
                          fill="transparent"
                          r="40"
                          cx="50"
                          cy="50"
                        />
                      </svg>
                      <span className="absolute text-3xl font-bold">{matchResult.score}%</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      AI Reasoning
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {matchResult.reasoning}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? "Recalculating..." : "Recalculate Score"}
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => handleSaveScreening('Relevant')}
                  disabled={isSaving || !selectedJobId}
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark Relevant
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleSaveScreening('Rejected')}
                  disabled={isSaving || !selectedJobId}
                >
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => handleSaveScreening('Hold')}
                  disabled={isSaving || !selectedJobId}
                >
                  <Clock className="h-4 w-4" /> Put on Hold
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Notes
                </label>
                <Textarea 
                  placeholder="Add screening notes..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <TagIcon className="h-4 w-4" /> Tags (comma separated)
                </label>
                <Input 
                  placeholder="e.g. Strong Communicator" 
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {selectedJob && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Job Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium">{selectedJob.roleTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{selectedJob.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Exp:</span>
                    <span className="font-medium">{selectedJob.experienceRequired} years</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground block mb-1">Required Skills:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedJob.skillsRequired.map(skill => (
                      <Badge key={skill} variant="outline" className="text-[10px] px-1 py-0 h-4">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
