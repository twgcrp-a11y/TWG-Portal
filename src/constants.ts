/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PIPELINE_STAGES: { id: string; label: string; color: string }[] = [
  { id: 'Shortlisted', label: 'Shortlisted', color: 'bg-blue-100 text-blue-700' },
  { id: 'Interview', label: 'Interview', color: 'bg-purple-100 text-purple-700' },
  { id: 'Offered', label: 'Offered', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'Joined', label: 'Joined', color: 'bg-green-100 text-green-700' },
  { id: 'Dropped', label: 'Dropped', color: 'bg-red-100 text-red-700' },
];

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
export const JOB_STATUSES = ['Open', 'Closed'];
