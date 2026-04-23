/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// TWG MONITORING PORTAL — ROLE-BASED ACCESS CONTROL
// Integrated into Rozgaar platform as /twg-portal route
// Access: Admin = CEO view | Recruiter = Sales Manager view | HiringManager = Wahed/Delivery view

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/src/contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPT_TARGET = 40;
const TOTAL_DELIVERY_TARGET = 280;

const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const depts = ['Safety','Quality','SCM','RFM','IT','ESS','CAD CAM'];

const seed = [
  { name: "Abdullah Qidvai + CA's BD Team", role: 'Central Sales Team',       target: 15, actual: 0 },
  { name: 'Abdullah Qidvai',                role: 'Talent Acquisition',        target: 3,  actual: 0 },
  { name: 'Munawar',                        role: 'Direct Hiring',             target: 3,  actual: 0 },
  { name: 'Tameem',                         role: 'BL Head - GDC Development', target: 3,  actual: 0 },
  { name: 'Muzamil',                        role: 'BL Head - Academic Wing',   target: 3,  actual: 0 },
  { name: 'Wahed',                          role: 'Delivery Operations Head',  target: TOTAL_DELIVERY_TARGET, actual: 0 },
];

type ActivityEntry = { calls: string; meetings: string; leads: string; closures: string; collection: string; remarks: string; };
type TeamMember = { name: string; role: string; target: number; actual: number; };
type AdmissionsMap = Record<string, number>;
type ActivitiesMap = Record<string, ActivityEntry>;

const makeEmptyActivities = (): ActivitiesMap =>
  Object.fromEntries(
    seed.filter(s => s.name !== 'Wahed').map(s => [s.name, { calls:'', meetings:'', leads:'', closures:'', collection:'', remarks:'' }])
  );

const safeParse = (val: string | number | undefined): number => {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? 0 : n;
};

// ─── ACCESS CONFIG ────────────────────────────────────────────────────────────
// Maps Rozgaar roles → TWG portal access profiles
// Admin     → CEO (full access)
// Recruiter → Sales Manager (own data + direct reports)
// HiringManager → Wahed/Delivery (ops/delivery only)
type AccessProfile = {
  isCEO: boolean;
  isDelivery: boolean;
  teamName: string | null;
  canEdit: string[];
  tabs: string[];
  displayRole: string;
};

const getAccessProfile = (rozgaarRole: string, displayName: string): AccessProfile => {
  if (rozgaarRole === 'Admin') {
    return {
      isCEO: true, isDelivery: false, teamName: null, displayRole: 'CEO — Full Access',
      canEdit: seed.map(s => s.name),
      tabs: ['dashboard','team','reports','analysis','bonus','ceo','review','ops','db'],
    };
  }
  if (rozgaarRole === 'HiringManager') {
    return {
      isCEO: false, isDelivery: true, teamName: 'Wahed', displayRole: 'Delivery Ops Head',
      canEdit: [], tabs: ['ops'],
    };
  }
  // Recruiter — match by display name to TWG member
  const nameMap: Record<string, { teamName: string; canEdit: string[]; displayRole: string }> = {
    'Abdullah': { teamName: 'Abdullah Qidvai', canEdit: ["Abdullah Qidvai + CA's BD Team", 'Abdullah Qidvai', 'Munawar'], displayRole: 'Sales Team Lead' },
    'Munawar':  { teamName: 'Munawar',  canEdit: ['Munawar'],  displayRole: 'Direct Hiring' },
    'Tameem':   { teamName: 'Tameem',   canEdit: ['Tameem'],   displayRole: 'BL Head – GDC' },
    'Muzamil':  { teamName: 'Muzamil',  canEdit: ['Muzamil'],  displayRole: 'BL Head – Academic' },
  };
  const firstName = displayName?.split(' ')[0] || '';
  const profile = nameMap[firstName] || { teamName: null, canEdit: [], displayRole: 'Recruiter' };
  return {
    isCEO: false, isDelivery: false,
    teamName: profile.teamName,
    canEdit: profile.canEdit,
    displayRole: profile.displayRole,
    tabs: ['dashboard','team','reports','ops','db'],
  };
};

// ─── Bonus helpers ────────────────────────────────────────────────────────────
const getMemberBonus  = (pct: number) => pct>=125?35000:pct>=100?20000:pct>=90?10000:pct>=70?5000:0;
const getLeaderBonus  = (pct: number) => pct>=100?35000:pct>=90?25000:pct>=70?10000:0;
const getDeliveryTier = (pct: number) => pct>=100?'100% Salary':pct>=85?'50% Salary':pct>=70?'25% Salary':pct>=50?'10% Salary':'No Bonus';

// ─── Sub-components ───────────────────────────────────────────────────────────
function RoleBadge({ label }: { label: string }) {
  return (
    <span className='text-xs font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200'>
      {label}
    </span>
  );
}

function LockedInput({ canEdit, value, onChange, placeholder, type = 'text' }: {
  canEdit: boolean; value: string | number; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string;
}) {
  if (!canEdit) return (
    <div className='w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 flex justify-between'>
      <span>{value || '—'}</span><span className='text-xs'>🔒</span>
    </div>
  );
  return <Input type={type} value={value} onChange={onChange} placeholder={placeholder} />;
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function TWGMonitoring() {
  const { user } = useAuth();
  const access = getAccessProfile(user?.role ?? 'Recruiter', user?.displayName ?? '');

  const [team,          setTeam]         = useState<TeamMember[]>(seed);
  const [month,         setMonth]        = useState('April');
  const [period,        setPeriod]       = useState('Daily');
  const [lastSaved,     setLastSaved]    = useState('');
  const [admissions,    setAdmissions]   = useState<AdmissionsMap>(Object.fromEntries(depts.map(d => [d, 0])));
  const [activities,    setActivities]   = useState<ActivitiesMap>(makeEmptyActivities());
  const [dbStatus,      setDbStatus]     = useState('Live Ready');
  const [apiEndpoint,   setApiEndpoint]  = useState('/api/twg-sync');
  const [attendanceMsg, setAttendanceMsg]= useState('');
  const [reportMsg,     setReportMsg]    = useState('');
  const hasLoaded = useRef(false);

  const canEditMember = (name: string) => access.isCEO || access.canEdit.includes(name);
  const canSeeTab     = (tab: string)  => access.tabs.includes(tab);

  // ── Derived ────────────────────────────────────────────────────────────────
  const revenueTeam     = team.filter(t => t.name !== 'Wahed');
  const totalTarget     = revenueTeam.reduce((a, b) => a + b.target, 0);
  const totalActual     = revenueTeam.reduce((a, b) => a + safeParse(b.actual), 0);
  const totalAdmissions = Object.values(admissions).reduce((a, b) => a + safeParse(b), 0);
  const revenuePct      = Math.min(Math.round((totalActual / (totalTarget || 1)) * 100), 100);
  const deliveryPct     = Math.min(Math.round((totalAdmissions / TOTAL_DELIVERY_TARGET) * 100), 100);
  const memberBonuses   = revenueTeam.map(m => { const pct = Math.round((safeParse(m.actual)/(m.target||1))*100); return {...m, pct, bonus: getMemberBonus(pct)}; });
  const salesBonus      = memberBonuses.reduce((a, m) => a + m.bonus, 0);
  const leaderBonus     = getLeaderBonus(revenuePct);
  const deliveryBonus   = getDeliveryTier(deliveryPct);
  const activityScore   = (name: string) => { const a = activities[name]||{}; return safeParse(a.calls)*1+safeParse(a.meetings)*3+safeParse(a.leads)*5+safeParse(a.closures)*10; };

  const myMember = revenueTeam.find(m => m.name === access.teamName);
  const myActual = myMember ? safeParse(myMember.actual) : 0;
  const myTarget = myMember ? myMember.target : 1;
  const myPct    = Math.min(Math.round((myActual/myTarget)*100), 100);
  const myBonus  = getMemberBonus(myPct);
  const myScore  = myMember ? activityScore(myMember.name) : 0;

  const reviewStats = (() => {
    const scored = revenueTeam.map(m => ({ name: m.name, score: activityScore(m.name), calls: safeParse(activities[m.name]?.calls) }));
    return {
      lowestActivity: [...scored].sort((a,b) => a.score - b.score)[0],
      highestCaller:  [...scored].sort((a,b) => b.calls - a.calls)[0],
      bestConverter:  [...memberBonuses].sort((a,b) => b.pct - a.pct)[0],
      pendingUpdates: revenueTeam.filter(m => safeParse(m.actual) === 0).map(m => m.name),
    };
  })();

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('twg_portal_db');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.team)       setTeam(d.team);
        if (d.admissions) setAdmissions(d.admissions);
        if (d.activities) setActivities(d.activities);
        if (d.month)      setMonth(d.month);
        if (d.period)     setPeriod(d.period);
      } catch (e) { /* start fresh */ }
    }
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    localStorage.setItem('twg_portal_db', JSON.stringify({ team, admissions, activities, month, period, updatedAt: new Date().toISOString() }));
  }, [team, admissions, activities, month, period]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const save = async () => {
    setLastSaved(`${user?.displayName ?? 'User'} saved on ${new Date().toLocaleString()}`);
    try {
      await fetch('/api/save-team-update.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user?.displayName, team, admissions, activities, month, period }),
      });
      setDbStatus('Synced');
    } catch { setDbStatus('Offline Cache'); }
  };

  const updateActual     = (name: string, val: string) => { if (!canEditMember(name)) return; setTeam(prev => prev.map(m => m.name === name ? { ...m, actual: safeParse(val) } : m)); };
  const updateActivity   = (name: string, field: string, val: string) => { if (!canEditMember(name)) return; setActivities(prev => ({ ...prev, [name]: { ...prev[name], [field]: val } })); };
  const updateAdmission  = (dept: string, val: string) => { if (!access.isCEO && !access.isDelivery) return; setAdmissions(prev => ({ ...prev, [dept]: safeParse(val) })); };
  const resetLocalDb     = () => { localStorage.removeItem('twg_portal_db'); setTeam(seed); setAdmissions(Object.fromEntries(depts.map(d => [d, 0]))); setActivities(makeEmptyActivities()); setLastSaved(''); setDbStatus('Reset'); };

  // ── Activity fields sub-component ──────────────────────────────────────────
  const ActivityFields = ({ memberName }: { memberName: string }) => (
    <div className='grid grid-cols-2 gap-1 mt-1'>
      {(['calls','meetings','leads','closures','collection','remarks'] as const).map(f => (
        <LockedInput key={f} canEdit={canEditMember(memberName)}
          value={activities[memberName]?.[f] || ''}
          onChange={e => updateActivity(memberName, f, e.target.value)}
          placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
        />
      ))}
    </div>
  );

  // ── Member card sub-component ───────────────────────────────────────────────
  const MemberCard = ({ m }: { m: TeamMember }) => {
    const canEdit = canEditMember(m.name);
    const pct = Math.min(Math.round((safeParse(m.actual)/(m.target||1))*100), 100);
    return (
      <div className={`border rounded-lg p-3 space-y-2 ${canEdit ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
        <div className='flex items-center justify-between'>
          <div className='font-medium text-sm'>{m.name}</div>
          {canEdit ? (!access.isCEO && <span className='text-xs text-green-600'>✏️ Editable</span>) : <span className='text-xs text-gray-400'>🔒 View only</span>}
        </div>
        <div className='text-xs text-gray-500'>Target: {m.target}L | Achieved: {m.actual}L | {pct}%</div>
        <Progress value={pct} className='h-1.5' />
        <LockedInput canEdit={canEdit} type='number' value={m.actual} onChange={e => updateActual(m.name, e.target.value)} placeholder='Achieved (L)' />
        <ActivityFields memberName={m.name} />
        <div className='text-xs text-green-600 font-medium'>Activity Score: {activityScore(m.name)}</div>
      </div>
    );
  };

  // ── WAHED / DELIVERY VIEW ──────────────────────────────────────────────────
  if (access.isDelivery) return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-red-700'>Delivery Operations Dashboard</h1>
          <p className='text-sm text-muted-foreground'>TWG Monitoring Portal</p>
        </div>
        <RoleBadge label={access.displayRole} />
      </div>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Total Admissions</div><div className='text-2xl font-bold text-red-700'>{totalAdmissions}</div><Progress value={deliveryPct} className='mt-2'/><div className='text-xs text-gray-400 mt-1'>{deliveryPct}% of {TOTAL_DELIVERY_TARGET}</div></CardContent></Card>
        <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Delivery Bonus</div><div className='text-lg font-bold text-green-600'>{deliveryBonus}</div></CardContent></Card>
        <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Month</div><div className='text-lg font-bold'>{month}</div></CardContent></Card>
        <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Period</div><div className='text-lg font-bold'>{period}</div></CardContent></Card>
      </div>
      <div className='grid md:grid-cols-2 gap-3'>
        <Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Daily','Weekly','Monthly','Quarterly','Yearly'].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
      </div>
      <Card><CardContent className='p-4 space-y-3'>
        <h3 className='font-bold text-red-700'>Department Admissions</h3>
        <div className='grid md:grid-cols-2 gap-3'>
          {depts.map(d => {
            const val = safeParse(admissions[d]); const pct = Math.min(Math.round((val/DEPT_TARGET)*100),100);
            return (
              <div key={d} className='border rounded-lg p-3 space-y-2'>
                <div className='flex justify-between'><span className='font-medium text-sm'>{d}</span><span className={`text-xs font-medium ${pct>=100?'text-green-600':pct>=70?'text-yellow-600':'text-red-500'}`}>{pct}%</span></div>
                <Progress value={pct} className='h-1.5'/>
                <div className='text-xs text-gray-500'>{val}/{DEPT_TARGET} | {getDeliveryTier(pct)}</div>
                <Input type='number' value={admissions[d]} onChange={e=>updateAdmission(d,e.target.value)} placeholder='Admissions count'/>
              </div>
            );
          })}
        </div>
        <Button onClick={save}>Save</Button>
        {lastSaved && <div className='text-xs text-gray-500'>{lastSaved}</div>}
      </CardContent></Card>
      <Card><CardContent className='p-4 space-y-2'>
        <h3 className='font-bold text-red-700'>Attendance</h3>
        <Button onClick={()=>setAttendanceMsg(`Attendance marked at ${new Date().toLocaleTimeString()}`)}>Mark Attendance</Button>
        {attendanceMsg && <div className='text-xs text-green-600'>{attendanceMsg}</div>}
      </CardContent></Card>
    </div>
  );

  // ── MAIN VIEW (CEO + Sales Managers) ──────────────────────────────────────
  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div>
          <h1 className='text-2xl font-bold text-red-700'>TWG Monitoring Portal</h1>
          <p className='text-sm text-muted-foreground'>portal.technoworldgroup.com | {dbStatus}</p>
        </div>
        <RoleBadge label={access.displayRole} />
      </div>

      <div className='grid md:grid-cols-2 gap-3'>
        <Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Daily','Weekly','Monthly','Quarterly','Yearly'].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
      </div>

      <Tabs defaultValue={access.tabs[0] || 'dashboard'}>
        <TabsList className='flex flex-wrap gap-1'>
          {canSeeTab('dashboard') && <TabsTrigger value='dashboard'>Dashboard</TabsTrigger>}
          {canSeeTab('team')      && <TabsTrigger value='team'>Team</TabsTrigger>}
          {canSeeTab('reports')   && <TabsTrigger value='reports'>Reports</TabsTrigger>}
          {canSeeTab('analysis')  && <TabsTrigger value='analysis'>Analysis</TabsTrigger>}
          {canSeeTab('bonus')     && <TabsTrigger value='bonus'>Bonus</TabsTrigger>}
          {canSeeTab('ceo')       && <TabsTrigger value='ceo'>CEO</TabsTrigger>}
          {canSeeTab('review')    && <TabsTrigger value='review'>Review</TabsTrigger>}
          {canSeeTab('ops')       && <TabsTrigger value='ops'>Ops</TabsTrigger>}
          {canSeeTab('db')        && <TabsTrigger value='db'>DB</TabsTrigger>}
        </TabsList>

        {/* DASHBOARD */}
        {canSeeTab('dashboard') && <TabsContent value='dashboard'><div className='space-y-4 mt-4'>
          {access.isCEO ? (
            <div className='grid md:grid-cols-4 gap-4'>
              <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Total Revenue</div><div className='text-2xl font-bold text-red-700'>{totalActual}L</div><Progress value={revenuePct} className='mt-2'/><div className='text-xs text-gray-400 mt-1'>{revenuePct}% of {totalTarget}L</div></CardContent></Card>
              <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Total Admissions</div><div className='text-2xl font-bold text-red-700'>{totalAdmissions}</div><Progress value={deliveryPct} className='mt-2'/><div className='text-xs text-gray-400 mt-1'>{deliveryPct}% of {TOTAL_DELIVERY_TARGET}</div></CardContent></Card>
              <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Bonus Cost</div><div className='text-2xl font-bold text-green-600'>₹{(salesBonus+leaderBonus).toLocaleString()}</div></CardContent></Card>
              <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Status</div><div className={`text-2xl font-bold ${revenuePct>=70?'text-green-600':'text-red-600'}`}>{revenuePct>=70?'On Track':'Focus'}</div></CardContent></Card>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='text-sm font-medium text-gray-600'>Your Performance — {month} ({period})</div>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>My Revenue</div><div className='text-2xl font-bold text-red-700'>{myActual}L</div><Progress value={myPct} className='mt-2'/><div className='text-xs text-gray-400 mt-1'>{myPct}% of {myTarget}L</div></CardContent></Card>
                <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>My Bonus</div><div className='text-xl font-bold text-green-600'>₹{myBonus.toLocaleString()}</div></CardContent></Card>
                <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Activity Score</div><div className='text-2xl font-bold text-blue-600'>{myScore}</div></CardContent></Card>
                <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Status</div><div className={`text-lg font-bold ${myPct>=70?'text-green-600':'text-red-600'}`}>{myPct>=100?'🎯 Target Hit':myPct>=70?'✅ On Track':'⚠️ Below Target'}</div></CardContent></Card>
              </div>
              <Card><CardContent className='p-4'>
                <div className='text-xs font-medium text-gray-500 mb-2'>Team Overview (totals only)</div>
                <div className='flex flex-wrap gap-6 text-sm'>
                  <div><span className='text-gray-500'>Team Revenue:</span> <span className='font-bold text-red-700'>{totalActual}L</span></div>
                  <div><span className='text-gray-500'>Team Target:</span> <span className='font-bold'>{totalTarget}L</span></div>
                  <div><span className='text-gray-500'>Progress:</span> <span className={`font-bold ${revenuePct>=70?'text-green-600':'text-red-600'}`}>{revenuePct}%</span></div>
                </div>
                <Progress value={revenuePct} className='mt-2 h-1.5'/>
              </CardContent></Card>
            </div>
          )}
        </div></TabsContent>}

        {/* TEAM */}
        {canSeeTab('team') && <TabsContent value='team'><div className='space-y-4 mt-4'>
          <Card><CardContent className='p-4'>
            <h3 className='font-bold text-red-700'>Activity Tracker</h3>
            <div className='text-sm text-gray-500 mt-1'>{access.isCEO ? 'Full team visibility. All rows editable.' : `Editable: ${access.canEdit.join(', ')}. Others view-only 🔒`}</div>
          </CardContent></Card>
          <div className='grid lg:grid-cols-3 gap-4'>
            <Card><CardContent className='p-4 space-y-3'><h3 className='font-bold text-red-700'>Central Sales</h3>{revenueTeam.slice(0,3).map(m=><MemberCard key={m.name} m={m}/>)}<Button onClick={save}>Save</Button></CardContent></Card>
            <Card><CardContent className='p-4 space-y-3'><h3 className='font-bold text-red-700'>BL Heads</h3>{revenueTeam.slice(3,5).map(m=><MemberCard key={m.name} m={m}/>)}<Button onClick={save}>Save</Button></CardContent></Card>
            <Card><CardContent className='p-4 space-y-2'>
              <h3 className='font-bold text-red-700'>Delivery</h3>
              {!access.isCEO && <div className='text-xs text-gray-400 mb-2'>🔒 View only — managed by Wahed</div>}
              {depts.map(d => {
                const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100);
                return (
                  <div key={d} className='space-y-1'>
                    <div className='flex justify-between text-sm'><span className='font-medium'>{d}</span><span className='text-xs text-gray-500'>{val}/{DEPT_TARGET} ({pct}%)</span></div>
                    <Progress value={pct} className='h-1.5'/>
                    {access.isCEO ? <Input type='number' value={admissions[d]} onChange={e=>updateAdmission(d,e.target.value)}/> : <div className='text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-1'>{val} admissions</div>}
                  </div>
                );
              })}
              {access.isCEO && <Button onClick={save}>Save</Button>}
            </CardContent></Card>
          </div>
          {lastSaved && <div className='text-xs text-gray-500'>{lastSaved}</div>}
        </div></TabsContent>}

        {/* REPORTS */}
        {canSeeTab('reports') && <TabsContent value='reports'>
          <Card className='mt-4'><CardContent className='p-4 space-y-4'>
            <h3 className='font-bold text-red-700'>{access.isCEO?'Full Team Report':'My Report'} — {period} / {month}</h3>
            <table className='w-full text-sm'>
              <thead><tr className='border-b text-left text-gray-500 text-xs'><th className='py-1 pr-2'>Member</th><th>Target</th><th>Actual</th><th>%</th><th>Score</th>{access.isCEO&&<th>Bonus</th>}</tr></thead>
              <tbody>
                {memberBonuses.filter(m=>access.isCEO||access.canEdit.includes(m.name)).map((m,i)=>(
                  <tr key={i} className='border-b'>
                    <td className='py-1.5 pr-2'>{m.name}</td><td>{m.target}L</td><td>{m.actual}L</td>
                    <td className={m.pct>=70?'text-green-600':'text-red-500'}>{m.pct}%</td>
                    <td>{activityScore(m.name)}</td>
                    {access.isCEO&&<td className='text-green-600'>₹{m.bonus.toLocaleString()}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>}

        {/* ANALYSIS — CEO only */}
        {canSeeTab('analysis') && <TabsContent value='analysis'>
          <div className='grid md:grid-cols-2 gap-4 mt-4'>
            <Card><CardContent className='p-4'><div className='font-medium mb-1'>Sales Performance</div><div className='text-2xl font-bold text-red-700'>{revenuePct}%</div><Progress value={revenuePct}/><div className='text-xs text-gray-400 mt-1'>{totalActual}L / {totalTarget}L</div></CardContent></Card>
            <Card><CardContent className='p-4'><div className='font-medium mb-1'>Delivery Performance</div><div className='text-2xl font-bold text-red-700'>{deliveryPct}%</div><Progress value={deliveryPct}/><div className='text-xs text-gray-400 mt-1'>{totalAdmissions} / {TOTAL_DELIVERY_TARGET}</div></CardContent></Card>
          </div>
        </TabsContent>}

        {/* BONUS — CEO only */}
        {canSeeTab('bonus') && <TabsContent value='bonus'>
          <div className='space-y-4 mt-4'>
            <div className='grid md:grid-cols-3 gap-4'>
              <Card><CardContent className='p-4'>Total Sales Bonus<div className='text-2xl font-bold text-green-600'>₹{salesBonus.toLocaleString()}</div></CardContent></Card>
              <Card><CardContent className='p-4'>Leader Bonus<div className='text-2xl font-bold text-green-600'>₹{leaderBonus.toLocaleString()}</div><div className='text-xs text-gray-400'>100%→₹35k | 90%→₹25k | 70%→₹10k</div></CardContent></Card>
              <Card><CardContent className='p-4'>Delivery Leader Bonus<div className='text-xl font-bold text-green-600'>{deliveryBonus}</div></CardContent></Card>
            </div>
            <div className='grid lg:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>Sales Bonus — All Members</h3>
                {memberBonuses.map((m,i)=><div key={i} className='grid grid-cols-12 text-sm border-b py-1'><div className='col-span-6'>{m.name}</div><div className='col-span-2'>{m.pct}%</div><div className='col-span-4 text-right text-green-600'>₹{m.bonus.toLocaleString()}</div></div>)}
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>Delivery Bonus — All Depts</h3>
                {depts.map((d,i)=>{ const val=safeParse(admissions[d]); const pct=Math.round((val/DEPT_TARGET)*100); return <div key={i} className='grid grid-cols-12 text-sm border-b py-1'><div className='col-span-5'>{d}</div><div className='col-span-3'>{val}/{DEPT_TARGET}</div><div className='col-span-4 text-right text-green-600'>{getDeliveryTier(pct)}</div></div>; })}
              </CardContent></Card>
            </div>
          </div>
        </TabsContent>}

        {/* CEO TAB */}
        {canSeeTab('ceo') && <TabsContent value='ceo'>
          <div className='grid md:grid-cols-4 gap-4 mt-4'>
            <Card><CardContent className='p-4'>Revenue<div className='text-2xl font-bold text-red-700'>{totalActual}L</div></CardContent></Card>
            <Card><CardContent className='p-4'>Admissions<div className='text-2xl font-bold text-red-700'>{totalAdmissions}</div></CardContent></Card>
            <Card><CardContent className='p-4'>Bonus Cost<div className='text-2xl font-bold text-green-600'>₹{(salesBonus+leaderBonus).toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className='p-4'>Period<div className='text-2xl font-bold text-red-700'>{period}</div></CardContent></Card>
          </div>
        </TabsContent>}

        {/* REVIEW */}
        {canSeeTab('review') && <TabsContent value='review'>
          <div className='grid md:grid-cols-2 gap-4 mt-4'>
            <Card><CardContent className='p-4 space-y-2'>
              <h3 className='font-bold text-red-700'>CEO Daily Review Panel</h3>
              <div className='text-sm'><span className='text-gray-500'>Lowest Activity: </span>{reviewStats.lowestActivity?`${reviewStats.lowestActivity.name} (score: ${reviewStats.lowestActivity.score})`:'No data'}</div>
              <div className='text-sm'><span className='text-gray-500'>Highest Caller: </span>{reviewStats.highestCaller?`${reviewStats.highestCaller.name} (${reviewStats.highestCaller.calls} calls)`:'No data'}</div>
              <div className='text-sm'><span className='text-gray-500'>Best Converter: </span>{reviewStats.bestConverter?`${reviewStats.bestConverter.name} (${reviewStats.bestConverter.pct}%)`:'No data'}</div>
              <div className='text-sm'><span className='text-gray-500'>Pending Updates: </span>{reviewStats.pendingUpdates.length>0?reviewStats.pendingUpdates.join(', '):'All updated ✓'}</div>
            </CardContent></Card>
            <Card><CardContent className='p-4 space-y-2'>
              <h3 className='font-bold text-red-700'>WhatsApp Auto Reports</h3>
              <Button className='mt-2' onClick={()=>setReportMsg(`Report queued at ${new Date().toLocaleTimeString()}`)}>Send Report</Button>
              {reportMsg && <div className='text-xs text-green-600 mt-1'>{reportMsg}</div>}
            </CardContent></Card>
          </div>
        </TabsContent>}

        {/* OPS */}
        {canSeeTab('ops') && <TabsContent value='ops'>
          <div className='grid md:grid-cols-2 gap-4 mt-4'>
            <Card><CardContent className='p-4 space-y-2'>
              <h3 className='font-bold text-red-700'>Attendance with GPS</h3>
              <Button className='mt-2' onClick={()=>setAttendanceMsg(`Attendance marked at ${new Date().toLocaleTimeString()}`)}>Mark Attendance</Button>
              {attendanceMsg && <div className='text-xs text-green-600 mt-1'>{attendanceMsg}</div>}
            </CardContent></Card>
            <Card><CardContent className='p-4'>
              <h3 className='font-bold text-red-700'>AI Forecasting</h3>
              <div className='text-sm'>Projected Revenue: {Math.round(totalActual*1.15)}L</div>
              <div className='text-sm'>Projected Admissions: {Math.round(totalAdmissions*1.1)}</div>
            </CardContent></Card>
          </div>
        </TabsContent>}

        {/* DB */}
        {canSeeTab('db') && <TabsContent value='db'>
          <div className='grid md:grid-cols-2 gap-4 mt-4'>
            <Card><CardContent className='p-4 space-y-2'>
              <h3 className='font-bold text-red-700'>Database Sync</h3>
              <div className='text-sm'>Status: <span className='font-medium'>{dbStatus}</span></div>
              <Input className='mt-1' value={apiEndpoint} onChange={e=>setApiEndpoint(e.target.value)} placeholder='API Endpoint'/>
              <div className='flex gap-2 mt-2'>
                {access.isCEO && <Button onClick={resetLocalDb}>Reset Local DB</Button>}
                <Button variant='outline' onClick={()=>setDbStatus('Sync Requested')}>Test Sync</Button>
              </div>
            </CardContent></Card>
            <Card><CardContent className='p-4'>
              <h3 className='font-bold text-red-700'>Stored Modules</h3>
              {['Team Data','Admissions','Activities','Month & Period','MySQL Sessions'].map(item=><div key={item} className='text-sm'>{item}</div>)}
            </CardContent></Card>
          </div>
        </TabsContent>}
      </Tabs>
    </div>
  );
}
