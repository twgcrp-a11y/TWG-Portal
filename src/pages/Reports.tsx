/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/src/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const SOURCE_DATA = [
  { name: 'LinkedIn', value: 450 },
  { name: 'Referral', value: 300 },
  { name: 'Indeed', value: 200 },
  { name: 'Direct', value: 150 },
  { name: 'Others', value: 140 },
];

const MONTHLY_DATA = [
  { month: 'Jan', candidates: 120, placements: 5 },
  { month: 'Feb', candidates: 150, placements: 8 },
  { month: 'Mar', candidates: 180, placements: 12 },
  { month: 'Apr', candidates: 220, placements: 15 },
  { month: 'May', candidates: 250, placements: 18 },
  { month: 'Jun', candidates: 300, placements: 22 },
];

import { useData } from '@/src/contexts/DataContext';

const COLORS = ['#2563eb', '#7c3aed', '#ea580c', '#16a34a', '#dc2626'];

export default function Reports() {
  const { user } = useAuth();
  const { applications, candidates } = useData();

  if (user?.role === 'HiringManager') {
    return <Navigate to="/" replace />;
  }

  const pipelineData = React.useMemo(() => {
    return [
      { stage: 'Shortlisted', count: applications.filter(a => a.status === 'Shortlisted').length },
      { stage: 'Interview', count: applications.filter(a => a.status === 'Interview').length },
      { stage: 'Offered', count: applications.filter(a => a.status === 'Offered').length },
      { stage: 'Joined', count: applications.filter(a => a.status === 'Joined').length },
    ];
  }, [applications]);

  const sourceData = React.useMemo(() => {
    const sources: Record<string, number> = {};
    candidates.forEach(c => {
      const source = c.source || 'Other';
      sources[source] = (sources[source] || 0) + 1;
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [candidates]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground">Monitor your recruitment performance and conversion rates.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" /> Last 30 Days
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Screening Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">+4% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Hire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18 Days</div>
            <p className="text-xs text-muted-foreground">-2 days from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Offer Acceptance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82%</div>
            <p className="text-xs text-muted-foreground">+1.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cost per Hire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,240</div>
            <p className="text-xs text-muted-foreground">Stable</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recruitment Funnel</CardTitle>
            <CardDescription>Candidate progression through stages</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Candidate Sources</CardTitle>
            <CardDescription>Where your talent comes from</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData.length ? sourceData : [{ name: 'No Data', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(sourceData.length ? sourceData : [{ name: 'No Data', value: 1 }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={sourceData.length ? COLORS[index % COLORS.length] : '#e2e8f0'} />
                  ))}
                </Pie>
                {sourceData.length > 0 && (
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {sourceData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Growth Trends</CardTitle>
          <CardDescription>Monthly candidate and placement volume</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MONTHLY_DATA}>
              <defs>
                <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="candidates" 
                stroke="#2563eb" 
                fillOpacity={1} 
                fill="url(#colorCandidates)" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="placements" 
                stroke="#16a34a" 
                strokeWidth={2} 
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
