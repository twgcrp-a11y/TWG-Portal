// TWG MONITORING PORTAL — PRODUCTION v4.0 (MySQL sync)
// ─────────────────────────────────────────
// v3 additions:
//  - Daily Log tab: each member logs calls, meetings, leads, closures, collection, revenue daily
//  - Every submission is timestamped and stored as an immutable row
//  - CEO sees full log of all members across all dates
//  - Managers see only their own log
//  - Daily log feeds into monthly totals automatically
//  - CSV export of daily log
//  - Today's entry pre-filled if already submitted

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from './api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPT_TARGET      = 40;
const TOTAL_DEL_TARGET = 280;
const SESSION_TIMEOUT  = 30 * 60 * 1000;

const months  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const depts   = ['Safety','Quality','SCM','RFM','IT','ESS','CAD CAM'];
const periods = ['Daily','Weekly','Monthly','Quarterly','Yearly'];

const TODAY = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const seed = [
  { name: "Abdullah Qidvai + CA's BD Team", role: 'Central Sales Team',       target: 15, actual: 0 },
  { name: 'AQ',                             role: 'BL Head - Talent Acquisition', target: 3,  actual: 0 },
  { name: 'Tameem', role: 'BL Head - GDC Development', target: 3, actual: 0 },
  { name: 'Muzamil', role: 'BL Head - Academic Wing', target: 3, actual: 0 },
  { name: 'Munawar', role: 'Direct Hiring', target: 3, actual: 0 },
  { name: 'Wahed',                          role: 'Delivery Operations Head',  target: TOTAL_DEL_TARGET, actual: 0 },
];

const EMPTY_DAILY = () => ({ calls:'', meetings:'', leads:'', closures:'', orderIntake:'', sales:'' });
const makeEmptyActivities = () =>
  Object.fromEntries(seed.filter(s => s.name !== 'Wahed').map(s => [s.name, EMPTY_DAILY()]));

const safeParse = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmt       = n => { const v = Number(n); return isNaN(v) ? '0' : v.toLocaleString('en-IN'); };
const pctColor  = p => p>=100?'text-green-600':p>=70?'text-yellow-600':'text-red-500';
const pctBg     = p => p>=100?'bg-green-50 border-green-200':p>=70?'bg-yellow-50 border-yellow-200':'bg-red-50 border-red-200';
const fmtDate   = d => { const dt=new Date(d); return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); };

// ─── Access Control ───────────────────────────────────────────────────────────
const ACCESS = {
  CEO:      { isCEO:true,  isDelivery:false, teamName:null,               canEdit:seed.map(s=>s.name),                                                          tabs:['dashboard','daily','team','reports','analysis','bonus','ceo','review','ops','db'], label:'CEO — Full Access',    color:'bg-red-100 text-red-800 border-red-200' },
  Abdullah: { isCEO:false, isDelivery:false, teamName:"Abdullah Qidvai + CA's BD Team",  canEdit:["Abdullah Qidvai + CA's BD Team",'Munawar'],                 tabs:['dashboard','daily','team','reports','ops','db'],                                  label:'Sales Team Lead',      color:'bg-blue-100 text-blue-800 border-blue-200' },
  Munawar:  { isCEO:false, isDelivery:false, teamName:'Munawar',          canEdit:['Munawar'],                                                                   tabs:['dashboard','daily','team','reports','ops','db'],                                  label:'Direct Hiring',        color:'bg-purple-100 text-purple-800 border-purple-200' },
  Tameem:   { isCEO:false, isDelivery:false, teamName:'Tameem',           canEdit:['Tameem'],                                                                    tabs:['dashboard','daily','team','reports','ops','db'],                                  label:'BL Head – GDC',        color:'bg-green-100 text-green-800 border-green-200' },
  Muzamil:  { isCEO:false, isDelivery:false, teamName:'Muzamil',          canEdit:['Muzamil'],                                                                   tabs:['dashboard','daily','team','reports','ops','db'],                                  label:'BL Head – Academic',   color:'bg-orange-100 text-orange-800 border-orange-200' },
  AQ:       { isCEO:false, isDelivery:false, teamName:'AQ',
    canEdit:['AQ'],
    tabs:['dashboard','daily','team','reports','ops','db'],
    label:'BL Head – Talent Acquisition', color:'bg-indigo-100 text-indigo-800 border-indigo-200' },
  Wahed:    { isCEO:false, isDelivery:true,  teamName:'Wahed',            canEdit:[],                                                                            tabs:['ops'],                                                                           label:'Delivery Ops Head',    color:'bg-teal-100 text-teal-800 border-teal-200' },
};

// ─── Bonus helpers ────────────────────────────────────────────────────────────
const getMemberBonus    = p => p>=125?35000:p>=100?20000:p>=90?10000:p>=70?5000:0;
const getLeaderBonus    = p => p>=100?35000:p>=90?25000:p>=70?10000:0;
const getDeliveryTier   = p => p>=100?'100% Salary':p>=85?'50% Salary':p>=70?'25% Salary':p>=50?'10% Salary':'No Bonus';
const getBonusTierLabel = p => p>=125?'125%+ 🏆':p>=100?'100% 🎯':p>=90?'90% ✅':p>=70?'70% 👍':'Below 70%';

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none'>
      {toasts.map(t=>(
        <div key={t.id} className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-white
          ${t.type==='success'?'bg-green-600':t.type==='error'?'bg-red-600':'bg-gray-800'}`}>{t.msg}</div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, pct, trend, color='text-red-700' }) {
  return (
    <Card className='hover:shadow-md transition-shadow'>
      <CardContent className='p-4'>
        <div className='text-xs text-gray-500 font-medium uppercase tracking-wide'>{label}</div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
        {pct!==undefined && <Progress value={pct} className='mt-2 h-1.5'/>}
        <div className='flex justify-between items-center mt-1'>
          {sub && <div className='text-xs text-gray-400'>{sub}</div>}
          {trend!==undefined && <div className={`text-xs font-medium ${trend>=0?'text-green-600':'text-red-500'}`}>{trend>=0?'↑':'↓'}{Math.abs(trend)}%</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ user }) {
  const a=ACCESS[user]; if(!a) return null;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${a.color}`}>{a.label}</span>;
}

function LockedInput({ canEdit, value, ...props }) {
  if (!canEdit) return (
    <div className='w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 flex justify-between items-center'>
      <span>{value||'—'}</span><span className='text-xs'>🔒</span>
    </div>
  );
  return <Input value={value} {...props}/>;
}

function Ring({ pct, size=56, stroke=5 }) {
  const r=((size-stroke*2)/2), circ=2*Math.PI*r, fill=Math.min(pct,100)/100*circ;
  const color=pct>=100?'#16a34a':pct>=70?'#ca8a04':'#dc2626';
  return (
    <svg width={size} height={size} className='-rotate-90'>
      <circle cx={size/2} cy={size/2} r={r} fill='none' stroke='#e5e7eb' strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill='none' stroke={color} strokeWidth={stroke} strokeDasharray={`${fill} ${circ}`} strokeLinecap='round' style={{transition:'stroke-dasharray 0.5s ease'}}/>
      <text x='50%' y='50%' dominantBaseline='middle' textAnchor='middle' style={{transform:'rotate(90deg)',transformOrigin:'50% 50%',fontSize:'11px',fontWeight:'700',fill:color}}>{pct}%</text>
    </svg>
  );
}

function ConfirmDialog({ msg, onYes, onNo }) {
  return (
    <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4'>
        <div className='text-base font-semibold'>{msg}</div>
        <div className='flex gap-3 justify-end'>
          <Button variant='outline' onClick={onNo}>Cancel</Button>
          <Button onClick={onYes} className='bg-red-700 hover:bg-red-800'>Confirm</Button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(rows, filename) {
  if (!rows.length) return;
  const header = Object.keys(rows[0]).join(',');
  const body   = rows.map(r=>Object.values(r).map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob   = new Blob([header+'\n'+body],{type:'text/csv'});
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
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
  const [dailyLog,     setDailyLog]     = useState([]); // [{id,member,date,calls,meetings,leads,closures,collection,revenue,submittedAt}]
  const [dailyForm,    setDailyForm]    = useState(EMPTY_DAILY());
  const [logFilter,    setLogFilter]    = useState('all'); // 'all' | member name
  const [dbStatus,     setDbStatus]     = useState('Local Mode');
  const [toasts,       setToasts]       = useState([]);
  const [loginError,   setLoginError]   = useState('');
  const [lastSaved,    setLastSaved]    = useState('');
  const [loginTime,    setLoginTime]    = useState(null);
  const [history,      setHistory]      = useState([]);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [activeTab,    setActiveTab]    = useState('dashboard');
  const [confirmReset, setConfirmReset] = useState(false);
  const [editTargets,  setEditTargets]  = useState(false);
  const [editingEntry,  setEditingEntry]  = useState(null);  // { id, fields }
  const [pwdForm,       setPwdForm]       = useState({ username: 'Abdullah', newPassword: '', confirm: '' });
  const [pwdMsg,        setPwdMsg]        = useState('');
  const [adminPwdInput, setAdminPwdInput] = useState('');
  const hasLoaded  = useRef(false);
  const sessionRef = useRef(null);

  const access        = ACCESS[currentUser] || ACCESS.CEO;
  const canEditMember = name => access.isCEO || access.canEdit.includes(name);
  const canSeeTab     = tab  => access.tabs.includes(tab);

  // ── Derived ────────────────────────────────────────────────────────────────
  const revenueTeam     = team.filter(t=>t.name!=='Wahed');
  const totalTarget     = revenueTeam.reduce((a,b)=>a+b.target,0);
  // Actual = sum of all daily log 'sales' entries for current month (auto-calculated)
  const currentMonthPrefix = new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
  const calcActualForMember = (name) => dailyLog
    .filter(e => e.member === name && e.date.startsWith(currentMonthPrefix))
    .reduce((a, e) => a + safeParse(e.sales ?? e.revenue ?? 0), 0);
  const totalActual = revenueTeam.reduce((a, m) => a + calcActualForMember(m.name), 0);
  // Build team with auto-calculated actuals for % and bonus calculations
  const teamWithActuals = revenueTeam.map(m => ({ ...m, actual: calcActualForMember(m.name) }));
  const totalAdmissions = Object.values(admissions).reduce((a,b)=>a+safeParse(b),0);
  const revenuePct      = Math.min(Math.round((totalActual/((totalTarget*1000)||1))*100),100); // target L×1000 → K
  const deliveryPct     = Math.min(Math.round((totalAdmissions/TOTAL_DEL_TARGET)*100),100);
  const memberBonuses   = teamWithActuals.map(m=>{ const pct=Math.round((safeParse(m.actual)/((m.target*1000)||1))*100); return {...m,pct,bonus:getMemberBonus(pct)}; }); // target L×1000 → K
  const salesBonus      = memberBonuses.reduce((a,m)=>a+m.bonus,0);
  const leaderBonus     = getLeaderBonus(revenuePct);
  const delivBonus      = getDeliveryTier(deliveryPct);
  const actScore        = name => { const a=activities[name]||{}; return safeParse(a.calls)+safeParse(a.meetings)*3+safeParse(a.leads)*5+safeParse(a.closures)*10; };

  const myMember = revenueTeam.find(m=>m.name===access.teamName);
  const myActual = myMember ? calcActualForMember(myMember.name) : 0;
  const myTarget = myMember?myMember.target:1;
  const myPct    = Math.min(Math.round((myActual/(myTarget*1000||1))*100),100); // target L×1000 → K
  const myBonus  = getMemberBonus(myPct);

  const reviewStats = (()=>{
    const scored=revenueTeam.map(m=>({name:m.name,score:actScore(m.name),calls:safeParse(activities[m.name]?.calls)}));
    return {
      lowestActivity:[...scored].sort((a,b)=>a.score-b.score)[0],
      highestCaller: [...scored].sort((a,b)=>b.calls-a.calls)[0],
      bestConverter: [...memberBonuses].sort((a,b)=>b.pct-a.pct)[0],
      pendingUpdates:revenueTeam.filter(m=>calcActualForMember(m.name)===0).map(m=>m.name),
    };
  })();

  // ── Daily log derived ──────────────────────────────────────────────────────
  // Which member name to use for the form (CEO picks from dropdown, others locked to self)
  const myDailyMember = access.isCEO ? (logFilter==='all'?revenueTeam[0]?.name:logFilter) : access.teamName;

  // Today's entry for current member (to show "already submitted" state)
  const todayEntry = dailyLog.find(e=>e.member===myDailyMember && e.date===TODAY());

  // Filtered log for display
  const visibleLog = access.isCEO
    ? (logFilter==='all' ? [...dailyLog] : dailyLog.filter(e=>e.member===logFilter))
    : dailyLog.filter(e=>e.member===access.teamName);

  const sortedLog = [...visibleLog].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));

  // Daily totals per member (sum of all log entries for current month)
  const dailyTotals = revenueTeam.map(m=>{
    const entries = dailyLog.filter(e=>e.member===m.name && e.date.startsWith(new Date().getFullYear()+'-'+(String(new Date().getMonth()+1).padStart(2,'0'))));
    return {
      name: m.name,
      calls:    entries.reduce((a,e)=>a+safeParse(e.calls),0),
      meetings: entries.reduce((a,e)=>a+safeParse(e.meetings),0),
      leads:    entries.reduce((a,e)=>a+safeParse(e.leads),0),
      closures: entries.reduce((a,e)=>a+safeParse(e.closures),0),
      orderIntake: entries.reduce((a,e)=>a+safeParse(e.orderIntake??e.collection),0),
      sales:    entries.reduce((a,e)=>a+safeParse(e.sales??e.revenue),0),
      days:     entries.length,
    };
  });

  // ── Toast helper ───────────────────────────────────────────────────────────
  const toast = useCallback((msg,type='success')=>{
    const id=Date.now(); setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  },[]);

  // ── Session timeout ────────────────────────────────────────────────────────
  const resetSession = useCallback(()=>{
    if(sessionRef.current) clearTimeout(sessionRef.current);
    if(auth) sessionRef.current=setTimeout(()=>{setAuth(false);setPassword('');toast('Session expired. Please log in again.','error');},SESSION_TIMEOUT);
  },[auth,toast]);
  useEffect(()=>{resetSession();return()=>{if(sessionRef.current)clearTimeout(sessionRef.current);};},[auth,resetSession]);
  useEffect(()=>{ const ev=['mousemove','keydown','click','scroll']; ev.forEach(e=>window.addEventListener(e,resetSession)); return()=>ev.forEach(e=>window.removeEventListener(e,resetSession)); },[resetSession]);

  // ── Ctrl+S ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const h=e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();if(auth)save();} };
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h);
  },[auth,team,admissions,activities,month,period,dailyLog]);

  // ── Load from MySQL on login (primary source of truth) ─────────────────────
  const loadFromDB = useCallback(async (monthVal) => {
    setDbStatus('Loading…');
    const data = await api.load(monthVal || month);
    if (data && data.ok) {
      if (data.team && data.team.length > 0)  setTeam(data.team);
      if (data.admissions)                    setAdmissions(prev=>({...Object.fromEntries(depts.map(d=>[d,0])),...data.admissions}));
      if (data.dailyLog)                      setDailyLog(data.dailyLog);
      if (data.settings?.month)               setMonth(data.settings.month);
      if (data.settings?.period)              setPeriod(data.settings.period);
      setDbStatus('Synced ✓');
      // Also cache locally as fallback
      localStorage.setItem('twg_portal_db', JSON.stringify({team:data.team,admissions:data.admissions,dailyLog:data.dailyLog,updatedAt:new Date().toISOString()}));
    } else {
      // MySQL unavailable — fall back to localStorage
      const saved = localStorage.getItem('twg_portal_db');
      if (saved) { try { const d=JSON.parse(saved); if(d.team)setTeam(d.team); if(d.admissions)setAdmissions(d.admissions); if(d.dailyLog)setDailyLog(d.dailyLog); } catch(e){} }
      setDbStatus('Offline Cache');
    }
    hasLoaded.current = true;
  }, [month]);

  // ── Auto-sync every 60 seconds (keeps CEO dashboard live) ──────────────────
  useEffect(() => {
    if (!auth) return;
    const interval = setInterval(() => loadFromDB(month), 60000);
    return () => clearInterval(interval);
  }, [auth, month, loadFromDB]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const login=async()=>{
    setLoginError('');
    const result = await api.login(currentUser, password);
    if (result.ok) {
      setAuth(true);
      setLoginTime(new Date());
      setDbStatus(result.mode === 'mysql' ? 'Connected' : 'Local Mode');
      await loadFromDB(month); // load shared data immediately on login
    } else {
      setLoginError(result.error || 'Invalid password. Contact admin if locked out.');
    }
  };
  const logout=()=>{ setAuth(false);setPassword('');setLoginError('');setLoginTime(null);setSidebarOpen(false); };

  const save=async()=>{
    const snapshot={month,totalActual,totalAdmissions,revenuePct,deliveryPct,savedAt:new Date().toISOString()};
    setHistory(prev=>[...prev.filter(h=>h.month!==month),snapshot]);
    setLastSaved(`Saved by ${currentUser} • ${new Date().toLocaleTimeString()}`);
    const ok = await api.save({ user:currentUser, team, admissions, dailyLog, month, period });
    if (ok) { setDbStatus('Synced ✓'); toast('Saved & synced to database ✓'); }
    else {
      // Save to localStorage as fallback
      localStorage.setItem('twg_portal_db', JSON.stringify({team,admissions,dailyLog,month,period,updatedAt:new Date().toISOString()}));
      setDbStatus('Offline Cache'); toast('Saved locally — server unreachable','error');
    }
  };

  // ── Daily Log Submit — saves to DB immediately ─────────────────────────────
  const submitDailyLog=async()=>{
    const member = myDailyMember;
    if(!member){ toast('Select a member first','error'); return; }
    const vals = Object.values(dailyForm).map(safeParse);
    if(vals.every(v=>v===0)){ toast('Fill at least one field before submitting','error'); return; }
    const entry = {
      id:          Date.now(),
      member,
      date:        TODAY(),
      calls:       safeParse(dailyForm.calls),
      meetings:    safeParse(dailyForm.meetings),
      leads:       safeParse(dailyForm.leads),
      closures:    safeParse(dailyForm.closures),
      orderIntake: safeParse(dailyForm.orderIntake),
      sales:       safeParse(dailyForm.sales),
      submittedAt: new Date().toISOString(),
      submittedBy: currentUser,
    };
    // Add to local state immediately for instant UI feedback
    setDailyLog(prev=>[...prev, entry]);
    setDailyForm(EMPTY_DAILY());
    // Sync to DB right away so CEO sees it immediately
    const ok = await api.save({ user:currentUser, team, admissions, dailyLog:[...dailyLog, entry], month, period });
    if(ok) toast(`Daily log submitted & synced ✓`);
    else   toast(`Daily log saved locally — will sync on next save`,'error');
  };

  const deleteDailyEntry = async (id) => {
    if(!access.isCEO){ toast('Only CEO can delete entries','error'); return; }
    setDailyLog(prev=>prev.filter(e=>e.id!==id));
    await api.deleteLog(id);
    toast('Entry deleted');
  };

  const startEditEntry = (e) => {
    // Allow CEO to edit any entry, others only their own
    if (!access.isCEO && e.member !== access.teamName) { toast('You can only edit your own entries','error'); return; }
    setEditingEntry({
      id: e.id,
      calls:       String(e.calls ?? 0),
      meetings:    String(e.meetings ?? 0),
      leads:       String(e.leads ?? 0),
      closures:    String(e.closures ?? 0),
      orderIntake: String(e.orderIntake ?? e.collection ?? 0),
      sales:       String(e.sales ?? e.revenue ?? 0),
    });
  };

  const saveEditedEntry = async () => {
    const updated = {
      ...editingEntry,
      calls:       safeParse(editingEntry.calls),
      meetings:    safeParse(editingEntry.meetings),
      leads:       safeParse(editingEntry.leads),
      closures:    safeParse(editingEntry.closures),
      orderIntake: safeParse(editingEntry.orderIntake),
      sales:       safeParse(editingEntry.sales),
    };
    const newLog = dailyLog.map(e => e.id === updated.id ? { ...e, ...updated } : e);
    setDailyLog(newLog);
    setEditingEntry(null);
    const ok = await api.save({ user: currentUser, team, admissions, dailyLog: newLog, month, period });
    if (ok) toast('Entry updated ✓');
    else    toast('Updated locally — will sync on next save', 'error');
  };

  const updateActual    = (name,val) => { if(!canEditMember(name))return; setTeam(p=>p.map(m=>m.name===name?{...m,actual:safeParse(val)}:m)); };
  const updateTarget    = (name,val) => { if(!access.isCEO)return; setTeam(p=>p.map(m=>m.name===name?{...m,target:safeParse(val)}:m)); };
  const updateActivity  = (name,f,v) => { if(!canEditMember(name))return; setActivities(p=>({...p,[name]:{...p[name],[f]:v}})); };
  const updateAdmission = (dept,val) => { if(!access.isCEO&&!access.isDelivery)return; setAdmissions(p=>({...p,[dept]:safeParse(val)})); };
  const doReset=()=>{ localStorage.removeItem('twg_portal_db'); setTeam(seed); setAdmissions(Object.fromEntries(depts.map(d=>[d,0]))); setDailyLog([]); setHistory([]); setLastSaved(''); setDbStatus('Reset'); setConfirmReset(false); toast('Local database reset','error'); };

  // Change team member password (CEO only)
  const changePassword = async () => {
    setPwdMsg('');
    if (!pwdForm.newPassword) { setPwdMsg('❌ Enter a new password'); return; }
    if (pwdForm.newPassword.length < 6) { setPwdMsg('❌ Password must be at least 6 characters'); return; }
    if (pwdForm.newPassword !== pwdForm.confirm) { setPwdMsg('❌ Passwords do not match'); return; }
    try {
      const r = await fetch('/api/change-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: adminPwdInput, username: pwdForm.username, newPassword: pwdForm.newPassword }),
      });
      const data = await r.json();
      if (data.ok) {
        setPwdMsg(`✅ Password updated for ${pwdForm.username}`);
        setPwdForm(p => ({ ...p, newPassword: '', confirm: '' }));
        setAdminPwdInput('');
        toast(`Password updated for ${pwdForm.username} ✓`);
      } else {
        setPwdMsg(`❌ ${data.error}`);
      }
    } catch (e) {
      setPwdMsg('❌ Network error — try again');
    }
  };

  // Targeted reset — clears only daily log + admissions, keeps team targets
  const resetActivityData = async () => {
    setDailyLog([]);
    setAdmissions(Object.fromEntries(depts.map(d=>[d,0])));
    setLastSaved('');
    // Sync cleared data to DB
    const ok = await api.save({ user: currentUser, team, admissions: Object.fromEntries(depts.map(d=>[d,0])), dailyLog: [], month, period });
    if (ok) { setDbStatus('Synced ✓'); toast('Daily log, Sales, Order Intake & Delivery cleared ✓'); }
    else { toast('Cleared locally — sync manually', 'error'); }
    setConfirmReset(false);
  };

  // ── MemberCard ─────────────────────────────────────────────────────────────
  const MemberCard=({m})=>{
    const canEdit=canEditMember(m.name);
    const pct=Math.min(Math.round((calcActualForMember(m.name)/((m.target*1000)||1))*100),100); // target L×1000 → K
    return (
      <div className={`border rounded-xl p-3 space-y-2 hover:shadow-sm transition-shadow ${canEdit?'border-gray-200 bg-white':'border-gray-100 bg-gray-50/50'}`}>
        <div className='flex items-start justify-between gap-2'>
          <div><div className='font-semibold text-sm'>{m.name}</div><div className='text-xs text-gray-400'>{m.role}</div></div>
          <Ring pct={pct} size={48} stroke={4}/>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <div><label className='text-xs text-gray-400 block'>Target (L)</label>
            {(access.isCEO&&editTargets)?<Input type='number' value={m.target} onChange={e=>updateTarget(m.name,e.target.value)} className='h-8 text-sm'/>:<div className='text-sm font-medium'>{m.target}L</div>}
          </div>
          <div><label className='text-xs text-gray-400 block'>Actual (₹K)</label>
            <div className='text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2'>
              ₹{Math.round(calcActualForMember(m.name))}K <span className='text-xs font-normal text-blue-500'>auto from daily log</span>
            </div>
          </div>
        </div>
        <div className={`text-xs font-medium text-center py-1 rounded-lg border ${pctBg(pct)}`}>
          {getBonusTierLabel(pct)} — ₹{fmt(getMemberBonus(pct))}
        </div>
        {!canEdit&&<div className='text-center text-xs text-gray-400'>🔒 View only</div>}
      </div>
    );
  };

  // ── Sidebar nav ─────────────────────────────────────────────────────────────
  const navItems=[
    {tab:'dashboard',icon:'📊',label:'Dashboard'},
    {tab:'daily',    icon:'📅',label:'Daily Log'},
    {tab:'team',     icon:'👥',label:'Team'},
    {tab:'reports',  icon:'📋',label:'Reports'},
    {tab:'analysis', icon:'📈',label:'Analysis'},
    {tab:'bonus',    icon:'💰',label:'Bonus'},
    {tab:'ceo',      icon:'👔',label:'CEO View'},
    {tab:'review',   icon:'🔍',label:'Review'},
    {tab:'ops',      icon:'⚙️', label:'Ops'},
    {tab:'db',       icon:'🗄️', label:'Database'},
  ].filter(n=>canSeeTab(n.tab));

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  if(!auth) return (
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
            {loginError&&<div className='text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3'>⚠️ {loginError}</div>}
            <Button onClick={login} className='w-full h-11 text-base font-semibold bg-red-700 hover:bg-red-800'>Sign In</Button>
            <p className='text-center text-xs text-gray-400'>Role-restricted · Each user sees only their data</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ── WAHED DELIVERY VIEW ─────────────────────────────────────────────────────
  if(access.isDelivery) return (
    <div className='min-h-screen bg-gray-50'>
      <Toast toasts={toasts}/>
      <div className='bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center font-black text-sm'>T</div>
          <div><div className='font-bold text-sm'>Delivery Dashboard</div><div className='text-xs text-gray-400'>TWG Portal</div></div>
        </div>
        <div className='flex items-center gap-2'><RoleBadge user={currentUser}/><Button variant='outline' onClick={logout} className='text-xs h-8'>Logout</Button></div>
      </div>
      <div className='p-4 md:p-6 space-y-5 max-w-5xl mx-auto'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          <KpiCard label='Admissions' value={totalAdmissions} pct={deliveryPct} sub={`${deliveryPct}% of ${TOTAL_DEL_TARGET}`}/>
          <KpiCard label='Bonus Tier' value={delivBonus} color='text-green-600'/>
          <KpiCard label='Month' value={month}/><KpiCard label='Period' value={period}/>
        </div>
        <div className='grid md:grid-cols-2 gap-3'>
          <Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{periods.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
        </div>
        <Card><CardContent className='p-5'>
          <div className='flex justify-between items-center mb-4'><h3 className='font-bold text-red-700'>Department Admissions</h3><span className='text-xs text-gray-400'>Target: {DEPT_TARGET}/dept</span></div>
          <div className='grid md:grid-cols-2 gap-4'>
            {depts.map(d=>{ const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100); return (
              <div key={d} className={`border rounded-xl p-3 ${pctBg(pct)}`}>
                <div className='flex items-center justify-between mb-2'><div><div className='font-semibold text-sm'>{d}</div><div className='text-xs text-gray-500'>{getDeliveryTier(pct)}</div></div><Ring pct={pct} size={52} stroke={4}/></div>
                <div className='text-xs text-gray-500 mb-1'>{val}/{DEPT_TARGET}</div>
                <Input type='number' value={admissions[d]} onChange={e=>updateAdmission(d,e.target.value)} className='h-8 text-sm bg-white'/>
              </div>
            );})}
          </div>
          <div className='flex justify-between items-center mt-4'>
            <Button onClick={save} className='bg-red-700 hover:bg-red-800'>Save (Ctrl+S)</Button>
            {lastSaved&&<span className='text-xs text-gray-400'>{lastSaved}</span>}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );

  // ── MAIN APP ────────────────────────────────────────────────────────────────
  return (
    <div className='min-h-screen bg-gray-50 flex'>
      <Toast toasts={toasts}/>
      {confirmReset==='activity'&&<ConfirmDialog msg='Clear all daily log entries, Sales, Order Intake and Delivery admissions? Team targets are kept.' onYes={resetActivityData} onNo={()=>setConfirmReset(false)}/>}
      {confirmReset==='full'&&<ConfirmDialog msg='Full reset — wipe ALL data including targets? This cannot be undone.' onYes={doReset} onNo={()=>setConfirmReset(false)}/>}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 bg-slate-900 text-white flex flex-col transition-transform duration-200 ${sidebarOpen?'translate-x-0':'-translate-x-full'} lg:relative lg:translate-x-0 lg:flex`}>
        <div className='p-4 border-b border-slate-700'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-red-700 flex items-center justify-center font-black text-lg'>T</div>
            <div><div className='font-bold text-sm'>TWG Portal</div><div className='text-xs text-slate-400'>Monitoring System</div></div>
          </div>
        </div>
        <nav className='flex-1 p-3 space-y-0.5 overflow-y-auto'>
          {navItems.map(n=>(
            <button key={n.tab} onClick={()=>{setActiveTab(n.tab);setSidebarOpen(false);}}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${activeTab===n.tab?'bg-red-700 text-white':'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <span>{n.icon}</span>{n.label}
              {n.tab==='daily'&&dailyLog.filter(e=>e.date===TODAY()).length>0&&(
                <span className='ml-auto bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center'>{dailyLog.filter(e=>e.date===TODAY()).length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className='p-3 border-t border-slate-700'>
          <div className='flex items-center gap-2 mb-2'>
            <div className='w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold'>{currentUser[0]}</div>
            <div className='flex-1 min-w-0'><div className='text-xs font-semibold truncate'>{currentUser}</div><div className='text-xs text-slate-400 truncate'>{access.label}</div></div>
          </div>
          {loginTime&&<div className='text-xs text-slate-500 mb-2'>Since {loginTime.toLocaleTimeString()}</div>}
          <Button variant='outline' onClick={logout} className='w-full h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-800'>Logout</Button>
        </div>
      </aside>
      {sidebarOpen&&<div className='fixed inset-0 bg-black/50 z-30 lg:hidden' onClick={()=>setSidebarOpen(false)}/>}

      {/* Main */}
      <div className='flex-1 flex flex-col min-w-0'>
        <header className='bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm'>
          <div className='flex items-center gap-3'>
            <button onClick={()=>setSidebarOpen(!sidebarOpen)} className='lg:hidden p-1.5 rounded-lg hover:bg-gray-100'>
              <div className='w-5 h-0.5 bg-gray-600 mb-1'/><div className='w-5 h-0.5 bg-gray-600 mb-1'/><div className='w-5 h-0.5 bg-gray-600'/>
            </button>
            <div>
              <h1 className='font-bold text-gray-800'>{navItems.find(n=>n.tab===activeTab)?.label||'Dashboard'}</h1>
              <div className='text-xs text-gray-400'>{month} · {period} · {dbStatus}</div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Select value={month} onValueChange={setMonth}><SelectTrigger className='h-8 text-xs w-28'><SelectValue/></SelectTrigger><SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className='h-8 text-xs w-24'><SelectValue/></SelectTrigger><SelectContent>{periods.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            <Button onClick={save} className='h-8 text-xs bg-red-700 hover:bg-red-800'>Save</Button>
            <Button onClick={()=>loadFromDB(month)} variant='outline' className='h-8 text-xs'>↻ Sync</Button>
            <RoleBadge user={currentUser}/>
          </div>
        </header>

        <main className='flex-1 p-4 md:p-6 overflow-y-auto'>

          {/* ── DASHBOARD ── */}
          {activeTab==='dashboard'&&<div className='space-y-5'>
            {access.isCEO?(
              <>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <KpiCard label='Total Revenue' value={`₹${Math.round(totalActual)}K`} pct={revenuePct} sub={`${revenuePct}% of ${totalTarget}L`}/>
                  <KpiCard label='Admissions' value={totalAdmissions} pct={deliveryPct} sub={`${deliveryPct}% of ${TOTAL_DEL_TARGET}`}/>
                  <KpiCard label='Bonus Cost' value={`₹${fmt(salesBonus+leaderBonus)}`} color='text-green-600'/>
                  <KpiCard label="Today's Logs" value={dailyLog.filter(e=>e.date===TODAY()).length} color='text-blue-600' sub={`of ${revenueTeam.length} members`}/>
                </div>
                {/* Daily activity summary today */}
                <Card><CardContent className='p-4'>
                  <h3 className='font-bold text-gray-700 mb-3'>📅 Today's Activity Summary — {fmtDate(TODAY())}</h3>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead><tr className='border-b text-xs text-gray-500'>{['Member','Calls','Meetings','Leads','Closures','Order Intake','Sales','Submitted'].map(h=><th key={h} className='text-left py-2 px-2 font-semibold'>{h}</th>)}</tr></thead>
                      <tbody>
                        {revenueTeam.map(m=>{
                          const e=dailyLog.find(l=>l.member===m.name&&l.date===TODAY());
                          return (
                            <tr key={m.name} className='border-b hover:bg-gray-50'>
                              <td className='py-2 px-2 font-medium'>{m.name}</td>
                              <td className='py-2 px-2'>{e?e.calls:'—'}</td>
                              <td className='py-2 px-2'>{e?e.meetings:'—'}</td>
                              <td className='py-2 px-2'>{e?e.leads:'—'}</td>
                              <td className='py-2 px-2'>{e?e.closures:'—'}</td>
                              <td className='py-2 px-2'>{e?`₹${fmt(e.orderIntake??e.collection??0)}K`:'—'}</td>
                              <td className='py-2 px-2'>{e?`₹${fmt(e.sales??e.revenue??0)}K`:'—'}</td>
                              <td className='py-2 px-2'>{e?<span className='text-green-600 text-xs font-medium'>✓ Done</span>:<span className='text-red-400 text-xs'>Pending</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent></Card>
                {/* Leaderboard */}
                <Card><CardContent className='p-4'>
                  <h3 className='font-bold text-gray-700 mb-3'>🏆 Monthly Leaderboard</h3>
                  <div className='space-y-2'>
                    {[...memberBonuses].sort((a,b)=>b.pct-a.pct).map((m,i)=>(
                      <div key={m.name} className='flex items-center gap-3'>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-yellow-400 text-yellow-900':i===1?'bg-gray-300 text-gray-700':i===2?'bg-orange-300 text-orange-800':'bg-gray-100 text-gray-500'}`}>{i+1}</div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex justify-between text-sm mb-0.5'><span className='font-medium truncate'>{m.name}</span><span className={`font-bold ${pctColor(m.pct)}`}>{m.pct}%</span></div>
                          <Progress value={m.pct} className='h-1.5'/>
                        </div>
                        <div className='text-xs text-green-600 font-medium w-16 text-right'>₹{fmt(m.bonus)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              </>
            ):(
              <div className='space-y-4'>
                <div className='text-sm font-medium text-gray-500'>Your Performance — {month} ({period})</div>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <KpiCard label='My Revenue' value={`₹${Math.round(myActual)}K`} pct={myPct} sub={`${myPct}% of ${myTarget}L`}/>
                  <KpiCard label='My Bonus' value={`₹${fmt(myBonus)}`} color='text-green-600' sub={getBonusTierLabel(myPct)}/>
                  <KpiCard label='Activity Score' value={myMember?actScore(myMember.name):0} color='text-blue-600'/>
                  <KpiCard label='Status' value={myPct>=100?'🎯 Target Hit':myPct>=70?'✅ On Track':'⚠️ Below Target'} color={myPct>=70?'text-green-600':'text-red-600'}/>
                </div>
                {/* My daily log this month */}
                {access.teamName&&(()=>{
                  const myLogs=dailyLog.filter(e=>e.member===access.teamName).slice(-7).reverse();
                  return myLogs.length>0?(
                    <Card><CardContent className='p-4'>
                      <h3 className='font-bold text-gray-700 mb-3'>📅 My Recent Daily Logs</h3>
                      <div className='space-y-2'>
                        {myLogs.map(e=>(
                          <div key={e.id} className='border rounded-lg p-3 text-sm grid grid-cols-3 md:grid-cols-6 gap-2'>
                            <div><div className='text-xs text-gray-400'>Date</div><div className='font-medium'>{fmtDate(e.date)}</div></div>
                            <div><div className='text-xs text-gray-400'>Calls</div><div className='font-medium'>{e.calls}</div></div>
                            <div><div className='text-xs text-gray-400'>Meetings</div><div className='font-medium'>{e.meetings}</div></div>
                            <div><div className='text-xs text-gray-400'>Leads</div><div className='font-medium'>{e.leads}</div></div>
                            <div><div className='text-xs text-gray-400'>Closures</div><div className='font-medium'>{e.closures}</div></div>
                            <div><div className='text-xs text-gray-400'>Revenue</div><div className='font-medium text-green-600'>₹{fmt(e.sales??e.revenue??0)}K</div></div>
                          </div>
                        ))}
                      </div>
                    </CardContent></Card>
                  ):null;
                })()}
                <Card><CardContent className='p-4'>
                  <div className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3'>Team Overview (totals only)</div>
                  <div className='grid grid-cols-3 gap-4 text-center'>
                    <div><div className='text-xl font-bold text-red-700'>₹{Math.round(totalActual)}K</div><div className='text-xs text-gray-400'>Team Revenue</div></div>
                    <div><div className='text-xl font-bold'>{totalTarget}L</div><div className='text-xs text-gray-400'>Team Target (Lakhs)</div></div>
                    <div><div className={`text-xl font-bold ${pctColor(revenuePct)}`}>{revenuePct}%</div><div className='text-xs text-gray-400'>Progress</div></div>
                  </div>
                  <Progress value={revenuePct} className='mt-3 h-2'/>
                </CardContent></Card>
              </div>
            )}
          </div>}

          {/* ── DAILY LOG ── */}
          {activeTab==='daily'&&<div className='space-y-4'>
            {/* Entry form */}
            <Card className='border-blue-200 bg-blue-50/30'>
              <CardContent className='p-5'>
                <div className='flex items-center justify-between mb-4'>
                  <div>
                    <h3 className='font-bold text-blue-800'>📝 Submit Daily Update</h3>
                    <p className='text-xs text-blue-600 mt-0.5'>{fmtDate(TODAY())} · Enter today's numbers</p>
                  </div>
                  {todayEntry&&<div className='text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-3 py-1 font-medium'>✓ Already submitted today</div>}
                </div>

                {/* Member selector — CEO picks, others locked */}
                {access.isCEO&&(
                  <div className='mb-4'>
                    <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block'>Submitting for</label>
                    <Select value={myDailyMember||''} onValueChange={v=>setLogFilter(v)}>
                      <SelectTrigger className='h-9 bg-white'><SelectValue placeholder='Select member'/></SelectTrigger>
                      <SelectContent>{revenueTeam.map(m=><SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {!access.isCEO&&access.teamName&&(
                  <div className='mb-4 text-sm font-medium text-gray-700 bg-white border rounded-lg px-3 py-2'>
                    👤 Submitting as: <span className='text-red-700 font-bold'>{access.teamName}</span>
                  </div>
                )}

                {/* Fields */}
                <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                  {[
                    {key:'calls',      label:'📞 Calls Made',      placeholder:'0'},
                    {key:'meetings',   label:'🤝 Meetings Done',   placeholder:'0'},
                    {key:'leads',      label:'🎯 Leads Generated', placeholder:'0'},
                    {key:'closures',   label:'✅ Closures',         placeholder:'0'},
                    {key:'orderIntake', label:'📋 Order Intake (₹K)', placeholder:'0'},
                    {key:'sales',      label:'💰 Sales (₹K)',        placeholder:'0'},
                  ].map(({key,label,placeholder})=>(
                    <div key={key}>
                      <label className='text-xs font-medium text-gray-600 mb-1 block'>{label}</label>
                      <Input type='number' value={dailyForm[key]} onChange={e=>setDailyForm(p=>({...p,[key]:e.target.value}))} placeholder={placeholder} className='bg-white h-9'/>
                    </div>
                  ))}
                </div>
                <div className='mt-4 flex gap-3'>
                  <Button onClick={submitDailyLog} className='bg-blue-700 hover:bg-blue-800'>Submit Daily Log</Button>
                  <Button variant='outline' onClick={()=>setDailyForm(EMPTY_DAILY())}>Clear</Button>
                </div>
              </CardContent>
            </Card>

            {/* Monthly totals per member — CEO only */}
            {access.isCEO&&(
              <Card><CardContent className='p-4'>
                <h3 className='font-bold text-gray-700 mb-3'>📊 This Month's Cumulative Activity</h3>
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead><tr className='border-b text-xs text-gray-500'>
                      {['Member','Days Logged','Calls','Meetings','Leads','Closures','Order Intake (₹K)','Sales → Monthly Actual (₹K)'].map(h=><th key={h} className='text-left py-2 px-2 font-semibold'>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {dailyTotals.map(t=>(
                        <tr key={t.name} className='border-b hover:bg-gray-50'>
                          <td className='py-2 px-2 font-medium text-xs'>{t.name}</td>
                          <td className='py-2 px-2 text-center'><span className={`font-bold ${t.days>0?'text-green-600':'text-red-400'}`}>{t.days}</span></td>
                          <td className='py-2 px-2 text-center'>{t.calls}</td>
                          <td className='py-2 px-2 text-center'>{t.meetings}</td>
                          <td className='py-2 px-2 text-center'>{t.leads}</td>
                          <td className='py-2 px-2 text-center'>{t.closures}</td>
                          <td className='py-2 px-2 text-center'>₹{fmt(t.orderIntake)}K</td>
                          <td className='py-2 px-2 text-center text-green-600 font-medium'>₹{fmt(t.sales)}K</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent></Card>
            )}

            {/* Log history */}
            <Card><CardContent className='p-4'>
              <div className='flex justify-between items-center mb-3 flex-wrap gap-2'>
                <h3 className='font-bold text-gray-700'>📋 Log History</h3>
                <div className='flex gap-2 flex-wrap'>
                  {access.isCEO&&(
                    <Select value={logFilter} onValueChange={setLogFilter}>
                      <SelectTrigger className='h-8 text-xs w-40'><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All Members</SelectItem>
                        {revenueTeam.map(m=><SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant='outline' className='h-8 text-xs' onClick={()=>exportCSV(sortedLog.map(e=>({Date:fmtDate(e.date),Member:e.member,Calls:e.calls,Meetings:e.meetings,Leads:e.leads,Closures:e.closures,OrderIntake_K:e.orderIntake,Sales_K:e.sales,SubmittedAt:e.submittedAt})),'TWG_Daily_Log.csv')}>⬇ Export CSV</Button>
                </div>
              </div>
              {sortedLog.length===0?(
                <div className='text-center py-8 text-gray-400 text-sm'>No entries yet. Submit your first daily log above ☝️</div>
              ):(
                <div className='space-y-2 max-h-96 overflow-y-auto'>
                  {sortedLog.map(e=>{
                    const isEditing = editingEntry?.id === e.id;
                    const canEdit   = access.isCEO || e.member === access.teamName;
                    return (
                    <div key={e.id} className={`border rounded-xl p-3 transition-colors ${isEditing?'border-blue-300 bg-blue-50/40':'hover:bg-gray-50'}`}>
                      {/* Header row */}
                      <div className='flex justify-between items-start mb-2'>
                        <div>
                          <span className='font-semibold text-sm'>{e.member}</span>
                          <span className='text-xs text-gray-400 ml-2'>{fmtDate(e.date)}</span>
                          {e.date===TODAY()&&<span className='ml-2 text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5'>Today</span>}
                        </div>
                        <div className='flex gap-2'>
                          {canEdit && !isEditing && (
                            <button onClick={()=>startEditEntry(e)} className='text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50'>✏️ Edit</button>
                          )}
                          {access.isCEO && !isEditing && (
                            <button onClick={()=>deleteDailyEntry(e.id)} className='text-xs text-red-400 hover:text-red-600'>✕</button>
                          )}
                        </div>
                      </div>

                      {/* View mode */}
                      {!isEditing && (
                        <div className='grid grid-cols-3 md:grid-cols-6 gap-2 text-sm'>
                          <div><div className='text-xs text-gray-400'>Calls</div><div className='font-semibold'>{e.calls}</div></div>
                          <div><div className='text-xs text-gray-400'>Meetings</div><div className='font-semibold'>{e.meetings}</div></div>
                          <div><div className='text-xs text-gray-400'>Leads</div><div className='font-semibold'>{e.leads}</div></div>
                          <div><div className='text-xs text-gray-400'>Closures</div><div className='font-semibold'>{e.closures}</div></div>
                          <div><div className='text-xs text-gray-400'>Order Intake</div><div className='font-semibold'>₹{fmt(e.orderIntake??e.collection??0)}K</div></div>
                          <div><div className='text-xs text-gray-400'>Sales</div><div className='font-semibold text-green-600'>₹{fmt(e.sales??e.revenue??0)}K</div></div>
                        </div>
                      )}

                      {/* Edit mode — inline form */}
                      {isEditing && (
                        <div className='space-y-3'>
                          <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                            {[
                              {key:'calls',       label:'📞 Calls'},
                              {key:'meetings',    label:'🤝 Meetings'},
                              {key:'leads',       label:'🎯 Leads'},
                              {key:'closures',    label:'✅ Closures'},
                              {key:'orderIntake', label:'📋 Order Intake (₹K)'},
                              {key:'sales',       label:'💰 Sales (₹K)'},
                            ].map(({key,label})=>(
                              <div key={key}>
                                <label className='text-xs text-gray-500 block mb-0.5'>{label}</label>
                                <Input type='number' value={editingEntry[key]}
                                  onChange={ev=>setEditingEntry(p=>({...p,[key]:ev.target.value}))}
                                  className='h-8 text-sm bg-white'/>
                              </div>
                            ))}
                          </div>
                          <div className='flex gap-2'>
                            <Button onClick={saveEditedEntry} className='h-8 text-xs bg-blue-700 hover:bg-blue-800'>Save Changes</Button>
                            <Button variant='outline' onClick={()=>setEditingEntry(null)} className='h-8 text-xs'>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );})}
                </div>
              )}
            </CardContent></Card>
          </div>}

          {/* ── TEAM ── */}
          {activeTab==='team'&&<div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <p className='text-sm text-gray-500'>{access.isCEO?'Full visibility. All rows editable.':`Editable: ${access.canEdit.join(', ')}`}</p>
              <div className='flex items-center gap-3'>
                <span className='text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1'>📅 Actuals auto-calculated from Daily Log</span>
                {access.isCEO&&<Button variant='outline' onClick={()=>setEditTargets(!editTargets)} className='text-xs h-8'>{editTargets?'✓ Lock Targets':'✏️ Edit Targets'}</Button>}
              </div>
            </div>
            <div className='grid lg:grid-cols-3 gap-4'>
              <Card><CardContent className='p-4 space-y-3'><h3 className='font-bold text-red-700'>🏢 Central Sales</h3>{revenueTeam.slice(0,1).map(m=><MemberCard key={m.name} m={m}/>)}<Button onClick={save} className='w-full bg-red-700 hover:bg-red-800'>Save</Button></CardContent></Card>
              <Card><CardContent className='p-4 space-y-3'><h3 className='font-bold text-red-700'>🎯 BL Heads</h3>{revenueTeam.slice(1,5).map(m=><MemberCard key={m.name} m={m}/>)}<Button onClick={save} className='w-full bg-red-700 hover:bg-red-800'>Save</Button></CardContent></Card>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>🏭 Delivery</h3>
                {!access.isCEO&&<div className='text-xs text-gray-400 bg-gray-50 rounded-lg p-2'>🔒 Managed by Wahed</div>}
                {depts.map(d=>{ const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100); return (
                  <div key={d} className={`border rounded-xl p-2.5 ${pctBg(pct)}`}>
                    <div className='flex justify-between items-center mb-1'><span className='font-medium text-sm'>{d}</span><span className={`text-xs font-bold ${pctColor(pct)}`}>{pct}%</span></div>
                    <Progress value={pct} className='h-1 mb-1.5'/>
                    {access.isCEO?<Input type='number' value={admissions[d]} onChange={e=>updateAdmission(d,e.target.value)} className='h-7 text-xs bg-white'/>:<div className='text-xs text-gray-500'>{val}/{DEPT_TARGET}</div>}
                  </div>
                );})}
                {access.isCEO&&<Button onClick={save} className='w-full bg-red-700 hover:bg-red-800'>Save</Button>}
              </CardContent></Card>
            </div>
            {lastSaved&&<div className='text-xs text-gray-400 text-right'>{lastSaved}</div>}
          </div>}

          {/* ── REPORTS ── */}
          {activeTab==='reports'&&<div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <h3 className='font-bold text-gray-700'>{access.isCEO?'Full Team Report':'My Report'} — {period} / {month}</h3>
              <Button variant='outline' className='text-xs h-8' onClick={()=>exportCSV(memberBonuses.filter(m=>access.isCEO||access.canEdit.includes(m.name)).map(m=>({Name:m.name,Role:m.role,Target:m.target,Actual_K:calcActualForMember(m.name),Percent:m.pct,ActivityScore:actScore(m.name),Bonus:m.bonus})),`TWG_Report_${month}.csv`)}>⬇ Export CSV</Button>
            </div>
            <Card><CardContent className='p-0 overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 border-b'><tr>{['Member','Role','Target (L)','Actual (₹K)','%','Score',access.isCEO&&'Bonus',access.isCEO&&'Tier'].filter(Boolean).map(h=><th key={h} className='text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide'>{h}</th>)}</tr></thead>
                <tbody>
                  {memberBonuses.filter(m=>access.isCEO||access.canEdit.includes(m.name)).map((m,i)=>(
                    <tr key={i} className='border-b hover:bg-gray-50'>
                      <td className='px-4 py-3 font-medium'>{m.name}</td>
                      <td className='px-4 py-3 text-gray-500 text-xs'>{m.role}</td>
                      <td className='px-4 py-3'>{m.target}L</td>
                      <td className='px-4 py-3 font-semibold'>₹{Math.round(calcActualForMember(m.name))}K</td>
                      <td className={`px-4 py-3 font-bold ${pctColor(m.pct)}`}>{m.pct}%</td>
                      <td className='px-4 py-3 text-blue-600'>{actScore(m.name)}</td>
                      {access.isCEO&&<td className='px-4 py-3 text-green-600 font-medium'>₹{fmt(m.bonus)}</td>}
                      {access.isCEO&&<td className='px-4 py-3 text-xs'>{getBonusTierLabel(m.pct)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </div>}

          {/* ── ANALYSIS ── */}
          {activeTab==='analysis'&&canSeeTab('analysis')&&<div className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <KpiCard label='Sales Performance' value={`${revenuePct}%`} pct={revenuePct} sub={`₹${Math.round(totalActual)}K of ${totalTarget}L`}/>
              <KpiCard label='Delivery Performance' value={`${deliveryPct}%`} pct={deliveryPct} sub={`${totalAdmissions} of ${TOTAL_DEL_TARGET}`}/>
            </div>
            <Card><CardContent className='p-4'>
              <h3 className='font-bold text-gray-700 mb-4'>Delivery by Department</h3>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                {depts.map(d=>{ const val=safeParse(admissions[d]); const pct=Math.min(Math.round((val/DEPT_TARGET)*100),100); return (<div key={d} className='text-center'><Ring pct={pct} size={64} stroke={5}/><div className='text-xs font-medium mt-1'>{d}</div><div className='text-xs text-gray-400'>{val}/{DEPT_TARGET}</div></div>); })}
              </div>
            </CardContent></Card>
            {history.length>0&&<Card><CardContent className='p-4'>
              <h3 className='font-bold text-gray-700 mb-3'>Monthly History</h3>
              <table className='w-full text-sm'>
                <thead><tr className='border-b text-xs text-gray-500'><th className='text-left py-2'>Month</th><th>Revenue</th><th>Rev%</th><th>Admissions</th><th>Del%</th></tr></thead>
                <tbody>{[...history].reverse().map((h,i)=><tr key={i} className='border-b hover:bg-gray-50'><td className='py-2 font-medium'>{h.month}</td><td className='py-2 text-center'>₹{fmt(h.totalActual)}K</td><td className={`py-2 text-center font-bold ${pctColor(h.revenuePct)}`}>{h.revenuePct}%</td><td className='py-2 text-center'>{h.totalAdmissions}</td><td className={`py-2 text-center font-bold ${pctColor(h.deliveryPct)}`}>{h.deliveryPct}%</td></tr>)}</tbody>
              </table>
            </CardContent></Card>}
          </div>}

          {/* ── BONUS ── */}
          {activeTab==='bonus'&&canSeeTab('bonus')&&<div className='space-y-4'>
            <div className='grid md:grid-cols-3 gap-4'>
              <KpiCard label='Total Sales Bonus' value={`₹${fmt(salesBonus)}`} color='text-green-600'/>
              <KpiCard label='Leader Bonus' value={`₹${fmt(leaderBonus)}`} color='text-green-600' sub='100%→₹35k|90%→₹25k|70%→₹10k'/>
              <KpiCard label='Delivery Leader Bonus' value={delivBonus} color='text-green-600'/>
            </div>
            <div className='grid lg:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4'>
                <h3 className='font-bold text-red-700 mb-3'>Sales Bonus Breakdown</h3>
                {memberBonuses.map((m,i)=><div key={i} className='flex justify-between items-center py-2 border-b last:border-0'><div><div className='text-sm font-medium'>{m.name}</div><div className={`text-xs ${pctColor(m.pct)}`}>{getBonusTierLabel(m.pct)}</div></div><div className='text-right'><div className='font-bold text-green-600'>₹{fmt(m.bonus)}</div><div className='text-xs text-gray-400'>{m.pct}%</div></div></div>)}
                <div className='flex justify-between font-bold pt-2 border-t'><span>Total</span><span className='text-green-600'>₹{fmt(salesBonus)}</span></div>
              </CardContent></Card>
              <Card><CardContent className='p-4'>
                <h3 className='font-bold text-red-700 mb-3'>Delivery Bonus Breakdown</h3>
                {depts.map((d,i)=>{ const val=safeParse(admissions[d]); const pct=Math.round((val/DEPT_TARGET)*100); return <div key={i} className='flex justify-between items-center py-2 border-b last:border-0'><div><div className='text-sm font-medium'>{d}</div><div className='text-xs text-gray-400'>{val}/{DEPT_TARGET}</div></div><div className={`text-sm font-bold ${pctColor(pct)}`}>{getDeliveryTier(pct)}</div></div>; })}
              </CardContent></Card>
            </div>
          </div>}

          {/* ── CEO ── */}
          {activeTab==='ceo'&&canSeeTab('ceo')&&<div className='space-y-4'>
            <div className='grid md:grid-cols-4 gap-4'>
              <KpiCard label='Revenue' value={`₹${Math.round(totalActual)}K`} pct={revenuePct} sub={`${revenuePct}% of ${totalTarget}L`}/>
              <KpiCard label='Admissions' value={totalAdmissions} pct={deliveryPct} sub={`${deliveryPct}% of ${TOTAL_DEL_TARGET}`}/>
              <KpiCard label='Bonus Cost' value={`₹${fmt(salesBonus+leaderBonus)}`} color='text-green-600'/>
              <KpiCard label='Daily Logs Today' value={`${dailyLog.filter(e=>e.date===TODAY()).length}/${revenueTeam.length}`} color='text-blue-600'/>
            </div>
          </div>}

          {/* ── REVIEW ── */}
          {activeTab==='review'&&canSeeTab('review')&&<div className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>📋 Daily Review Insights</h3>
                {[
                  {label:'⚡ Lowest Activity', value:reviewStats.lowestActivity?`${reviewStats.lowestActivity.name} (score: ${reviewStats.lowestActivity.score})`:'No data'},
                  {label:'📞 Highest Caller',  value:reviewStats.highestCaller?`${reviewStats.highestCaller.name} (${reviewStats.highestCaller.calls} calls)`:'No data'},
                  {label:'🏆 Best Converter',  value:reviewStats.bestConverter?`${reviewStats.bestConverter.name} (${reviewStats.bestConverter.pct}%)`:'No data'},
                  {label:'⏳ Pending Updates', value:reviewStats.pendingUpdates.length>0?reviewStats.pendingUpdates.join(', '):'All updated ✓'},
                  {label:'📅 Logs Today',      value:`${dailyLog.filter(e=>e.date===TODAY()).length} of ${revenueTeam.length} members submitted`},
                ].map(({label,value})=>(
                  <div key={label} className='flex justify-between items-start py-2 border-b last:border-0'>
                    <span className='text-sm text-gray-500'>{label}</span>
                    <span className='text-sm font-medium text-right max-w-xs'>{value}</span>
                  </div>
                ))}
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>📤 Export</h3>
                <Button className='w-full bg-red-700 hover:bg-red-800' onClick={()=>{exportCSV(sortedLog.map(e=>({Date:fmtDate(e.date),Member:e.member,Calls:e.calls,Meetings:e.meetings,Leads:e.leads,Closures:e.closures,OrderIntake_K:e.orderIntake,Sales_K:e.sales})),'TWG_Daily_Log.csv');toast('Daily log exported');}}>⬇ Export Daily Log CSV</Button>
                <Button variant='outline' className='w-full' onClick={()=>window.print()}>🖨 Print Report</Button>
              </CardContent></Card>
            </div>
          </div>}

          {/* ── OPS ── */}
          {activeTab==='ops'&&canSeeTab('ops')&&<div className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>📍 Attendance</h3>
                <Button className='w-full bg-red-700 hover:bg-red-800' onClick={()=>toast(`Attendance marked for ${currentUser} at ${new Date().toLocaleTimeString()}`)}>✅ Mark Attendance</Button>
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>🤖 AI Forecast</h3>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'><span className='text-gray-500'>Projected Revenue (next month)</span><span className='font-bold'>₹{fmt(Math.round(totalActual*1.15))}K</span></div>
                  <div className='flex justify-between'><span className='text-gray-500'>Projected Admissions</span><span className='font-bold'>{Math.round(totalAdmissions*1.1)}</span></div>
                  <div className='flex justify-between'><span className='text-gray-500'>On Track Probability</span><span className={`font-bold ${pctColor(revenuePct)}`}>{revenuePct>=70?'High':'Low'}</span></div>
                </div>
              </CardContent></Card>
            </div>
          </div>}

          {/* ── DB ── */}
          {activeTab==='db'&&canSeeTab('db')&&<div className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <Card><CardContent className='p-4 space-y-3'>
                <h3 className='font-bold text-red-700'>🗄️ Database</h3>
                <div className='flex items-center gap-2'><div className={`w-2 h-2 rounded-full ${dbStatus.includes('Synced')?'bg-green-500':dbStatus.includes('Offline')?'bg-red-500':'bg-yellow-500'}`}/><span className='text-sm font-medium'>{dbStatus}</span></div>
                <div className='text-xs text-gray-400'>Last: {lastSaved||'Not yet saved'}</div>
                <div className='flex gap-2 flex-wrap'>
                  <Button onClick={save} className='bg-red-700 hover:bg-red-800 text-xs h-8'>Save to DB</Button>
                  <Button variant='outline' onClick={()=>loadFromDB(month)} className='text-xs h-8'>↻ Pull from DB</Button>
                  {access.isCEO&&<Button variant='outline' onClick={()=>setConfirmReset('activity')} className='text-xs h-8 text-orange-600 border-orange-200 hover:bg-orange-50'>Clear Sales & Delivery</Button>}
                  {access.isCEO&&<Button variant='outline' onClick={()=>setConfirmReset('full')} className='text-xs h-8 text-red-600 border-red-200 hover:bg-red-50'>Full Reset</Button>}
                </div>
              </CardContent></Card>
              <Card><CardContent className='p-4 space-y-2'>
                <h3 className='font-bold text-red-700'>📦 Stored Modules</h3>
                {['Team Data & Targets','Admissions per Department','Daily Activity Logs','Monthly History Snapshots','Bonus Calculations'].map(item=>(
                  <div key={item} className='flex items-center gap-2 text-sm text-gray-600'><span className='text-green-500'>✓</span>{item}</div>
                ))}
                <div className='text-xs text-gray-400 pt-2'>Daily log entries: <span className='font-bold text-gray-600'>{dailyLog.length}</span></div>
              </CardContent></Card>
            </div>
          </div>}

          {/* ── PASSWORD MANAGEMENT (CEO only) ── */}
          {activeTab==='db' && canSeeTab('db') && access.isCEO && <div className='mt-4'>
            <Card className='border-orange-200'>
              <CardContent className='p-5 space-y-4'>
                <div>
                  <h3 className='font-bold text-red-700'>🔐 Team Password Manager</h3>
                  <p className='text-xs text-gray-500 mt-0.5'>Change any team member's login password</p>
                </div>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div className='space-y-3'>
                    <div>
                      <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1'>Your CEO Password (to confirm)</label>
                      <Input type='password' value={adminPwdInput} onChange={e=>setAdminPwdInput(e.target.value)} placeholder='Enter your CEO password' className='h-9'/>
                    </div>
                    <div>
                      <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1'>Select User</label>
                      <Select value={pwdForm.username} onValueChange={v=>setPwdForm(p=>({...p,username:v}))}>
                        <SelectTrigger className='h-9'><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {Object.keys(ACCESS).map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1'>New Password</label>
                      <Input type='password' value={pwdForm.newPassword} onChange={e=>setPwdForm(p=>({...p,newPassword:e.target.value}))} placeholder='Min 6 characters' className='h-9'/>
                    </div>
                    <div>
                      <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1'>Confirm Password</label>
                      <Input type='password' value={pwdForm.confirm} onChange={e=>setPwdForm(p=>({...p,confirm:e.target.value}))} placeholder='Repeat new password' className='h-9'
                        onKeyDown={e=>e.key==='Enter'&&changePassword()}/>
                    </div>
                    <Button onClick={changePassword} className='w-full bg-orange-600 hover:bg-orange-700'>Update Password</Button>
                    {pwdMsg && <div className={`text-sm font-medium p-2 rounded-lg ${pwdMsg.startsWith('✅')?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{pwdMsg}</div>}
                  </div>
                  <div className='bg-gray-50 rounded-xl p-4 space-y-2'>
                    <div className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>Current Default Passwords</div>
                    {[['CEO','TwgCeo@2026'],['Abdullah','Abd@Twg2026'],['AQ','AQ@Twg2026'],['Munawar','Mun@Twg2026'],['Tameem','Tam@Twg2026'],['Muzamil','Muz@Twg2026'],['Wahed','Wah@Twg2026']].map(([u,p])=>(
                      <div key={u} className='flex justify-between items-center text-sm py-1 border-b border-gray-200 last:border-0'>
                        <span className='font-medium'>{u}</span>
                        <span className='text-gray-400 font-mono text-xs'>{p}</span>
                      </div>
                    ))}
                    <p className='text-xs text-gray-400 pt-1'>Once changed via this form, the new password overrides the default.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>}

        </main>
      </div>
    </div>
  );
}
