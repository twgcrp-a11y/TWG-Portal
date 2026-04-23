/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'Admin' | 'Recruiter' | 'HiringManager' | 'Guest';

export type Invitation = {
  id: string;
  email: string;
  role: Role;
  status: 'Pending' | 'Accepted';
  createdAt: number;
};

export type User = {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  assignedJobs?: string[]; // For Hiring Managers
  createdAt?: number;
};

export type Client = {
  id: string;
  name: string;
  contactPerson: string;
  contactDesignation?: string;
  mobile: string;
  email: string;
  website?: string;
  logo?: string;
  address: string;
  industry: string;
  notes?: string;
  createdAt: number;
};

export type JobStatus = 'Open' | 'Closed';
export type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';

export type Job = {
  id: string;
  clientId: string;
  clientName: string;
  roleTitle: string;
  description: string;
  skillsRequired: string[];
  experienceRequired: number;
  salaryRange: string;
  openings: number;
  location: string;
  jobType: JobType;
  status: JobStatus;
  createdAt: number;
};

export type Candidate = {
  id: string;
  name: string;
  phone: string;
  email: string;
  skills: string[];
  experience: number;
  location: string;
  resumeUrl?: string;
  source: string;
  tags: string[];
  parsedData?: any;
  createdAt: number;
};

export type PipelineStatus = 'Shortlisted' | 'Interview' | 'Offered' | 'Joined' | 'Dropped';

export type ActivityLog = {
  id: string;
  candidateId: string;
  action: string;
  details: string;
  userName: string;
  timestamp: number;
};

export type Application = {
  id: string;
  candidateId: string;
  jobId: string;
  status: PipelineStatus;
  notes?: string;
  matchScore?: number;
  interviewDetails?: {
    date: string;
    time: string;
    interviewer: string;
    location: string;
  };
  updatedAt: number;
  createdAt: number;
};

export type ScreeningResult = {
  id: string;
  candidateId: string;
  jobId: string;
  score: number;
  notes: string;
  status: 'Relevant' | 'Rejected' | 'Hold';
  createdAt: number;
};
