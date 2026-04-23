/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Target, Clock, TrendingUp, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/src/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

// Mock Data
const RECRUITERS = [
  { id: 'all', name: 'All Recruiters' },
  { id: 'r1', name: 'Sarah Jenkins' },
  { id: 'r2', name: 'Michael Chen' },
  { id: 'r3', name: 'Emily Davis' },
];

const PERFORMANCE_DATA: Record<string, any> = {
  'all': {
    sourced: 850, screened: 520, interviewed: 210, placed: 45,
    timeToFill: 22,
    funnel: [
      { stage: 'Sourced', count: 850 },
      { stage: 'Screened', count: 520 },
      { stage: 'Interviewed', count: 210 },
      { stage: 'Placed', count: 45 },
    ],
    timeToFillTrend: [
      { month: 'Jan', days: 28 }, { month: 'Feb', days: 26 }, { month: 'Mar', days: 24 }, { month: 'Apr', days: 22 }
    ]
  },
  'r1': {
    sourced: 320, screened: 210, interviewed: 95, placed: 22,
    timeToFill: 18,
    funnel: [
      { stage: 'Sourced', count: 320 },
      { stage: 'Screened', count: 210 },
      { stage: 'Interviewed', count: 95 },
      { stage: 'Placed', count: 22 },
    ],
    timeToFillTrend: [
      { month: 'Jan', days: 24 }, { month: 'Feb', days: 21 }, { month: 'Mar', days: 19 }, { month: 'Apr', days: 18 }
    ]
  },
  'r2': {
    sourced: 280, screened: 160, interviewed: 65, placed: 12,
    timeToFill: 25,
    funnel: [
      { stage: 'Sourced', count: 280 },
      { stage: 'Screened', count: 160 },
      { stage: 'Interviewed', count: 65 },
      { stage: 'Placed', count: 12 },
    ],
    timeToFillTrend: [
      { month: 'Jan', days: 29 }, { month: 'Feb', days: 28 }, { month: 'Mar', days: 26 }, { month: 'Apr', days: 25 }
    ]
  },
  'r3': {
    sourced: 250, screened: 150, interviewed: 50, placed: 11,
    timeToFill: 24,
    funnel: [
      { stage: 'Sourced', count: 250 },
      { stage: 'Screened', count: 150 },
      { stage: 'Interviewed', count: 50 },
      { stage: 'Placed', count: 11 },
    ],
    timeToFillTrend: [
      { month: 'Jan', days: 27 }, { month: 'Feb', days: 26 }, { month: 'Mar', days: 25 }, { month: 'Apr', days: 24 }
    ]
  }
};

import { useData } from '@/src/contexts/DataContext';

export default function RecruiterPerformance() {
  const [selectedRecruiter, setSelectedRecruiter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '2026-01-01', end: '2026-04-09' });
  const { user } = useAuth();
  const { applications, candidates } = useData();

  if (user?.role === 'HiringManager') {
    return <Navigate to="/" replace />;
  }

  // Generate dynamic data from context
  const data = useMemo(() => {
    // Note: To filter by date, we will assume applications.updatedAt handles the stage logic
    const startDate = new Date(dateRange.start).getTime();
    const endDate = new Date(dateRange.end).getTime() + 86400000; // include end of day

    const filteredApps = applications.filter(app => {
      const matchRecruiter = selectedRecruiter === 'all' ? true : true; // In a full implementation, app needs recruiterId mapping
      const matchDate = app.updatedAt >= startDate && app.updatedAt <= endDate;
      return matchRecruiter && matchDate;
    });

    const sourcedCount = candidates.filter(c => c.createdAt >= startDate && c.createdAt <= endDate).length;
    const screenedCount = filteredApps.filter(a => ['Shortlisted', 'Interview', 'Offered', 'Joined'].includes(a.status)).length;
    const interviewedCount = filteredApps.filter(a => ['Interview', 'Offered', 'Joined'].includes(a.status)).length;
    const placedCount = filteredApps.filter(a => a.status === 'Joined').length;

    return {
      sourced: sourcedCount,
      screened: screenedCount,
      interviewed: interviewedCount,
      placed: placedCount,
      timeToFill: 22, // Static fallback as calculating this requires historical stage change timestamps
      funnel: [
        { stage: 'Sourced', count: sourcedCount },
        { stage: 'Screened', count: screenedCount },
        { stage: 'Interviewed', count: interviewedCount },
        { stage: 'Placed', count: placedCount },
      ],
      timeToFillTrend: [
        { month: 'Jan', days: 28 }, { month: 'Feb', days: 26 }, { month: 'Mar', days: 24 }, { month: 'Apr', days: 22 }
      ]
    };
  }, [applications, candidates, selectedRecruiter, dateRange]);

  const conversionRate = data.sourced > 0 ? ((data.placed / data.sourced) * 100).toFixed(1) : "0.0";
  const screeningRate = data.sourced > 0 ? ((data.screened / data.sourced) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruiter Performance</h1>
          <p className="text-muted-foreground">Track individual recruiter metrics and conversion rates.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent border-none text-sm outline-none w-[110px]"
            />
            <span className="text-muted-foreground">-</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent border-none text-sm outline-none w-[110px]"
            />
          </div>

          <Select value={selectedRecruiter} onValueChange={setSelectedRecruiter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Recruiter" />
            </SelectTrigger>
            <SelectContent>
              {RECRUITERS.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates Sourced</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.sourced}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates Placed</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.placed}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% overall conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Screening Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{screeningRate}%</div>
            <p className="text-xs text-muted-foreground">{data.screened} candidates screened</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Fill</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.timeToFill} Days</div>
            <p className="text-xs text-muted-foreground">From opening to placement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Funnel Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recruitment Funnel</CardTitle>
            <CardDescription>Conversion across stages for {RECRUITERS.find(r => r.id === selectedRecruiter)?.name}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.funnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={80} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={32}>
                  {data.funnel.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time to Fill Trend */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Time-to-Fill Trend</CardTitle>
            <CardDescription>Average days to close a role</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeToFillTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value} Days`, 'Time to Fill']}
                />
                <Area type="monotone" dataKey="days" stroke="#f97316" fillOpacity={1} fill="url(#colorTime)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recruiter Breakdown Table (Only show if 'all' is selected) */}
      {selectedRecruiter === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>Team Performance Breakdown</CardTitle>
            <CardDescription>Compare metrics across all recruiters</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recruiter</TableHead>
                  <TableHead className="text-right">Sourced</TableHead>
                  <TableHead className="text-right">Screened</TableHead>
                  <TableHead className="text-right">Placed</TableHead>
                  <TableHead className="text-right">Conversion Rate</TableHead>
                  <TableHead className="text-right">Avg Time-to-Fill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECRUITERS.filter(r => r.id !== 'all').map(recruiter => {
                  const rData = PERFORMANCE_DATA[recruiter.id];
                  const rConv = ((rData.placed / rData.sourced) * 100).toFixed(1);
                  return (
                    <TableRow key={recruiter.id}>
                      <TableCell className="font-medium">{recruiter.name}</TableCell>
                      <TableCell className="text-right">{rData.sourced}</TableCell>
                      <TableCell className="text-right">{rData.screened}</TableCell>
                      <TableCell className="text-right">{rData.placed}</TableCell>
                      <TableCell className="text-right">{rConv}%</TableCell>
                      <TableCell className="text-right">{rData.timeToFill} Days</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
