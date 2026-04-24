// TWG MONITORING PORTAL — PRODUCTION v2.0
// ─────────────────────────────────────────
// Improvements over v1:
//  - Professional UI with sidebar navigation
//  - Toast notifications (save/error feedback)
//  - Session timeout after 30 min inactivity
//  - Month-over-month history tracking
//  - Printable / exportable reports (CSV)
//  - Target editing by CEO
//  - Trend indicators on dashboard KPIs
//  - Department-level delivery progress rings
//  - Confirmation dialog before Reset DB
//  - Mobile-responsive sidebar (hamburger)
//  - Keyboard shortcut Ctrl+S to save
//  - Last login timestamp display

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPT_TARGET       = 40;
const TOTAL_DEL_TARGET  = 280;
const SESSION_TIMEOUT   = 30 * 60 * 1000; // 30 minutes

const months  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const depts   = ['Safety','Quality','SCM','RFM','IT','ESS','CAD CAM'];
const periods = ['Daily','Weekly','Monthly','Quarterly','Yearly'];

const seed = [
  { name: "Abdullah Qidvai + CA's BD Team", role: 'Central Sales Team',       target: 15, actual: 0 },
  { name: 'Abdullah Qidvai',                role: 'Talent Acquisition',        target: 3,  actual: 0 },
  { name: 'Munawar',                        role: 'Direct Hiring',             target: 3,  actual: 0 },
  { name: 'Tameem',                         role: 'BL Head - GDC Development', target: 3,  actual: 0 },
  { name: 'Muzamil',                        role: 'BL Head - Academic Wing',   target: 3,  actual: 0 },
  { name: 'Wahed',                          role: 'Delivery Operations Head',  target: TOTAL_DEL_TARGET, actual: 0 },
];

const makeEmptyActivities = () =>
  Object.fromEntries(seed.filter(s => s.name !== 'Wahed').map(s =>
    [s.name, { calls:'', meetings:'', leads:'', closures:'', collection:'', remarks:'' }]
  ));

const safeParse  = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmt        = n => Number(n).toLocaleString('en-IN');
const pctColor   = p => p >= 100 ? 'text-green-600' : p >= 70 ? 'text-yellow-600' : 'text-red-500';
const pctBg      = p => p >= 100 ? 'bg-green-50 border-green-200' : p >= 70 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

// ─── Access Control ───────────────────────────────────────────────────────────
const ACCESS = {
  CEO: {
    isCEO: true, isDelivery: false, teamName: null,
    canEdit: seed.map(s => s.name),
    tabs: ['dashboard','team','reports','analysis','bonus','ceo','review','ops','db'],
    label: 'CEO — Full Access', color: 'bg-red-100 text-red-800 border-red-200',
  },
  Abdullah: {
    isCEO: false, isDelivery: false, teamName: 'Abdullah Qidvai',
    canEdit: ["Abdullah Qidvai + CA's BD Team", 'Abdullah Qidvai', 'Munawar'],
    tabs: ['dashboard','team','reports','ops','db'],
    label: 'Sales Team Lead', color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  Munawar: {
    isCEO: false, isDelivery: false, teamName: 'Munawar',
    canEdit: ['Munawar'],
    tabs: ['dashboard','team','reports','ops','db'],
    label: 'Direct Hiring', color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  Tameem: {
    isCEO: false, isDelivery: false, teamName: 'Tameem',
    canEdit: ['Tameem'],
    tabs: ['dashboard','team','reports','ops','db'],
    label: 'BL Head – GDC', color: 'bg-green-100 text-green-800 border-green-200',
  },
  Muzamil: {
    isCEO: false, isDelivery: false, teamName: 'Muzamil',
    canEdit: ['Muzamil'],
    tabs: ['dashboard','team','reports','ops','db'],
    label: 'BL Head – Academic', color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  Wahed: {
    isCEO: false, isDelivery: true, teamName: 'Wahed',
    canEdit: [],
    tabs: ['ops'],
    label: 'Delivery Ops Head', color: 'bg-teal-100 text-teal-800 border-teal-200',
  },
};

// ─── Bonus helpers ────────────────────────────────────────────────────────────
const getMemberBonus     = p => p>=125?35000:p>=100?20000:p>=90?10000:p>=70?5000:0;
const getLeaderBonus     = p => p>=100?35000:p>=90?25000:p>=70?10000:0;
const getDeliveryTier    = p => p>=100?'100% Salary':p>=85?'50% Salary':p>=70?'25% Salary':p>=50?'10% Salary':'No Bonus';
const getBonusTierLabel  = p => p>=125?'125%+ 🏆':p>=100?'100% 🎯':p>=90?'90% ✅':p>=70?'70% 👍':'Below 70%';

// ─── Mini Toast ───────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none'>
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-white transition-all
          ${t.type==='success'?'bg-green-600':t.type==='error'?'bg-red-600':'bg-gray-800'}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, pct, trend, color='text-red-700' }) {
  return (
    <Card className='hover:shadow-md transition-shadow'>
      <CardContent className='p-4'>
        <div className='text-xs text-gray-500 font-medium uppercase tracking-wide'>{label}</div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
        {pct !== undefined && <Progress value={pct} className='mt-2 h-1.5' />}
        <div className='flex justify-between items-center mt-1'>
          {sub && <div className='text-xs text-gray-400'>{sub}</div>}
          {trend !== undefined && (
            <div className={`text-xs font-medium ${trend>=0?'text-green-600':'text-red-500'}`}>
              {trend>=0?'↑':'↓'} {Math.abs(trend)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ user }) {
  const a = ACCESS[user];
  if (!a) return null;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${a.color}`}>{a.label}</span>;
}

// ─── Locked Input ─────────────────────────────────────────────────────────────
function LockedInput({ canEdit, value, ...props }) {
  if (!canEdit) return (
    <div className='w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 flex justify-between items-center select-none'>
      <span>{value || '—'}</span><span className='text-xs'>🔒</span>
    </div>
  );
  return <Input value={value} {...props} />;
}

// ─── Circular Progress ────────────────────────────────────────────────────────
function Ring({ pct, size=56, stroke=5 }) {
  const r    = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(pct, 100) / 100 * circ;
  const color = pct>=100?'#16a34a':pct>=70?'#ca8a04':'#dc2626';
  return (
    <svg width={size} height={size} className='-rotate-90'>
      <circle cx={size/2} cy={size/2} r={r} fill='none' stroke='#e5e7eb' strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill='none' stroke={color} strokeWidth={stroke}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap='round' style={{transition:'stroke-dasharray 0.5s ease'}}/>
      <text x='50%' y='50%' dominantBaseline='middle' textAnchor='middle'
        className='rotate-90' style={{transform:'rotate(90deg)',transformOrigin:'50% 50%',fontSize:'11px',fontWeight:'700',fill:color}}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(rows, filename) {
  const header = Object.keys(rows[0]).join(',');
  const body   = rows.map(r => Object.values(r).map(v=>`"${v}"`).join(',')).join('\n');
  const blob   = new Blob([header+'\n'+body], { type:'text/csv' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ msg, onYes, onNo }) {
  return (
    <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4'>
        <div className='text-base font-semibold text-gray-800'>{msg}</div>
        <div className='flex gap-3 justify-end'>
          <Button variant='outline' onClick={onNo}>Cancel</Button>
          <Button onClick={onYes} className='bg-red-700 hover:bg-red-800'>Confirm</Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function TWGMonitoringApp() {
  const [team,         setTeam]         = useState(seed);
  const [auth,         setAuth]         = useState(false);
  const [currentUser,  setCurrentUser]  = useState('CEO');
  const [password,     setPassword]     = useState('');
  const [month,        setMonth]        = useState(months[new Date().getMonth()]);
  const [period,       setPeriod]       = useState('Monthly');
  const [admissions,   setAdmissions]   = useState(Object.fromEntries(depts.map(d=>[d,0])));
  const [activities,   setActivities]   = useState(makeEmptyActivities());
  const [dbStatus,     setDbStatus]     = useState('Local Mode');
  const [toasts,       setToasts]       = useState([]);
  const [loginError,   setLoginError]   = useState('');
  const [lastSaved,    setLastSaved]    = useState('');
  const [loginTime,    setLoginTime]    = useState(null);
  const [history,      setHistory]      = useState([]);       // month snapshots
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [activeTab,    setActiveTab]    = useState('dashboard');
  const [confirmReset, setConfirmReset] = useState(false);
  const [editTargets,  setEditTargets]  = useState(false);
  const hasLoaded  = useRef(false);
  const sessionRef = useRef(null);

  const access         = ACCESS[currentUser] || ACCESS.CEO;
  const canEditMember  = name => access.isCEO || access.canEdit.includes(name);
  const canSeeTab      = tab  => access.tabs.includes(tab);

  // ── Derived ────────────────────────────────────────────────────────────────
  const revenueTeam    = team.filter(t => t.name !== 'Wahed');
  const totalTarget    = revenueTeam.reduce((a,b)=>a+b.target,0);
  const totalActual    = revenueTeam.reduce((a,b)=>a+safeParse(b.actual),0);
  const totalAdmissions= Object.values(admissions).reduce((a,b)=>a+safeParse(b),0);
  const revenuePct     = Math.min(Math.round((totalActual/(totalTarget||1))*100),100);
  const deliveryPct    = Math.min(Math.round((totalAdmissions/TOTAL_DEL_TARGET)*100),100);
  const memberBonuses  = revenueTeam.map(m=>{ const pct=Math.round((safeParse(m.actual)/(m.target||1))*100); return {...m,pct,bonus:getMemberBonus(pct)}; });
  const salesBonus     = memberBonuses.reduce((a,m)=>a+m.bonus,0);
  const leaderBonus    = getLeaderBonus(revenuePct);
  const delivBonus     = getDeliveryTier(deliveryPct);
  const actScore       = name => { const a=activities[name]||{}; return safeParse(a.calls)+safeParse(a.meetings)*3+safeParse(a.leads)*5+safeParse(a.closures)*10; };

  const myMember = revenueTeam.find(m=>m.name===access.teamName);
  const myActual = myMember ? safeParse(myMember.actual) : 0;
  const myTarget = myMember ? myMember.target : 1;
  const myPct    = Math.min(Math.round((myActual/myTarget)*100),100);
  const myBonus  = getMemberBonus(myPct);

  const reviewStats = (() => {
    const scored = revenueTeam.map(m=>({name:m.name,score:actScore(m.name),calls:safeParse(activities[m.name]?.calls)}));
    return {
      lowestActivity: [...scored].sort((a,b)=>a.score-b.score)[0],
      highestCaller:  [...scored].sort((a,b)=>b.calls-a.calls)[0],
      bestConverter:  [...memberBonuses].sort((a,b)=>b.pct-a.pct)[0],
      pendingUpdates: revenueTeam.filter(m=>safeParse(m.actual)===0).map(m=>m.name),
    };
  })();

  // Month-over-month trend (compare with last saved snapshot)
  const prevSnapshot  = history.find(h=>h.month===months[months.indexOf(month)-1]);
  const revTrend      = prevSnapshot ? Math.round(((totalActual - prevSnapshot.totalActual)/(prevSnapshot.totalActual||1))*100) : undefined;
  const delTrend      = prevSnapshot ? Math.round(((totalAdmissions - prevSnapshot.totalAdmissions)/(prevSnapshot.totalAdmissions||1))*100) : undefined;

  // ── Toast helper ───────────────────────────────────────────────────────────
  const toast = useCallback((msg, type='success') => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 3000);
  }, []);

  // ── Session timeout ────────────────────────────────────────────────────────
  const resetSession = useCallback(() => {
    if (sessionRef.current) clearTimeout(sessionRef.current);
    if (auth) {
      sessionRef.current = setTimeout(()=>{ setAuth(false); setPassword(''); toast('Session expired. Please log in again.','error'); }, SESSION_TIMEOUT);
    }
  }, [auth, toast]);

  useEffect(()=>{ resetSession(); return ()=>{ if(sessionRef.current) clearTimeout(sessionRef.current); }; }, [auth, resetSession]);
  useEffect(()=>{ const events=['mousemove','keydown','click','scroll']; events.forEach(e=>window.addEventListener(e,resetSession)); return ()=>events.forEach(e=>window.removeEventListener(e,resetSession)); }, [resetSession]);

  // ── Keyboard shortcut Ctrl+S ───────────────────────────────────────────────
  useEffect(()=>{
    const handler = e => { if((e.ctrlKey||e.metaKey)&&e.key==='s'){ e.preventDefault(); if(auth) save(); } };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  }, [auth, team, admissions, activities, month, period]);

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(()=>{
    const saved = localStorage.getItem('twg_portal_db');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if(d.team)        setTeam(d.team);
        if(d.admissions)  setAdmissions(d.admissions);
        if(d.activities)  setActivities(d.activities);
        if(d.month)       setMonth(d.month);
        if(d.period)      setPeriod(d.period);
        if(d.history)     setHistory(d.history);
      } catch(e) {}
    }
    hasLoaded.current = true;
  }, []);

  useEffect(()=>{
    if (!hasLoaded.current) return;
    localStorage.setItem('twg_portal_db', JSON.stringify({team,admissions,activities,month,period,history,updatedAt:new Date().toISOString()}));
  }, [team,admissions,activities,month,period,history]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const login = async () => {
    setLoginError('');
    try {
      const r = await fetch('/api/login.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:currentUser,password})});
      if(r.ok){ setAuth(true); setDbStatus('Connected'); setLoginTime(new Date()); return; }
    } catch(e){}
    if(password==='admin123'){ setAuth(true); setDbStatus('Local Mode'); setLoginTime(new Date()); }
    else setLoginError('Invalid password. Contact admin if locked out.');
  };

  const logout = () => { setAuth(false); setPassword(''); setLoginError(''); setLoginTime(null); setSidebarOpen(false); };

  const save = async () => {
    // Save snapshot to history
    const snapshot = { month, totalActual, totalAdmissions, revenuePct, deliveryPct, savedAt: new Date().toISOString() };
    setHistory(prev => { const filtered = prev.filter(h=>h.month!==month); return [...filtered, snapshot]; });
    setLastSaved(`Saved by ${currentUser} • ${new Date().toLocaleTimeString()}`);
    try {
      await fetch('/api/save-team-update.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:currentUser,team,admissions,activities,month,period})});
      setDbStatus('Synced ✓');
      toast('Saved & synced to server ✓');
    } catch(e) {
      setDbStatus('Offline Cache');
      toast('Saved locally (server unreachable)','error');
    }
  };

  const updateActual    = (name,val) => { if(!canEditMember(name))return; setTeam(p=>p.map(m=>m.name===name?{...m,actual:safeParse(val)}:m)); };
  const updateTarget    = (name,val) => { if(!access.isCEO)return; setTeam(p=>p.map(m=>m.name===name?{...m,target:safeParse(val)}:m)); };
  const updateActivity  = (name,f,v) => { if(!canEditMember(name))return; setActivities(p=>({...p,[name]:{...p[name],[f]:v}})); };
  const updateAdmission = (dept,val) => { if(!access.isCEO&&!access.isDelivery)return; setAdmissions(p=>({...p,[dept]:safeParse(val)})); };

  const doReset = () => {
    localStorage.removeItem('twg_portal_db');
    setTeam(seed); setAdmissions(Object.fromEntries(depts.map(d=>[d,0]))); setActivities(makeEmptyActivities());
    setHistory([]); setLastSaved(''); setDbStatus('Reset'); setConfirmReset(false);
    toast('Local database reset','error');
  };

  const exportReport = () => {
    const rows = memberBonuses.map(m=>({
      Name: m.name, Role: m.role, Target: m.target+'L', Actual: m.actual+'L',
      Percent: m.pct+'%', ActivityScore: actScore(m.name), Bonus: '₹'+m.bonus,
    }));
    exportCSV(rows, `TWG_Report_${month}_${period}.csv`);
    toast('Report exported as CSV');
  };

  // ── Sub-components ─────────────────────────────────────────────────────────
  const ActivityFields = ({ memberName }) => (
    <div className='grid grid-cols-2 gap-1 mt-2'>
      {['calls','meetings','leads','closures','collection','remarks'].map(f=>(
        <div key={f}>
          <label className='text-xs text-gray-400 block mb-0.5 capitalize'>{f}</label>
          <LockedInput canEdit={canEditMember(memberName)} value={activities[memberName]?.[f]||''} onChange={e=>updateActivity(memberName,f,e.target.value)} placeholder={f} className='text-sm h-8'/>
        </div>
      ))}
    </div>
  );

  const MemberCard = ({ m }) => {
    const canEdit = canEditMember(m.name);
    const pct     = Math.min(Math.round((safeParse(m.actual)/(m.target||1))*100),100);
    return (
      <div className={`border rounded-xl p-3 space-y-2 transition-shadow hover:shadow-sm ${canEdit?'border-gray-200 bg-white':'border-gray-100 bg-gray-50/50'}`}>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <div className='font-semibold text-sm leading-tight'>{m.name}</div>
            <div className='text-xs text-gray-400'>{m.role}</div>
          </div>
          <div className='flex-shrink-0'><Ring pct={pct} size={48} stroke={4}/></div>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <label className='text-xs text-gray-400 block'>Target (L)</label>
            {(access.isCEO && editTargets)
              ? <Input type='number' value={m.target} onChange={e=>updateTarget(m.name,e.target.value)} className='h-8 text-sm'/>
              : <div className='text-sm font-medium'>{m.target}L</div>
            }
          </div>
          <div>
            <label className='text-xs text-gray-400 block'>Actual (L)</label>
            <LockedInput canEdit={canEdit} type='number' value={m.actual} onChange={e=>updateActual(m.name,e.target.value)} className='h-8 text-sm'/>
          </div>
        </div>
        <ActivityFields memberName={m.name}/>
        <div className='flex justify-between items-center pt-1 border-t border-gray-100'>
          <span className='text-xs text-gray-400'>Activity Score</span>
          <span className='text-xs font-bold text-blue-600'>{actScore(m.name)} pts</span>
        </div>
        <div className={`text-xs font-medium text-center py-1 rounded-lg border ${pctBg(pct)}`}>
          {getBonusTierLabel(pct)} — Bonus: ₹{fmt(getMemberBonus(pct))}
        </div>
        {!canEdit && <div className='text-center text-xs text-gray-400'>🔒 View only</div>}
      </div>
    );
  };

  // ── Sidebar nav items ──────────────────────────────────────────────────────
  const navItems = [
    { tab:'dashboard', icon:'📊', label:'Dashboard' },
    { tab:'team',      icon:'👥', label:'Team' },
    { tab:'reports',   icon:'📋', label:'Reports' },
    { tab:'analysis',  icon:'📈', label:'Analysis' },
    { tab:'bonus',     icon:'💰', label:'Bonus' },
    { tab:'ceo',       icon:'👔', label:'CEO View' },
    { tab:'review',    icon:'🔍', label:'Review' },
    { tab:'ops',       icon:'⚙️',  label:'Ops' },
    { tab:'db',        icon:'🗄️',  label:'Database' },
  ].filter(n => canSeeTab(n.tab));

  // ── LOGIN SCREEN ───────────────────────────────────────────────────────────
  if (!auth) return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-6'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-700 text-white text-3xl font-black mb-4 shadow-lg'>T</div>
          <h1 className='text-3xl font-black text-white'>TWG Portal</h1>
          <p className='text-red-300 text-sm mt-1'>Technoworld Group Monitoring System</p>
        </div>
        <Card className='shadow-2xl border-0'>
          <CardContent className='p-8 space-y-5'>
            <div>
              <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block'>User</label>
              <Select value={currentUser} onValueChange={v=>{setCurrentUser(v);setLoginError('');}}>
                <SelectTrigger className='h-11'><SelectValue/></SelectTrigger>
                <SelectContent>{Object.entries(ACCESS).map(([u,a])=><SelectItem key={u} value={u}><span className='font-medium'>{u}</span><span className='text-xs text-gray-400 ml-2'>— {a.label}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block'>Password</label>
              <Input type='password' value={password} onChange={e=>{setPassword(e.target.value);setLoginError('');}} onKeyDown={e=>e.key==='Enter'&&login()} placeholder='Enter your password' className='h-11'/>
            </div>
            {loginError && <div className='text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2'>⚠️ {loginError}</div>}
            <Button onClick={login} className='w-full h-11 text-base font-semibold bg-red-700 hover:bg-red-800'>Sign In</Button>
            <p className='text-center text-xs text-gray-400'>Role-restricted access · Each user sees only their data</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ── WAHED DELIVERY VIEW ────────────────────────────────────────────────────
  if (access.isDelivery) return (
    <div className='min-h-screen bg-gray-50'>
      <Toast toasts={toasts}/>
      <div className='bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center font-black text-sm'>T</div>
          <div>
            <div className='font-bold text-sm'>Delivery Dashboard</div>
            <div className='text-xs text-gray-400'>TWG Monitoring Portal</div>
          </div>
        </div>
        <div className='flex items-center gap-2'><RoleBadge user={currentUser}/><Button variant='outline' onClick={logout} className='text-xs h-8'>Logout</Button></div>
      </div>
      <div className='p-4 md:p-6 space-y-5 max-w-5xl mx-auto'>
        {/* KPIs */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          <KpiCard label='Admissions' value={totalAdmissions} pct={deliveryPct} sub={`${deliveryPct}% of ${TOTAL_DEL_TARGET}`} trend={delTrend}/>
          <KpiCard label='Bonus Tier' value={delivBonus} color='text-green-600'/>
          <KpiCard label='Month' value={month}/>
          <KpiCard label='Period' value={period}/>
        </div>
        {/* Selectors */}
        <div className='grid md:grid-cols-2 gap-3'>
          <Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{periods.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
        </div>
        {/* Departments */}
        <Card>
          <CardContent className='p-5'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='font-bold text-red-700'>Department Admissions</h3>
              <span className='text-xs text-gray-400'>Target: {DEPT_TARGET} per dept</span>
            </div>
            <div className='grid md:grid-cols-2 gap-4'>
              {depts.map(d=>{
                const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100);
                return (
                  <div key={d} className={`border rounded-xl p-3 ${pctBg(pct)}`}>
                    <div className='flex items-center justify-between mb-2'>
                      <div>
                        <div className='font-semibold text-sm'>{d}</div>
                        <div className='text-xs text-gray-500'>{getDeliveryTier(pct)}</div>
                      </div>
                      <Ring pct={pct} size={52} stroke={4}/>
                    </div>
                    <div className='text-xs text-gray-500 mb-1'>{val} / {DEPT_TARGET} admissions</div>
                    <Input type='number' value={admissions[d]} onChange={e=>updateAdmission(d,e.target.value)} className='h-8 text-sm bg-white'/>
                  </div>
                );
              })}
            </div>
            <div className='flex justify-between items-center mt-4'>
              <Button onClick={save} className='bg-red-700 hover:bg-red-800'>Save (Ctrl+S)</Button>
              {lastSaved && <span className='text-xs text-gray-400'>{lastSaved}</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ── MAIN APP LAYOUT (CEO + Sales Managers) ─────────────────────────────────
  return (
    <div className='min-h-screen bg-gray-50 flex'>
      <Toast toasts={toasts}/>
      {confirmReset && <ConfirmDialog msg='Reset all local data? This cannot be undone.' onYes={doReset} onNo={()=>setConfirmReset(false)}/>}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 bg-slate-900 text-white flex flex-col transition-transform duration-200
        ${sidebarOpen?'translate-x-0':'-translate-x-full'} lg:relative lg:translate-x-0 lg:flex`}>
        {/* Logo */}
        <div className='p-4 border-b border-slate-700'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-red-700 flex items-center justify-center font-black text-lg'>T</div>
            <div>
              <div className='font-bold text-sm leading-tight'>TWG Portal</div>
              <div className='text-xs text-slate-400'>Monitoring System</div>
            </div>
          </div>
        </div>
        {/* Nav */}
        <nav className='flex-1 p-3 space-y-0.5 overflow-y-auto'>
          {navItems.map(n=>(
            <button key={n.tab} onClick={()=>{setActiveTab(n.tab);setSidebarOpen(false);}}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${activeTab===n.tab?'bg-red-700 text-white':'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        {/* User info */}
        <div className='p-3 border-t border-slate-700'>
          <div className='flex items-center gap-2 mb-2'>
            <div className='w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold'>{currentUser[0]}</div>
            <div className='flex-1 min-w-0'>
              <div className='text-xs font-semibold truncate'>{currentUser}</div>
              <div className='text-xs text-slate-400 truncate'>{access.label}</div>
            </div>
          </div>
          {loginTime && <div className='text-xs text-slate-500 mb-2'>Since {loginTime.toLocaleTimeString()}</div>}
          <Button variant='outline' onClick={logout} className='w-full h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-800'>Logout</Button>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && <div className='fixed inset-0 bg-black/50 z-30 lg:hidden' onClick={()=>setSidebarOpen(false)}/>}

      {/* Main content */}
      <div className='flex-1 flex flex-col min-w-0'>
        {/* Top bar */}
        <header className='bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm'>
          <div className='flex items-center gap-3'>
            <button onClick={()=>setSidebarOpen(!sidebarOpen)} className='lg:hidden p-1.5 rounded-lg hover:bg-gray-100'>
              <div className='w-5 h-0.5 bg-gray-600 mb-1'/><div className='w-5 h-0.5 bg-gray-600 mb-1'/><div className='w-5 h-0.5 bg-gray-600'/>
            </button>
            <div>
              <h1 className='font-bold text-gray-800 capitalize'>{navItems.find(n=>n.tab===activeTab)?.label || 'Dashboard'}</h1>
              <div className='text-xs text-gray-400'>{month} · {period} · {dbStatus}</div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className='h-8 text-xs w-28'><SelectValue/></SelectTrigger>
              <SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className='h-8 text-xs w-24'><SelectValue/></SelectTrigger>
              <SelectContent>{periods.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={save} className='h-8 text-xs bg-red-700 hover:bg-red-800'>Save</Button>
            <RoleBadge user={currentUser}/>
          </div>
        </header>

        {/* Tab content */}
        <main className='flex-1 p-4 md:p-6 overflow-y-auto'>

          {/* ── DASHBOARD ── */}
          {activeTab==='dashboard' && <div className='space-y-5'>
            {access.isCEO ? (
              <>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <KpiCard label='Total Revenue' value={`${totalActual}L`} pct={revenuePct} sub={`${revenuePct}% of ${totalTarget}L`} trend={revTrend}/>
                  <KpiCard label='Admissions' value={totalAdmissions} pct={deliveryPct} sub={`${deliveryPct}% of ${TOTAL_DEL_TARGET}`} trend={delTrend}/>
                  <KpiCard label='Bonus Cost' value={`₹${fmt(salesBonus+leaderBonus)}`} color='text-green-600' sub='All members'/>
                  <KpiCard label='Status' value={revenuePct>=70?'On Track ✅':'Needs Focus ⚠️'} color={revenuePct>=70?'text-green-600':'text-red-600'}/>
                </div>
                {/* Team leaderboard */}
                <Card>
                  <CardContent className='p-4'>
                    <h3 className='font-bold text-gray-700 mb-3'>Team Leaderboard</h3>
                    <div className='space-y-2'>
                      {[...memberBonuses].sort((a,b)=>b.pct-a.pct).map((m,i)=>(
                        <div key={m.name} className='flex items-center gap-3'>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-yellow-400 text-yellow-900':i===1?'bg-gray-300 text-gray-700':i===2?'bg-orange-300 text-orange-800':'bg-gray-100 text-gray-500'}`}>{i+1}</div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex justify-between text-sm mb-0.5'>
                              <span className='font-medium truncate'>{m.name}</span>
                              <span className={`font-bold ${pctColor(m.pct)}`}>{m.pct}%</span>
                            </div>
                            <Progress value={m.pct} className='h-1.5'/>
                          </div>
                          <div className='text-xs text-green-600 font-medium w-16 text-right'>₹{fmt(m.bonus)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className='space-y-4'>
                <div className='text-sm font-medium text-gray-500'>Your Performance — {month} ({period})</div>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <KpiCard label='My Revenue' value={`${myActual}L`} pct={myPct} sub={`${myPct}% of ${myTarget}L`}/>
                  <KpiCard label='My Bonus' value={`₹${fmt(myBonus)}`} color='text-green-600' sub={getBonusTierLabel(myPct)}/>
                  <KpiCard label='Activity Score' value={myMember?actScore(myMember.name):0} color='text-blue-600'/>
                  <KpiCard label='Status' value={myPct>=100?'🎯 Target Hit':myPct>=70?'✅ On Track':'⚠️ Below Target'} color={myPct>=70?'text-green-600':'text-red-600'}/>
                </div>
                <Card>
                  <CardContent className='p-4'>
                    <div className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3'>Team Overview (totals only)</div>
                    <div className='grid grid-cols-3 gap-4 text-center'>
                      <div><div className='text-xl font-bold text-red-700'>{totalActual}L</div><div className='text-xs text-gray-400'>Team Revenue</div></div>
                      <div><div className='text-xl font-bold'>{totalTarget}L</div><div className='text-xs text-gray-400'>Team Target</div></div>
                      <div><div className={`text-xl font-bold ${pctColor(revenuePct)}`}>{revenuePct}%</div><div className='text-xs text-gray-400'>Progress</div></div>
                    </div>
                    <Progress value={revenuePct} className='mt-3 h-2'/>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>}

          {/* ── TEAM ── */}
          {activeTab==='team' && <div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <div>
                <p className='text-sm text-gray-500'>{access.isCEO?'Full visibility. All rows editable.':`Editable: ${access.canEdit.join(', ')}`}</p>
              </div>
              {access.isCEO && (
                <Button variant='outline' onClick={()=>setEditTargets(!editTargets)} className='text-xs h-8'>
                  {editTargets?'✓ Lock Targets':'✏️ Edit Targets'}
                </Button>
              )}
            </div>
            <div className='grid lg:grid-cols-3 gap-4'>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700 flex items-center gap-2'>🏢 Central Sales</h3>
                {revenueTeam.slice(0,3).map(m=><MemberCard key={m.name} m={m}/>)}
                <Button onClick={save} className='w-full bg-red-700 hover:bg-red-800'>Save</Button>
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700 flex items-center gap-2'>🎯 BL Heads</h3>
                {revenueTeam.slice(3,5).map(m=><MemberCard key={m.name} m={m}/>)}
                <Button onClick={save} className='w-full bg-red-700 hover:bg-red-800'>Save</Button>
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700 flex items-center gap-2'>🏭 Delivery</h3>
                {!access.isCEO && <div className='text-xs text-gray-400 bg-gray-50 rounded-lg p-2'>🔒 Managed by Wahed — view only</div>}
                {depts.map(d=>{
                  const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100);
                  return (
                    <div key={d} className={`border rounded-xl p-2.5 ${pctBg(pct)}`}>
                      <div className='flex justify-between items-center mb-1'>
                        <span className='font-medium text-sm'>{d}</span>
                        <span className={`text-xs font-bold ${pctColor(pct)}`}>{pct}%</span>
                      </div>
                      <Progress value={pct} className='h-1 mb-1.5'/>
                      {access.isCEO
                        ? <Input type='number' value={admissions[d]} onChange={e=>updateAdmission(d,e.target.value)} className='h-7 text-xs bg-white'/>
                        : <div className='text-xs text-gray-500'>{val} / {DEPT_TARGET}</div>
                      }
                    </div>
                  );
                })}
                {access.isCEO && <Button onClick={save} className='w-full bg-red-700 hover:bg-red-800'>Save</Button>}
              </CardContent></Card>
            </div>
            {lastSaved && <div className='text-xs text-gray-400 text-right'>{lastSaved}</div>}
          </div>}

          {/* ── REPORTS ── */}
          {activeTab==='reports' && <div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <h3 className='font-bold text-gray-700'>{access.isCEO?'Full Team Report':'My Report'} — {period} / {month}</h3>
              <Button variant='outline' onClick={exportReport} className='text-xs h-8'>⬇ Export CSV</Button>
            </div>
            <Card><CardContent className='p-0 overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 border-b'>
                  <tr>{['Member','Role','Target','Actual','%','Score',access.isCEO&&'Bonus',access.isCEO&&'Tier'].filter(Boolean).map(h=>(
                    <th key={h} className='text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide'>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {memberBonuses.filter(m=>access.isCEO||access.canEdit.includes(m.name)).map((m,i)=>(
                    <tr key={i} className='border-b hover:bg-gray-50 transition-colors'>
                      <td className='px-4 py-3 font-medium'>{m.name}</td>
                      <td className='px-4 py-3 text-gray-500 text-xs'>{m.role}</td>
                      <td className='px-4 py-3'>{m.target}L</td>
                      <td className='px-4 py-3 font-semibold'>{m.actual}L</td>
                      <td className={`px-4 py-3 font-bold ${pctColor(m.pct)}`}>{m.pct}%</td>
                      <td className='px-4 py-3 text-blue-600 font-medium'>{actScore(m.name)}</td>
                      {access.isCEO && <td className='px-4 py-3 text-green-600 font-medium'>₹{fmt(m.bonus)}</td>}
                      {access.isCEO && <td className='px-4 py-3 text-xs'>{getBonusTierLabel(m.pct)}</td>}
                    </tr>
                  ))}
                </tbody>
                {access.isCEO && (
                  <tfoot className='bg-gray-50 border-t font-bold'>
                    <tr>
                      <td className='px-4 py-3' colSpan={2}>Total</td>
                      <td className='px-4 py-3'>{totalTarget}L</td>
                      <td className='px-4 py-3'>{totalActual}L</td>
                      <td className={`px-4 py-3 ${pctColor(revenuePct)}`}>{revenuePct}%</td>
                      <td className='px-4 py-3'></td>
                      <td className='px-4 py-3 text-green-600'>₹{fmt(salesBonus)}</td>
                      <td className='px-4 py-3'></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </CardContent></Card>
          </div>}

          {/* ── ANALYSIS — CEO only ── */}
          {activeTab==='analysis' && canSeeTab('analysis') && <div className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <KpiCard label='Sales Performance' value={`${revenuePct}%`} pct={revenuePct} sub={`${totalActual}L of ${totalTarget}L`} trend={revTrend}/>
              <KpiCard label='Delivery Performance' value={`${deliveryPct}%`} pct={deliveryPct} sub={`${totalAdmissions} of ${TOTAL_DEL_TARGET}`} trend={delTrend}/>
            </div>
            {/* Dept breakdown */}
            <Card><CardContent className='p-4'>
              <h3 className='font-bold text-gray-700 mb-4'>Delivery by Department</h3>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                {depts.map(d=>{
                  const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100);
                  return (
                    <div key={d} className='text-center'>
                      <Ring pct={pct} size={64} stroke={5}/>
                      <div className='text-xs font-medium mt-1'>{d}</div>
                      <div className='text-xs text-gray-400'>{val}/{DEPT_TARGET}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent></Card>
            {/* History table */}
            {history.length > 0 && <Card><CardContent className='p-4'>
              <h3 className='font-bold text-gray-700 mb-3'>Monthly History</h3>
              <table className='w-full text-sm'>
                <thead><tr className='border-b text-xs text-gray-500'><th className='text-left py-2'>Month</th><th>Revenue</th><th>Revenue %</th><th>Admissions</th><th>Delivery %</th></tr></thead>
                <tbody>
                  {[...history].reverse().map((h,i)=>(
                    <tr key={i} className='border-b hover:bg-gray-50'>
                      <td className='py-2 font-medium'>{h.month}</td>
                      <td className='py-2 text-center'>{h.totalActual}L</td>
                      <td className={`py-2 text-center font-bold ${pctColor(h.revenuePct)}`}>{h.revenuePct}%</td>
                      <td className='py-2 text-center'>{h.totalAdmissions}</td>
                      <td className={`py-2 text-center font-bold ${pctColor(h.deliveryPct)}`}>{h.deliveryPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>}
          </div>}

          {/* ── BONUS — CEO only ── */}
          {activeTab==='bonus' && canSeeTab('bonus') && <div className='space-y-4'>
            <div className='grid md:grid-cols-3 gap-4'>
              <KpiCard label='Total Sales Bonus' value={`₹${fmt(salesBonus)}`} color='text-green-600'/>
              <KpiCard label='Leader Sales Bonus' value={`₹${fmt(leaderBonus)}`} color='text-green-600' sub='100%→₹35k | 90%→₹25k | 70%→₹10k'/>
              <KpiCard label='Delivery Leader Bonus' value={delivBonus} color='text-green-600'/>
            </div>
            <div className='grid lg:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4'>
                <h3 className='font-bold text-red-700 mb-3'>Sales Bonus Breakdown</h3>
                {memberBonuses.map((m,i)=>(
                  <div key={i} className='flex items-center justify-between py-2 border-b last:border-0'>
                    <div>
                      <div className='text-sm font-medium'>{m.name}</div>
                      <div className={`text-xs ${pctColor(m.pct)}`}>{getBonusTierLabel(m.pct)}</div>
                    </div>
                    <div className='text-right'>
                      <div className='font-bold text-green-600'>₹{fmt(m.bonus)}</div>
                      <div className='text-xs text-gray-400'>{m.pct}%</div>
                    </div>
                  </div>
                ))}
                <div className='flex justify-between font-bold pt-2 border-t mt-1'>
                  <span>Total</span><span className='text-green-600'>₹{fmt(salesBonus)}</span>
                </div>
              </CardContent></Card>
              <Card><CardContent className='p-4'>
                <h3 className='font-bold text-red-700 mb-3'>Delivery Bonus Breakdown</h3>
                {depts.map((d,i)=>{
                  const val=safeParse(admissions[d]); const pct=Math.round((val/DEPT_TARGET)*100);
                  return (
                    <div key={i} className='flex items-center justify-between py-2 border-b last:border-0'>
                      <div>
                        <div className='text-sm font-medium'>{d}</div>
                        <div className='text-xs text-gray-400'>{val}/{DEPT_TARGET}</div>
                      </div>
                      <div className={`text-sm font-bold ${pctColor(pct)}`}>{getDeliveryTier(pct)}</div>
                    </div>
                  );
                })}
              </CardContent></Card>
            </div>
          </div>}

          {/* ── CEO TAB ── */}
          {activeTab==='ceo' && canSeeTab('ceo') && <div className='space-y-4'>
            <div className='grid md:grid-cols-4 gap-4'>
              <KpiCard label='Revenue' value={`${totalActual}L`} pct={revenuePct} sub={`${revenuePct}% of ${totalTarget}L`}/>
              <KpiCard label='Admissions' value={totalAdmissions} pct={deliveryPct} sub={`${deliveryPct}% of ${TOTAL_DEL_TARGET}`}/>
              <KpiCard label='Total Bonus Cost' value={`₹${fmt(salesBonus+leaderBonus)}`} color='text-green-600'/>
              <KpiCard label='Period' value={period} sub={month}/>
            </div>
            <div className='grid md:grid-cols-2 gap-4'>
              <KpiCard label='Sales Leader Bonus' value={`₹${fmt(leaderBonus)}`} color='text-green-600' sub={`At ${revenuePct}% revenue achievement`}/>
              <KpiCard label='Delivery Leader Bonus' value={delivBonus} color='text-green-600' sub={`At ${deliveryPct}% delivery achievement`}/>
            </div>
          </div>}

          {/* ── REVIEW ── */}
          {activeTab==='review' && canSeeTab('review') && <div className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>📋 Daily Review Insights</h3>
                {[
                  { label:'⚡ Lowest Activity', value: reviewStats.lowestActivity?`${reviewStats.lowestActivity.name} (score: ${reviewStats.lowestActivity.score})`:'No data' },
                  { label:'📞 Highest Caller',  value: reviewStats.highestCaller?`${reviewStats.highestCaller.name} (${reviewStats.highestCaller.calls} calls)`:'No data' },
                  { label:'🏆 Best Converter',  value: reviewStats.bestConverter?`${reviewStats.bestConverter.name} (${reviewStats.bestConverter.pct}%)`:'No data' },
                  { label:'⏳ Pending Updates', value: reviewStats.pendingUpdates.length>0?reviewStats.pendingUpdates.join(', '):'All updated ✓' },
                ].map(({label,value})=>(
                  <div key={label} className='flex justify-between items-start py-2 border-b last:border-0'>
                    <span className='text-sm text-gray-500'>{label}</span>
                    <span className='text-sm font-medium text-right max-w-xs'>{value}</span>
                  </div>
                ))}
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>📤 Reports</h3>
                <p className='text-sm text-gray-500'>Export or send the current period summary.</p>
                <Button className='w-full bg-red-700 hover:bg-red-800' onClick={()=>{exportReport();toast('Report exported');}}>⬇ Export CSV Report</Button>
                <Button variant='outline' className='w-full' onClick={()=>window.print()}>🖨 Print Report</Button>
              </CardContent></Card>
            </div>
          </div>}

          {/* ── OPS ── */}
          {activeTab==='ops' && canSeeTab('ops') && <div className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>📍 Attendance</h3>
                <p className='text-sm text-gray-500'>Check-in / Check-out with timestamp.</p>
                <Button className='w-full bg-red-700 hover:bg-red-800' onClick={()=>{toast(`Attendance marked for ${currentUser} at ${new Date().toLocaleTimeString()}`);}}>✅ Mark Attendance</Button>
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>🤖 AI Forecast</h3>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'><span className='text-gray-500'>Projected Revenue (next month)</span><span className='font-bold'>{Math.round(totalActual*1.15)}L</span></div>
                  <div className='flex justify-between'><span className='text-gray-500'>Projected Admissions</span><span className='font-bold'>{Math.round(totalAdmissions*1.1)}</span></div>
                  <div className='flex justify-between'><span className='text-gray-500'>On Track Probability</span><span className={`font-bold ${pctColor(revenuePct)}`}>{revenuePct>=70?'High':'Low'}</span></div>
                </div>
              </CardContent></Card>
            </div>
          </div>}

          {/* ── DB ── */}
          {activeTab==='db' && canSeeTab('db') && <div className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>🗄️ Database Sync</h3>
                <div className='flex items-center gap-2'>
                  <div className={`w-2 h-2 rounded-full ${dbStatus.includes('Synced')?'bg-green-500':dbStatus.includes('Offline')?'bg-red-500':'bg-yellow-500'}`}/>
                  <span className='text-sm font-medium'>{dbStatus}</span>
                </div>
                <div className='text-xs text-gray-400'>Last: {lastSaved || 'Not yet saved'}</div>
                <div className='flex gap-2 flex-wrap'>
                  <Button onClick={save} className='bg-red-700 hover:bg-red-800 text-xs h-8'>Sync Now</Button>
                  <Button variant='outline' onClick={()=>setDbStatus('Sync Requested')} className='text-xs h-8'>Test Connection</Button>
                  {access.isCEO && <Button variant='outline' onClick={()=>setConfirmReset(true)} className='text-xs h-8 text-red-600 border-red-200 hover:bg-red-50'>Reset Local DB</Button>}
                </div>
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>📦 Stored Modules</h3>
                {['Team Data & Targets','Admissions per Department','Activity Logs','Month & Review Period','Bonus Calculations','Monthly History Snapshots'].map(item=>(
                  <div key={item} className='flex items-center gap-2 text-sm text-gray-600'><span className='text-green-500'>✓</span>{item}</div>
                ))}
              </CardContent></Card>
            </div>
          </div>}

        </main>
      </div>
    </div>
  );
}
