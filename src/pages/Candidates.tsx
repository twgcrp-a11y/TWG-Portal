/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  UserCircle, 
  Mail, 
  Phone, 
  MapPin,
  FileText,
  Upload,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDropzone } from 'react-dropzone';
import { parseResume } from '@/src/services/geminiService';
import { toast } from 'sonner';
import { Candidate } from '@/src/types';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAuth } from '@/src/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

import { useData } from '@/src/contexts/DataContext';
import { CandidateProfileDialog } from '@/src/components/CandidateProfileDialog';

type ParsedItem = {
  file: File;
  status: 'parsing' | 'success' | 'error';
  data: Partial<Candidate>;
};

export default function Candidates() {
  const { candidates, addCandidate, deleteCandidate } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({
    name: '',
    email: '',
    phone: '',
    location: '',
    experience: 0,
    skills: [],
    source: 'Manual',
    tags: [],
  });
  const [parsedCandidates, setParsedCandidates] = useState<ParsedItem[]>([]);
  const { user } = useAuth();

  if (user?.role === 'HiringManager') {
    return <Navigate to="/" replace />;
  }

  const handleEmailAction = (candidate: Candidate, type: 'invite' | 'reject') => {
    const subject = type === 'invite' ? 'Interview Invitation - Rozgaar' : 'Application Update - Rozgaar';
    const body = type === 'invite' 
      ? `Hi ${candidate.name},\n\nWe would like to invite you to an interview for an open position. Please let us know your availability.\n\nBest,\nRozgaar Team`
      : `Hi ${candidate.name},\n\nThank you for your application. Unfortunately, we will not be moving forward at this time.\n\nBest,\nRozgaar Team`;
    
    window.open(`mailto:${candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    const newItems: ParsedItem[] = acceptedFiles.map(file => ({
      file,
      status: 'parsing',
      data: {}
    }));

    setParsedCandidates(prev => [...prev, ...newItems]);
    toast.info(`Parsing ${acceptedFiles.length} file(s)...`);

    for (const file of acceptedFiles) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Data = (e.target?.result as string).split(',')[1];
            const result = await parseResume({
              data: base64Data,
              mimeType: file.type || 'application/pdf'
            });
            
            setParsedCandidates(prev => prev.map(item => 
              item.file === file ? { ...item, data: result, status: 'success' } : item
            ));
          } catch (error) {
            console.error(error);
            setParsedCandidates(prev => prev.map(item => 
              item.file === file ? { ...item, status: 'error' } : item
            ));
          }
        };
        reader.onerror = () => {
          setParsedCandidates(prev => prev.map(item => 
            item.file === file ? { ...item, status: 'error' } : item
          ));
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error(error);
        setParsedCandidates(prev => prev.map(item => 
          item.file === file ? { ...item, status: 'error' } : item
        ));
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv']
    },
    multiple: true
  } as any);

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSkill = skillFilter === '' || 
                         (c.skills && c.skills.some(s => s.toLowerCase().includes(skillFilter.toLowerCase())));
    
    let matchesExperience = true;
    if (experienceFilter !== 'all') {
      const exp = c.experience || 0;
      if (experienceFilter === '0-2') matchesExperience = exp >= 0 && exp <= 2;
      else if (experienceFilter === '3-5') matchesExperience = exp >= 3 && exp <= 5;
      else if (experienceFilter === '6-9') matchesExperience = exp >= 6 && exp <= 9;
      else if (experienceFilter === '10+') matchesExperience = exp >= 10;
    }

    return matchesSearch && matchesSkill && matchesExperience;
  });

  const handleSaveParsed = async () => {
    const successful = parsedCandidates.filter(p => p.status === 'success');
    if (successful.length === 0) return;

    try {
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('@/src/lib/firebase');

      for (const p of successful) {
        let resumeUrl = undefined;
        try {
          const storageRef = ref(storage, `resumes/${Date.now()}_${p.file.name}`);
          await uploadBytes(storageRef, p.file);
          resumeUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Error uploading resume:', error);
        }

        const candidateData: any = {
          name: p.data.name || 'Unknown',
          email: p.data.email || '',
          phone: p.data.phone || '',
          skills: p.data.skills || [],
          experience: p.data.experience || 0,
          location: p.data.location || '',
          source: 'AI Import',
          tags: ['New'],
        };

        if (resumeUrl) {
          candidateData.resumeUrl = resumeUrl;
        }

        await addCandidate(candidateData);
      }

      setParsedCandidates([]);
      setIsImportOpen(false);
      toast.success(`Successfully imported ${successful.length} candidates.`);
    } catch (error) {
      // Error handled by context
    }
  };

  const [isUploadingCV, setIsUploadingCV] = useState(false);

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCV(true);
    try {
      // 1. Parse with Gemini to auto-fill
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string).split(',')[1];
          toast.info('Parsing CV to auto-fill details...');
          const result = await parseResume({
            data: base64Data,
            mimeType: file.type || 'application/pdf'
          });
          
          setNewCandidate(prev => ({
            ...prev,
            name: result.name || prev.name,
            email: result.email || prev.email,
            phone: result.phone || prev.phone,
            location: result.location || prev.location,
            experience: result.experience || prev.experience,
            skills: result.skills?.length ? result.skills : prev.skills,
          }));
          toast.success('Auto-filled details from CV');
        } catch (error) {
          console.error('Error parsing CV:', error);
          toast.error('Failed to parse CV for auto-fill');
        } finally {
          setIsUploadingCV(false);
        }
      };
      reader.readAsDataURL(file);

      // 2. Upload to Firebase Storage (optional, we'll just simulate or try it)
      // Since storage rules might not be set up, we'll just rely on the parsed data for now,
      // or we can try to upload it. Let's try to upload it.
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('@/src/lib/firebase');
      const storageRef = ref(storage, `resumes/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewCandidate(prev => ({ ...prev, resumeUrl: url }));
      
    } catch (error) {
      console.error('Error uploading CV:', error);
      // Don't show error toast if it's just a storage permission issue, as parsing might have worked
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      const candidateData: any = {
        name: newCandidate.name || '',
        email: newCandidate.email || '',
        phone: newCandidate.phone || '',
        skills: newCandidate.skills || [],
        experience: newCandidate.experience || 0,
        location: newCandidate.location || '',
        source: newCandidate.source || 'Manual',
        tags: ['New'],
      };
      
      if (newCandidate.resumeUrl) {
        candidateData.resumeUrl = newCandidate.resumeUrl;
      }

      await addCandidate(candidateData);

      setIsAddDialogOpen(false);
      setNewCandidate({
        name: '',
        email: '',
        phone: '',
        location: '',
        experience: 0,
        skills: [],
        source: 'Manual',
        tags: [],
        resumeUrl: undefined,
      });
      toast.success('Candidate added successfully');
    } catch (error) {
      // Error handled by context
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground">Manage your talent pool and import resumes.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <Button variant="outline" className="gap-2" onClick={() => setIsImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Import Candidates</DialogTitle>
                <DialogDescription>
                  Upload multiple resumes (PDF, DOCX) or CSV files. AI will automatically extract details.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer mb-4",
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {isDragActive ? "Drop files here" : "Click or drag multiple resumes here"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, Word, CSV up to 10MB
                    </p>
                  </div>
                </div>

                {parsedCandidates.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Import Queue ({parsedCandidates.length})</h4>
                    {parsedCandidates.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-medium truncate">{item.file.name}</p>
                            {item.status === 'success' && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.data.name} • {item.data.skills?.slice(0, 2).join(', ')}
                              </p>
                            )}
                            {item.status === 'error' && (
                              <p className="text-xs text-destructive">Failed to parse</p>
                            )}
                          </div>
                        </div>
                        <div>
                          {item.status === 'parsing' && <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />}
                          {item.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                          {item.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setIsImportOpen(false); setParsedCandidates([]); }}>Cancel</Button>
                <Button 
                  disabled={parsedCandidates.length === 0 || parsedCandidates.some(p => p.status === 'parsing')} 
                  onClick={handleSaveParsed}
                >
                  Save {parsedCandidates.filter(p => p.status === 'success').length} Candidates
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add Candidate
            </Button>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Candidate</DialogTitle>
                <DialogDescription>
                  Enter the candidate's details manually.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Upload CV (Optional)</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="file" 
                      accept=".pdf,.doc,.docx" 
                      onChange={handleCVUpload}
                      disabled={isUploadingCV}
                    />
                    {isUploadingCV && <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Uploading a CV will auto-fill the details below.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="John Doe" 
                      value={newCandidate.name}
                      onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      value={newCandidate.email}
                      onChange={e => setNewCandidate({...newCandidate, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      placeholder="+1 234 567 890" 
                      value={newCandidate.phone}
                      onChange={e => setNewCandidate({...newCandidate, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      placeholder="e.g. New York, NY" 
                      value={newCandidate.location}
                      onChange={e => setNewCandidate({...newCandidate, location: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience (Years)</Label>
                    <Input 
                      id="experience" 
                      type="number" 
                      value={newCandidate.experience}
                      onChange={e => setNewCandidate({...newCandidate, experience: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Input 
                      id="source" 
                      placeholder="e.g. LinkedIn, Referral" 
                      value={newCandidate.source}
                      onChange={e => setNewCandidate({...newCandidate, source: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills (Comma separated)</Label>
                  <Input 
                    id="skills" 
                    placeholder="React, Node.js, SQL" 
                    onChange={e => setNewCandidate({...newCandidate, skills: e.target.value.split(',').map(s => s.trim())})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleAddCandidate}>Save Candidate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex-1 w-full max-w-sm">
          <Input
            placeholder="Filter by skill (e.g., React)..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          />
        </div>
        <Select value={experienceFilter} onValueChange={setExperienceFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Experience Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Experience</SelectItem>
            <SelectItem value="0-2">0-2 years</SelectItem>
            <SelectItem value="3-5">3-5 years</SelectItem>
            <SelectItem value="6-9">6-9 years</SelectItem>
            <SelectItem value="10+">10+ years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{c.experience} years</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="text-xs">{c.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {c.skills?.slice(0, 3).map(skill => (
                        <Badge key={skill} variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {skill}
                        </Badge>
                      ))}
                      {(c.skills?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          +{(c.skills?.length || 0) - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{c.source}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/candidates/${c.id}/screen`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      <BrainCircuit className="h-4 w-4 mr-2" /> Screen
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedProfileId(c.id)}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEmailAction(c, 'invite')}>Send Interview Invite</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEmailAction(c, 'reject')}>Send Rejection</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteCandidate(c.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCandidates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No candidates found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CandidateProfileDialog 
        candidateId={selectedProfileId}
        isOpen={!!selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  );
}
