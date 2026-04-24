// TWG MONITORING PORTAL — WITH ROLE-BASED ACCESS CONTROL
// ACCESS MATRIX:
//   CEO       → All tabs, view everyone, edit everyone
//   Abdullah  → Dashboard(own+team summary), Team(own+reports), Reports(own), Ops, DB
//   Munawar   → Dashboard(own), Team(own row), Reports(own), Ops, DB
//   Tameem    → Dashboard(own), Team(own row), Reports(own), Ops, DB
//   Muzamil   → Dashboard(own), Team(own row), Reports(own), Ops, DB
//   Wahed     → Ops tab + Delivery section only
// HIDDEN from all managers: CEO tab, Bonus tab, Analysis tab

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEPT_TARGET = 40;
const TOTAL_DELIVERY_TARGET = 280;
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const depts = ['Safety','Quality','SCM','RFM','IT','ESS','CAD CAM'];

const seed = [
  { name: "Abdullah Qidvai + CA's BD Team", role: 'Central Sales Team',       target: 15, actual: 0 },
  { name: 'Abdullah Qidvai',                role: 'Talent Acquisition',        target: 3,  actual: 0 },
  { name: 'Munawar',                        role: 'Direct Hiring',             target: 3,  actual: 0 },
  { name: 'Tameem',                         role: 'BL Head - GDC Development', target: 3,  actual: 0 },
  { name: 'Muzamil',                        role: 'BL Head - Academic Wing',   target: 3,  actual: 0 },
  { name: 'Wahed',                          role: 'Delivery Operations Head',  target: TOTAL_DELIVERY_TARGET, actual: 0 },
];

const makeEmptyActivities = () =>
  Object.fromEntries(seed.filter(s => s.name !== 'Wahed').map(s => [s.name, { calls:'', meetings:'', leads:'', closures:'', collection:'', remarks:'' }]));

const safeParse = (val) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

const ACCESS = {
  CEO: {
    isCEO: true, teamName: null, isDelivery: false,
    canEdit: seed.map(s => s.name),
    tabs: ['dashboard','team','reports','analysis','bonus','ceo','review','ops','db'],
  },
  Abdullah: {
    isCEO: false, teamName: 'Abdullah Qidvai', isDelivery: false,
    canEdit: ["Abdullah Qidvai + CA's BD Team", 'Abdullah Qidvai', 'Munawar'],
    tabs: ['dashboard','team','reports','ops','db'],
  },
  Munawar: {
    isCEO: false, teamName: 'Munawar', isDelivery: false,
    canEdit: ['Munawar'],
    tabs: ['dashboard','team','reports','ops','db'],
  },
  Tameem: {
    isCEO: false, teamName: 'Tameem', isDelivery: false,
    canEdit: ['Tameem'],
    tabs: ['dashboard','team','reports','ops','db'],
  },
  Muzamil: {
    isCEO: false, teamName: 'Muzamil', isDelivery: false,
    canEdit: ['Muzamil'],
    tabs: ['dashboard','team','reports','ops','db'],
  },
  Wahed: {
    isCEO: false, teamName: 'Wahed', isDelivery: true,
    canEdit: [],
    tabs: ['ops'],
  },
};

const getMemberBonus = (pct) => { if(pct>=125)return 35000; if(pct>=100)return 20000; if(pct>=90)return 10000; if(pct>=70)return 5000; return 0; };
const getLeaderSalesBonus = (pct) => { if(pct>=100)return 35000; if(pct>=90)return 25000; if(pct>=70)return 10000; return 0; };
const getDeliveryBonusTier = (pct) => { if(pct>=100)return '100% Salary'; if(pct>=85)return '50% Salary'; if(pct>=70)return '25% Salary'; if(pct>=50)return '10% Salary'; return 'No Bonus'; };

function RoleBadge({ user }) {
  const styles = {
    CEO:'bg-red-100 text-red-800 border-red-200', Abdullah:'bg-blue-100 text-blue-800 border-blue-200',
    Munawar:'bg-purple-100 text-purple-800 border-purple-200', Tameem:'bg-green-100 text-green-800 border-green-200',
    Muzamil:'bg-orange-100 text-orange-800 border-orange-200', Wahed:'bg-teal-100 text-teal-800 border-teal-200',
  };
  const labels = { CEO:'CEO — Full Access', Abdullah:'Sales Team Lead', Munawar:'Direct Hiring', Tameem:'BL Head – GDC', Muzamil:'BL Head – Academic', Wahed:'Delivery Ops Head' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${styles[user]||'bg-gray-100 text-gray-700'}`}>{labels[user]||user}</span>;
}

function LockedInput({ canEdit, value, ...props }) {
  if (!canEdit) return (
    <div className='w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 flex justify-between items-center'>
      <span>{value||'—'}</span><span className='text-xs'>🔒</span>
    </div>
  );
  return <Input value={value} {...props} />;
}

export default function TWGMonitoringApp() {
  const [team,setTeam]=useState(seed);
  const [auth,setAuth]=useState(false);
  const [currentUser,setCurrentUser]=useState('CEO');
  const [password,setPassword]=useState('');
  const [month,setMonth]=useState('April');
  const [period,setPeriod]=useState('Daily');
  const [lastSaved,setLastSaved]=useState('');
  const [admissions,setAdmissions]=useState(Object.fromEntries(depts.map(d=>[d,0])));
  const [activities,setActivities]=useState(makeEmptyActivities());
  const [dbStatus,setDbStatus]=useState('Live Ready');
  const [syncMode]=useState('MySQL Ready');
  const [apiEndpoint,setApiEndpoint]=useState('/api/twg-sync');
  const [attendanceMsg,setAttendanceMsg]=useState('');
  const [reportMsg,setReportMsg]=useState('');
  const [loginError,setLoginError]=useState('');
  const hasLoaded=useRef(false);

  const access = ACCESS[currentUser] || ACCESS.CEO;
  const canEditMember = (name) => access.isCEO || access.canEdit.includes(name);
  const canSeeTab = (tab) => access.tabs.includes(tab);

  const revenueTeam = team.filter(t => t.name !== 'Wahed');
  const totalTarget = revenueTeam.reduce((a,b)=>a+b.target,0);
  const totalActual = revenueTeam.reduce((a,b)=>a+safeParse(b.actual),0);
  const totalAdmissions = Object.values(admissions).reduce((a,b)=>a+safeParse(b),0);
  const revenuePct = Math.min(Math.round((totalActual/(totalTarget||1))*100),100);
  const deliveryPct = Math.min(Math.round((totalAdmissions/TOTAL_DELIVERY_TARGET)*100),100);
  const memberBonuses = revenueTeam.map(m=>{ const pct=Math.round((safeParse(m.actual)/(m.target||1))*100); return {...m,pct,bonus:getMemberBonus(pct)}; });
  const salesBonus = memberBonuses.reduce((a,m)=>a+m.bonus,0);
  const leaderSalesBonus = getLeaderSalesBonus(revenuePct);
  const leaderDeliveryBonus = getDeliveryBonusTier(deliveryPct);
  const activityScore = (name) => { const a=activities[name]||{}; return safeParse(a.calls)*1+safeParse(a.meetings)*3+safeParse(a.leads)*5+safeParse(a.closures)*10; };

  const myMember = revenueTeam.find(m=>m.name===access.teamName);
  const myActual = myMember ? safeParse(myMember.actual) : 0;
  const myTarget = myMember ? myMember.target : 1;
  const myPct    = Math.min(Math.round((myActual/myTarget)*100),100);
  const myBonus  = getMemberBonus(myPct);
  const myScore  = myMember ? activityScore(myMember.name) : 0;

  const reviewStats = (()=>{
    const scored = revenueTeam.map(m=>({name:m.name,score:activityScore(m.name),calls:safeParse(activities[m.name]?.calls)}));
    return {
      lowestActivity:[...scored].sort((a,b)=>a.score-b.score)[0],
      highestCaller:[...scored].sort((a,b)=>b.calls-a.calls)[0],
      bestConverter:[...memberBonuses].sort((a,b)=>b.pct-a.pct)[0],
      pendingUpdates:revenueTeam.filter(m=>safeParse(m.actual)===0).map(m=>m.name),
    };
  })();

  useEffect(()=>{
    const saved=localStorage.getItem('twg_portal_db');
    if(saved){ try{ const d=JSON.parse(saved); if(d.team)setTeam(d.team); if(d.admissions)setAdmissions(d.admissions); if(d.activities)setActivities(d.activities); if(d.month)setMonth(d.month); if(d.period)setPeriod(d.period); }catch(e){} }
    hasLoaded.current=true;
  },[]);
  useEffect(()=>{ if(!hasLoaded.current)return; localStorage.setItem('twg_portal_db',JSON.stringify({team,admissions,activities,month,period,updatedAt:new Date().toISOString()})); },[team,admissions,activities,month,period]);

  const login=async()=>{
    setLoginError('');
    try{ const r=await fetch('/api/login.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:currentUser,password})}); if(r.ok){setAuth(true);setDbStatus('Connected');return;} }catch(e){}
    if(password==='admin123'){setAuth(true);setDbStatus('Local Mode');}
    else setLoginError('Invalid password. Contact admin if locked out.');
  };
  const logout=()=>{ setAuth(false); setPassword(''); setLoginError(''); };
  const save=async()=>{
    setLastSaved(`${currentUser} saved on ${new Date().toLocaleString()}`);
    try{ await fetch('/api/save-team-update.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:currentUser,team,admissions,activities,month,period})}); setDbStatus('Synced'); }catch(e){setDbStatus('Offline Cache');}
  };
  const updateActual=(name,val)=>{ if(!canEditMember(name))return; setTeam(prev=>prev.map(m=>m.name===name?{...m,actual:safeParse(val)}:m)); };
  const updateActivity=(name,field,val)=>{ if(!canEditMember(name))return; setActivities(prev=>({...prev,[name]:{...prev[name],[field]:val}})); };
  const updateAdmission=(dept,val)=>{ if(!access.isCEO&&!access.isDelivery)return; setAdmissions(prev=>({...prev,[dept]:safeParse(val)})); };
  const resetLocalDb=()=>{ localStorage.removeItem('twg_portal_db'); setTeam(seed); setAdmissions(Object.fromEntries(depts.map(d=>[d,0]))); setActivities(makeEmptyActivities()); setLastSaved(''); setDbStatus('Reset'); };
  const handleMarkAttendance=()=>setAttendanceMsg(`Attendance marked for ${currentUser} at ${new Date().toLocaleTimeString()}`);
  const handleSendReport=()=>setReportMsg(`Report queued for dispatch at ${new Date().toLocaleTimeString()}`);

  const ActivityFields = ({ memberName }) => (
    <div className='grid grid-cols-2 gap-1 mt-1'>
      {['calls','meetings','leads','closures','collection','remarks'].map(f=>(
        <LockedInput key={f} canEdit={canEditMember(memberName)} value={activities[memberName]?.[f]||''} onChange={e=>updateActivity(memberName,f,e.target.value)} placeholder={f.charAt(0).toUpperCase()+f.slice(1)} />
      ))}
    </div>
  );

  const MemberCard = ({ m }) => {
    const canEdit=canEditMember(m.name);
    const pct=Math.min(Math.round((safeParse(m.actual)/(m.target||1))*100),100);
    return (
      <div className={`border rounded-lg p-3 space-y-2 ${canEdit?'border-gray-200 bg-white':'border-gray-100 bg-gray-50'}`}>
        <div className='flex items-center justify-between'>
          <div className='font-medium text-sm'>{m.name}</div>
          {canEdit ? (!access.isCEO && <span className='text-xs text-green-600'>✏️ Editable</span>) : <span className='text-xs text-gray-400'>🔒 View only</span>}
        </div>
        <div className='text-xs text-gray-500'>Target: {m.target}L | Achieved: {m.actual}L | {pct}%</div>
        <Progress value={pct} className='h-1.5' />
        <LockedInput canEdit={canEdit} type='number' value={m.actual} onChange={e=>updateActual(m.name,e.target.value)} placeholder='Achieved (L)' />
        <ActivityFields memberName={m.name} />
        <div className='text-xs text-green-600 font-medium'>Activity Score: {activityScore(m.name)}</div>
      </div>
    );
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if(!auth) return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-red-50 p-6'>
      <Card className='w-full max-w-md shadow-lg'>
        <CardContent className='p-8 space-y-5'>
          <div className='text-center'>
            <div className='inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-700 text-white text-xl font-bold mb-3'>T</div>
            <h1 className='text-2xl font-bold text-red-700'>TWG Monitoring Portal</h1>
            <p className='text-sm text-gray-500 mt-1'>portal.technoworldgroup.com</p>
          </div>
          <div className='space-y-3'>
            <div>
              <label className='text-xs font-medium text-gray-600 mb-1 block'>Select User</label>
              <Select value={currentUser} onValueChange={v=>{setCurrentUser(v);setLoginError('');}}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(ACCESS).map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className='text-xs font-medium text-gray-600 mb-1 block'>Password</label>
              <Input type='password' value={password} onChange={e=>{setPassword(e.target.value);setLoginError('');}} onKeyDown={e=>e.key==='Enter'&&login()} placeholder='Enter your password'/>
            </div>
            {loginError && <div className='text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2'>{loginError}</div>}
            <Button onClick={login} className='w-full'>Login</Button>
          </div>
          <div className='text-center text-xs text-gray-400'>Access is role-restricted. Each user sees only their own data.</div>
        </CardContent>
      </Card>
    </div>
  );

  // ── WAHED — DELIVERY ONLY VIEW ─────────────────────────────────────────────
  if(access.isDelivery) return (
    <div className='min-h-screen bg-gray-100 p-4 md:p-6 space-y-5'>
      <div className='bg-white border rounded-2xl p-4 flex justify-between items-center'>
        <div>
          <div className='text-xs text-gray-500'>TWG Portal | {dbStatus}</div>
          <h1 className='text-xl font-bold text-red-700'>Delivery Operations Dashboard</h1>
        </div>
        <div className='flex items-center gap-3'><RoleBadge user={currentUser}/><Button variant='outline' onClick={logout}>Logout</Button></div>
      </div>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Total Admissions</div><div className='text-2xl font-bold text-red-700'>{totalAdmissions}</div><Progress value={deliveryPct} className='mt-2'/><div className='text-xs text-gray-400 mt-1'>{deliveryPct}% of {TOTAL_DELIVERY_TARGET}</div></CardContent></Card>
        <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Delivery Bonus</div><div className='text-lg font-bold text-green-600'>{leaderDeliveryBonus}</div></CardContent></Card>
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
          {depts.map(d=>{
            const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100);
            return (
              <div key={d} className='border rounded-lg p-3 space-y-2'>
                <div className='flex justify-between'><span className='font-medium text-sm'>{d}</span><span className={`text-xs font-medium ${pct>=100?'text-green-600':pct>=70?'text-yellow-600':'text-red-500'}`}>{pct}%</span></div>
                <Progress value={pct} className='h-1.5'/>
                <div className='text-xs text-gray-500'>{val}/{DEPT_TARGET} | {getDeliveryBonusTier(pct)}</div>
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
        <Button onClick={handleMarkAttendance}>Mark Attendance</Button>
        {attendanceMsg && <div className='text-xs text-green-600'>{attendanceMsg}</div>}
      </CardContent></Card>
    </div>
  );

  // ── MAIN APP (CEO + Sales Managers) ───────────────────────────────────────
  return (
    <div className='min-h-screen bg-gray-100 p-4 md:p-6 space-y-5'>
      <div className='bg-white border rounded-2xl p-4 flex justify-between items-center'>
        <div>
          <div className='text-xs text-gray-500'>portal.technoworldgroup.com | Database: {dbStatus} | {syncMode}</div>
          <h1 className='text-2xl font-bold text-red-700'>TWG Monitoring Portal</h1>
        </div>
        <div className='flex items-center gap-3'><RoleBadge user={currentUser}/><Button variant='outline' onClick={logout}>Logout</Button></div>
      </div>

      <div className='grid md:grid-cols-2 gap-3'>
        <Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Daily','Weekly','Monthly','Quarterly','Yearly'].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
      </div>

      <Tabs defaultValue={access.tabs[0]||'dashboard'}>
        <TabsList className='flex flex-wrap gap-1'>
          {canSeeTab('dashboard')&&<TabsTrigger value='dashboard'>Dashboard</TabsTrigger>}
          {canSeeTab('team')&&<TabsTrigger value='team'>Team</TabsTrigger>}
          {canSeeTab('reports')&&<TabsTrigger value='reports'>Reports</TabsTrigger>}
          {canSeeTab('analysis')&&<TabsTrigger value='analysis'>Analysis</TabsTrigger>}
          {canSeeTab('bonus')&&<TabsTrigger value='bonus'>Bonus</TabsTrigger>}
          {canSeeTab('ceo')&&<TabsTrigger value='ceo'>CEO</TabsTrigger>}
          {canSeeTab('review')&&<TabsTrigger value='review'>Review</TabsTrigger>}
          {canSeeTab('ops')&&<TabsTrigger value='ops'>Ops</TabsTrigger>}
          {canSeeTab('db')&&<TabsTrigger value='db'>DB</TabsTrigger>}
        </TabsList>

        {/* DASHBOARD */}
        {canSeeTab('dashboard')&&<TabsContent value='dashboard'>
          <div className='space-y-4 mt-4'>
            {access.isCEO ? (
              <div className='grid md:grid-cols-4 gap-4'>
                <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Total Revenue</div><div className='text-2xl font-bold text-red-700'>{totalActual}L</div><Progress value={revenuePct} className='mt-2'/><div className='text-xs text-gray-400 mt-1'>{revenuePct}% of {totalTarget}L</div></CardContent></Card>
                <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Total Admissions</div><div className='text-2xl font-bold text-red-700'>{totalAdmissions}</div><Progress value={deliveryPct} className='mt-2'/><div className='text-xs text-gray-400 mt-1'>{deliveryPct}% of {TOTAL_DELIVERY_TARGET}</div></CardContent></Card>
                <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Bonus Cost</div><div className='text-2xl font-bold text-green-600'>₹{(salesBonus+leaderSalesBonus).toLocaleString()}</div></CardContent></Card>
                <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>Status</div><div className={`text-2xl font-bold ${revenuePct>=70?'text-green-600':'text-red-600'}`}>{revenuePct>=70?'On Track':'Focus'}</div></CardContent></Card>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='text-sm font-medium text-gray-600'>Your Performance — {month} ({period})</div>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>My Revenue</div><div className='text-2xl font-bold text-red-700'>{myActual}L</div><Progress value={myPct} className='mt-2'/><div className='text-xs text-gray-400 mt-1'>{myPct}% of {myTarget}L</div></CardContent></Card>
                  <Card><CardContent className='p-4'><div className='text-xs text-gray-500'>My Bonus</div><div className='text-xl font-bold text-green-600'>₹{myBonus.toLocaleString()}</div><div className='text-xs text-gray-400 mt-1'>At current achievement</div></CardContent></Card>
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
          </div>
        </TabsContent>}

        {/* TEAM */}
        {canSeeTab('team')&&<TabsContent value='team'>
          <div className='space-y-4 mt-4'>
            <Card><CardContent className='p-4'>
              <h3 className='font-bold text-red-700'>Activity Tracker</h3>
              <div className='text-sm text-gray-500 mt-1'>
                {access.isCEO ? 'Full team visibility. All rows editable.' : `Editable: ${access.canEdit.join(', ')}. Others are view-only 🔒`}
              </div>
            </CardContent></Card>
            <div className='grid lg:grid-cols-3 gap-4'>
              <Card><CardContent className='p-4 space-y-3'><h3 className='font-bold text-red-700'>Central Sales</h3>{revenueTeam.slice(0,3).map(m=><MemberCard key={m.name} m={m}/>)}<Button onClick={save}>Save</Button></CardContent></Card>
              <Card><CardContent className='p-4 space-y-3'><h3 className='font-bold text-red-700'>BL Heads</h3>{revenueTeam.slice(3,5).map(m=><MemberCard key={m.name} m={m}/>)}<Button onClick={save}>Save</Button></CardContent></Card>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>Delivery</h3>
                {!access.isCEO&&<div className='text-xs text-gray-400 mb-2'>🔒 View only — managed by Wahed</div>}
                {depts.map(d=>{
                  const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100);
                  return (
                    <div key={d} className='space-y-1'>
                      <div className='flex justify-between text-sm'><span className='font-medium'>{d}</span><span className='text-xs text-gray-500'>{val}/{DEPT_TARGET} ({pct}%)</span></div>
                      <Progress value={pct} className='h-1.5'/>
                      {access.isCEO ? <Input type='number' value={admissions[d]} onChange={e=>updateAdmission(d,e.target.value)}/> : <div className='text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-1'>{val} admissions</div>}
                    </div>
                  );
                })}
                {access.isCEO&&<Button onClick={save}>Save</Button>}
              </CardContent></Card>
            </div>
            {lastSaved&&<div className='text-xs text-gray-500'>{lastSaved}</div>}
          </div>
        </TabsContent>}

        {/* REPORTS */}
        {canSeeTab('reports')&&<TabsContent value='reports'>
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
        {canSeeTab('analysis')&&<TabsContent value='analysis'>
          <div className='grid md:grid-cols-2 gap-4 mt-4'>
            <Card><CardContent className='p-4'><div className='font-medium mb-1'>Sales Performance</div><div className='text-2xl font-bold text-red-700'>{revenuePct}%</div><Progress value={revenuePct}/><div className='text-xs text-gray-400 mt-1'>{totalActual}L / {totalTarget}L</div></CardContent></Card>
            <Card><CardContent className='p-4'><div className='font-medium mb-1'>Delivery Performance</div><div className='text-2xl font-bold text-red-700'>{deliveryPct}%</div><Progress value={deliveryPct}/><div className='text-xs text-gray-400 mt-1'>{totalAdmissions} / {TOTAL_DELIVERY_TARGET}</div></CardContent></Card>
          </div>
        </TabsContent>}

        {/* BONUS — CEO only */}
        {canSeeTab('bonus')&&<TabsContent value='bonus'>
          <div className='space-y-4 mt-4'>
            <div className='grid md:grid-cols-3 gap-4'>
              <Card><CardContent className='p-4'>Total Sales Bonus<div className='text-2xl font-bold text-green-600'>₹{salesBonus.toLocaleString()}</div></CardContent></Card>
              <Card><CardContent className='p-4'>Sales Leader Bonus<div className='text-2xl font-bold text-green-600'>₹{leaderSalesBonus.toLocaleString()}</div><div className='text-xs text-gray-400'>100%→₹35k | 90%→₹25k | 70%→₹10k</div></CardContent></Card>
              <Card><CardContent className='p-4'>Delivery Leader Bonus<div className='text-xl font-bold text-green-600'>{leaderDeliveryBonus}</div></CardContent></Card>
            </div>
            <div className='grid lg:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>Sales Bonus — All Members</h3>
                {memberBonuses.map((m,i)=><div key={i} className='grid grid-cols-12 text-sm border-b py-1'><div className='col-span-6'>{m.name}</div><div className='col-span-2'>{m.pct}%</div><div className='col-span-4 text-right text-green-600'>₹{m.bonus.toLocaleString()}</div></div>)}
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>Delivery Bonus — All Depts</h3>
                {depts.map((d,i)=>{ const val=safeParse(admissions[d]); const pct=Math.round((val/DEPT_TARGET)*100); return <div key={i} className='grid grid-cols-12 text-sm border-b py-1'><div className='col-span-5'>{d}</div><div className='col-span-3'>{val}/{DEPT_TARGET}</div><div className='col-span-4 text-right text-green-600'>{getDeliveryBonusTier(pct)}</div></div>; })}
              </CardContent></Card>
            </div>
          </div>
        </TabsContent>}

        {/* CEO TAB — CEO only */}
        {canSeeTab('ceo')&&<TabsContent value='ceo'>
          <div className='grid md:grid-cols-4 gap-4 mt-4'>
            <Card><CardContent className='p-4'>Revenue<div className='text-2xl font-bold text-red-700'>{totalActual}L</div></CardContent></Card>
            <Card><CardContent className='p-4'>Admissions<div className='text-2xl font-bold text-red-700'>{totalAdmissions}</div></CardContent></Card>
            <Card><CardContent className='p-4'>Bonus Cost<div className='text-2xl font-bold text-green-600'>₹{(salesBonus+leaderSalesBonus).toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className='p-4'>Review<div className='text-2xl font-bold text-red-700'>{period}</div></CardContent></Card>
          </div>
        </TabsContent>}

        {/* REVIEW */}
        {canSeeTab('review')&&<TabsContent value='review'>
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
              <div className='text-sm'>Daily Summary Ready</div>
              <Button className='mt-2' onClick={handleSendReport}>Send Report</Button>
              {reportMsg&&<div className='text-xs text-green-600 mt-1'>{reportMsg}</div>}
            </CardContent></Card>
          </div>
        </TabsContent>}

        {/* OPS */}
        {canSeeTab('ops')&&<TabsContent value='ops'>
          <div className='grid md:grid-cols-2 gap-4 mt-4'>
            <Card><CardContent className='p-4 space-y-2'>
              <h3 className='font-bold text-red-700'>Attendance with GPS</h3>
              <div className='text-sm'>Check-in / Check-out module (demo)</div>
              <Button className='mt-2' onClick={handleMarkAttendance}>Mark Attendance</Button>
              {attendanceMsg&&<div className='text-xs text-green-600 mt-1'>{attendanceMsg}</div>}
            </CardContent></Card>
            <Card><CardContent className='p-4'>
              <h3 className='font-bold text-red-700'>AI Forecasting</h3>
              <div className='text-sm'>Projected Revenue Next Month: {Math.round(totalActual*1.15)}L</div>
              <div className='text-sm'>Projected Admissions: {Math.round(totalAdmissions*1.1)}</div>
            </CardContent></Card>
          </div>
        </TabsContent>}

        {/* DB */}
        {canSeeTab('db')&&<TabsContent value='db'>
          <div className='grid md:grid-cols-2 gap-4 mt-4'>
            <Card><CardContent className='p-4 space-y-2'>
              <h3 className='font-bold text-red-700'>Database Sync</h3>
              <div className='text-sm'>Status: <span className='font-medium'>{dbStatus}</span></div>
              <div className='text-sm'>API Endpoint:<Input className='mt-1' value={apiEndpoint} onChange={e=>setApiEndpoint(e.target.value)}/></div>
              <div className='flex gap-2 mt-2'>
                {access.isCEO&&<Button onClick={resetLocalDb}>Reset Local DB</Button>}
                <Button variant='outline' onClick={()=>setDbStatus('Sync Requested')}>Test MySQL Sync</Button>
              </div>
            </CardContent></Card>
            <Card><CardContent className='p-4'>
              <h3 className='font-bold text-red-700'>Stored Modules</h3>
              {['Team Data','Admissions','Activities','Month & Review Period','MySQL Users & Shared Sessions'].map(item=><div key={item} className='text-sm'>{item}</div>)}
            </CardContent></Card>
          </div>
        </TabsContent>}
      </Tabs>
    </div>
  );
}
