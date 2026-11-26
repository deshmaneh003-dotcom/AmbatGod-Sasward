import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bell, CakeSlice, CalendarDays, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Coffee, CreditCard, Download, Eye, EyeOff,
  Flame, House, IndianRupee, LayoutDashboard, LogOut, Mail,
  Menu as MenuIcon, Minus, Pencil, Plus, Printer, Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag,
  ShoppingBasket, ShoppingCart, Sparkles, TrendingUp, Trash2, User,
  UserRound, Users, UtensilsCrossed, Wallet, X, Zap
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement,
  PointElement, Tooltip
} from 'chart.js';
import { api, money } from './api.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

const fallbackPhoto = (width = 300) => `https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=${width}&q=80`;
const imageSource = (image, width = 300) => image
  ? image.startsWith('/uploads') ? `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')}${image}` : image
  : fallbackPhoto(width);
const cafeDateKey = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const initialSession = {
  token: null,
  user: { name: 'Cafe Admin', designation: 'Administrator' }
};
function App() {
  const [session, setSession] = useState(initialSession);
  useEffect(() => {
    ['abg_token', 'abg_user'].forEach((key) => localStorage.removeItem(key));
    ['abg_token', 'abg_user'].forEach((key) => sessionStorage.removeItem(key));
  }, []);
  const updateUser = (user) => {
    setSession((current) => ({ ...current, user }));
    sessionStorage.setItem('abg_user', JSON.stringify(user));
  };
  const signIn = (data) => {
    localStorage.removeItem('abg_token');
    localStorage.removeItem('abg_user');
    sessionStorage.setItem('abg_token', data.token);
    sessionStorage.setItem('abg_user', JSON.stringify(data.user));
    setSession({ token: data.token, user: data.user });
  };
  const signOut = () => {
    ['abg_token', 'abg_user'].forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); });
    setSession({ token: null, user: null });
  };
  return <BrowserRouter><Routes>
    <Route path="/" element={<WelcomePage />} />
    <Route path="/login" element={<Navigate to="/" replace />} />
    <Route path="/register" element={<Navigate to="/" replace />} />
    <Route element={<AppShell session={session} onSignOut={signOut} onUserUpdate={updateUser} />}>
      <Route path="overview" element={<Dashboard token={session.token} />} />
      <Route path="billing" element={<Billing token={session.token} />} />
      <Route path="menu" element={<MenuManagement token={session.token} />} />
      <Route path="orders" element={<Orders token={session.token} />} />
      <Route path="customers" element={<Customers token={session.token} />} />
      <Route path="reports" element={<Reports token={session.token} />} />
      <Route path="profile" element={<Profile user={session.user} token={session.token} onUserUpdate={updateUser} />} />
      <Route path="settings" element={<Settings token={session.token} />} />
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Route>
  </Routes></BrowserRouter>;
}

function WelcomePage() {
  const navigate = useNavigate();
  return <main className="welcome-page">
    <div className="welcome-page-glow welcome-page-glow-one" />
    <div className="welcome-page-glow welcome-page-glow-two" />
    <section className="welcome-card">
      <img className="welcome-logo" src="/aam-bat-god-logo.png" alt="Ambatgod Cafe logo" />
      <p className="welcome-eyebrow">CAFE MANAGEMENT SYSTEM</p>
      <h1>WELCOME TO<br /><span>AMBATGOD CAFE</span></h1>
      <p className="welcome-message">Fresh orders, happy customers and a perfectly managed cafe.</p>
      <button className="welcome-enter" type="button" onClick={() => navigate('/overview')}>
        Get Started <ArrowRight size={18} />
      </button>
    </section>
  </main>;
}

function AuthPage({ register = false, onSignIn }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', username: '', identifier: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetHelp, setResetHelp] = useState(false);
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError(''); setSuccess('');
    if (register && form.name.trim().length < 2) return setError('Please enter your full name.');
    if (register && !/^[+()\d\s-]{7,20}$/.test(form.phone.trim())) return setError('Enter a valid phone number.');
    if (register && !/^[a-zA-Z0-9._-]{3,30}$/.test(form.username.trim())) return setError('Username must be 3–30 characters and use letters, numbers, dots, underscores or hyphens.');
    if (register && form.password !== form.confirmPassword) return setError('Your passwords don’t match. Please try again.');
    if (form.password.length < 8) return setError('Use a password with at least 8 characters.');
    setBusy(true);
    try {
      if (register) {
        await api('/auth/register', { method: 'POST', body: JSON.stringify(form) });
        setSuccess('Your account is ready — sign in to open your cafe dashboard.');
      } else {
        const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: form.identifier, password: form.password }) });
        onSignIn(data);
        navigate('/', { replace: true });
      }
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  return <main className="auth-page">
    <section className="auth-visual">
      <NavLink className="brand brand-light" to="/login"><img className="brand-logo" src="/aam-bat-god-logo.png" alt="Aam Bat God Cafe logo" /><span className="auth-tagline"><span>A Taste So Good,</span><strong>You'll Want to Come Back</strong><span>Again and Again! <span className="auth-tagline-heart" aria-hidden="true">❤️</span></span></span></NavLink>
    </section>
    <section className="auth-panel"><div className="auth-form-wrap">
      <div className="auth-login-logo"><img src="/aam-bat-god-logo.png" alt="Aam Bat God Cafe logo" /></div>
      {register && <span className="eyebrow"><span className="online-dot" /> CAFE OPERATIONS</span>}
      <h2>{register ? 'Join your cafe.' : 'Welcome back.'}</h2>
      {register && <p className="auth-subtitle">Create your admin account to get started.</p>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {success && <div className="notice notice-success" role="status">{success}</div>}
      <form className="auth-form" onSubmit={submit}>
        {register && <div className="form-row"><Field label="Full name" name="name" value={form.name} onChange={change} placeholder="e.g. Ananya Deshmukh" required icon={<UserRound size={17} />} /><Field label="Phone number" name="phone" value={form.phone} onChange={change} placeholder="+91 98765 43210" required icon={<Activity size={17} />} /></div>}
        <Field label={register ? 'Email address' : 'Email address or phone number'} name={register ? 'email' : 'identifier'} type={register ? 'email' : 'text'} value={register ? form.email : form.identifier} onChange={change} placeholder={register ? 'you@yourcafe.in' : 'Enter your email or phone number'} required icon={register ? <Mail size={17} /> : <UserRound size={17} />} />
        {register && <Field label="Username" name="username" value={form.username} onChange={change} placeholder="Choose a username" required icon={<User size={17} />} />}
        <div className="field-wrap"><label className="field-label" htmlFor="password">Password</label><div className="input-shell"><ShieldCheck size={17} /><input id="password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={change} placeholder={register ? 'At least 8 characters' : 'Enter your password'} minLength="8" required autoComplete={register ? 'new-password' : 'current-password'} /><button className="icon-button password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
        {register && <Field label="Confirm password" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={change} placeholder="Enter your password again" required icon={<ShieldCheck size={17} />} />}
        {!register && <div className="form-between auth-help-row"><button className="quiet-link help-signin" type="button" onClick={() => setResetHelp((value) => !value)}>Forgot password?</button></div>}
        {resetHelp && <div className="notice notice-info"><CircleHelp size={15} /> Password recovery isn’t configured yet. Please contact your cafe administrator to restore access.</div>}
        <button className="button button-dark auth-submit" disabled={busy}>{busy ? <span className="spinner-border spinner-border-sm" /> : <>{register ? 'Create account' : 'Sign in to dashboard'} <ArrowRight size={17} /></>}</button>
      </form>
      <p className="auth-switch">{register ? 'Already have an account?' : 'New to the cafe?'} <NavLink to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</NavLink></p>
      {register && <p className="auth-footnote"><ShieldCheck size={14} /> Your cafe data is private and securely protected.</p>}
    </div></section>
    <footer className="auth-credit">Created By Harshwardhan Deshmane</footer>
  </main>;
}

function Field({ label, name, type = 'text', value, onChange, placeholder, required, icon }) {
  return <div className="field-wrap"><label className="field-label" htmlFor={name}>{label}</label><div className="input-shell">{icon}<input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} autoComplete={name === 'email' ? 'email' : name === 'identifier' ? 'off' : undefined} /></div></div>;
}

const navigation = [
  { section: 'WORKSPACE', links: [['/overview', 'Overview', LayoutDashboard], ['/billing', 'New Order', ShoppingCart], ['/menu', 'Menu', UtensilsCrossed], ['/orders', 'Orders', ShoppingBag]] },
  { section: 'INSIGHTS', links: [['/reports', 'Sales report', BarChart3]] },
  { section: 'PREFERENCES', links: [['/profile', 'My Profile', UserRound], ['/settings', 'Setting page', SettingsIcon]] }
];

function AppShell({ session, onSignOut, onUserUpdate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspace, setWorkspace] = useState({ workspaceLocation: 'Saswad, Maharashtra', workspaceName: 'Admin workspace' });
  const [workspaceDraft, setWorkspaceDraft] = useState(workspace);
  const [workspaceEditing, setWorkspaceEditing] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [designationEditing, setDesignationEditing] = useState(false);
  const [designationDraft, setDesignationDraft] = useState(session.user?.designation || 'Administrator');
  const [designationBusy, setDesignationBusy] = useState(false);
  const [designationError, setDesignationError] = useState('');
  const location = useLocation();
  useEffect(() => {
    let active = true;
    api('/settings', { token: session.token }).then((settings) => {
      if (active) setWorkspace({
        workspaceLocation: settings.workspaceLocation || 'Saswad, Maharashtra',
        workspaceName: settings.workspaceName || 'Admin workspace'
      });
    }).catch((error) => { if (active) setWorkspaceError(error.message); });
    return () => { active = false; };
  }, [session.token]);
  const saveWorkspace = async (event) => {
    event.preventDefault();
    const updatedWorkspace = {
      workspaceLocation: workspaceDraft.workspaceLocation.trim(),
      workspaceName: workspaceDraft.workspaceName.trim()
    };
    if (!updatedWorkspace.workspaceLocation || !updatedWorkspace.workspaceName) {
      setWorkspaceError('Enter both a location and a workspace name.');
      return;
    }
    setWorkspaceBusy(true);
    setWorkspaceError('');
    try {
      const settings = await api('/settings', { token: session.token, method: 'PUT', body: JSON.stringify(updatedWorkspace) });
      setWorkspace({
        workspaceLocation: settings.workspaceLocation,
        workspaceName: settings.workspaceName
      });
      setWorkspaceEditing(false);
    } catch (error) {
      setWorkspaceError(error.message);
    } finally {
      setWorkspaceBusy(false);
    }
  };
  const saveDesignation = async (event) => {
    event.preventDefault();
    const designation = designationDraft.trim();
    if (!designation || designation.length > 40) {
      setDesignationError('Enter a designation with 1 to 40 characters.');
      return;
    }
    setDesignationBusy(true);
    setDesignationError('');
    try {
      const user = await api('/auth/me/designation', { token: session.token, method: 'PATCH', body: JSON.stringify({ designation }) });
      onUserUpdate(user);
      setDesignationEditing(false);
    } catch (error) {
      setDesignationError(error.message);
    } finally {
      setDesignationBusy(false);
    }
  };
  const title = useMemo(() => {
    const path = location.pathname;
    return navigation.flatMap((group) => group.links).find(([href]) => href === path)?.[1] || 'Overview';
  }, [location.pathname]);
  return <div className="app-frame">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <NavLink className="brand sidebar-brand" to="/"><img className="brand-logo" src="/aam-bat-god-logo.png" alt="Aam Bat God Cafe logo" /></NavLink>
      <div className="sidebar-label">YOUR CAFE</div>
      {workspaceEditing ? <form className="workspace-editor" onSubmit={saveWorkspace}>
        <label><span>Location</span><input aria-label="Workspace location" maxLength={80} value={workspaceDraft.workspaceLocation} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, workspaceLocation: event.target.value })} /></label>
        <label><span>Workspace</span><input aria-label="Workspace name" maxLength={40} value={workspaceDraft.workspaceName} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, workspaceName: event.target.value })} /></label>
        {workspaceError && <p className="sidebar-inline-error" role="alert">{workspaceError}</p>}
        <div className="workspace-editor-actions"><button className="workspace-save" type="submit" disabled={workspaceBusy}>{workspaceBusy ? 'Saving…' : <><Check size={13} /> Save</>}</button><button className="workspace-cancel" type="button" onClick={() => { setWorkspaceEditing(false); setWorkspaceError(''); }}>Cancel</button></div>
      </form> : <button className="location-switch" type="button" onClick={() => { setWorkspaceDraft(workspace); setWorkspaceEditing(true); }} aria-label="Edit workspace details">
        <span className="location-icon"><House size={16} /></span><span><strong>{workspace.workspaceLocation}</strong><small>{workspace.workspaceName}</small></span><Pencil size={14} />
      </button>}
      <nav className="side-nav">
        {navigation.map((group) => <div className="nav-group" key={group.section}><div className="sidebar-label">{group.section}</div>{group.links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/overview'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'New order' && <span className="nav-shortcut">⌘ N</span>}</NavLink>)}</div>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-profile"><span className="avatar">{initials(session.user?.name)}</span><div><strong>{session.user?.name || 'Cafe Admin'}</strong>
        {designationEditing ? <form className="designation-editor" onSubmit={saveDesignation}><div className="designation-editor-row"><input aria-label="Administrator label" maxLength={40} value={designationDraft} onChange={(event) => setDesignationDraft(event.target.value)} autoFocus /><button type="submit" aria-label="Save designation" disabled={designationBusy}><Check size={13} /></button><button type="button" aria-label="Cancel designation edit" onClick={() => { setDesignationDraft(session.user?.designation || 'Administrator'); setDesignationEditing(false); setDesignationError(''); }}><X size={13} /></button></div>{designationError && <small className="sidebar-inline-error" role="alert">{designationError}</small>}</form> : <button className="sidebar-role-trigger" type="button" onClick={() => { setDesignationDraft(session.user?.designation || 'Administrator'); setDesignationEditing(true); setDesignationError(''); }}><small>{session.user?.designation || 'Administrator'}</small><Pencil size={11} /></button>}
      </div></div></div>
    </aside>
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <main className={`main-area ${location.pathname === '/menu' ? 'main-area-menu' : ''}`}><header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><MenuIcon size={21} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong></div><div className="topbar-actions"><div className="today-chip"><span className="online-dot" /> Cafe is open</div><button className="top-icon icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><span className="top-divider" /><div className="top-user"><span className="avatar avatar-small">{initials(session.user?.name)}</span><span><strong>{session.user?.name?.split(' ')[0] || 'Admin'}</strong><small>{session.user?.designation || 'Administrator'}</small></span><ChevronDown size={15} /></div></div></header>
      <div className={`page-content ${location.pathname === '/billing' ? 'page-content-billing' : location.pathname === '/menu' ? 'page-content-menu' : ''}`}><Outlet /><footer className="app-credit">Created By Harshwardhan Deshmane</footer></div>
    </main>
  </div>;
}

function initials(name = 'Cafe Admin') { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
function Loading({ label = 'Loading cafe data…' }) { return <div className="loading-state"><span className="spinner-border spinner-border-sm" />{label}</div>; }
function EmptyState({ icon: Icon = ShoppingBag, title, detail }) { return <div className="empty-state"><span><Icon size={23} /></span><strong>{title}</strong><p>{detail}</p></div>; }
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { if (!message) return undefined; const timer = window.setTimeout(onClose, 3500); return () => window.clearTimeout(timer); }, [message, onClose]);
  if (!message) return null;
  return <div className={`toast-message ${type}`} role="status"><CheckCircle2 size={18} />{message}<button className="icon-button" onClick={onClose} aria-label="Dismiss"><X size={15} /></button></div>;
}

function Dashboard({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/dashboard', { token }).then(setData).catch((err) => setError(err.message)); }, [token]);
  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;
  const stats = [
    { title: "Today's sales", value: money(data.todaySales), change: 'Revenue so far today', icon: IndianRupee, tone: 'orange', extra: <span className="stat-live"><i /> LIVE</span> },
    { title: 'Orders today', value: data.todayOrders, change: `${data.totalOrders} all-time orders`, icon: ShoppingBag, tone: 'blue' },
    { title: 'Menu items', value: data.menuCount, change: 'Available on the menu', icon: UtensilsCrossed, tone: 'green' },
    { title: 'Total customers', value: data.customerCount, change: 'Guests with a saved number', icon: Users, tone: 'purple' }
  ];
  const salesChart = {
    labels: data.weekly.map((entry) => entry.label),
    datasets: [{ data: data.weekly.map((entry) => entry.sales), fill: true, tension: .4, borderColor: '#6f925b', backgroundColor: (context) => {
      const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, 'rgba(111,146,91,.2)'); gradient.addColorStop(1, 'rgba(111,146,91,0)');
      return gradient;
    }, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#6f925b', borderWidth: 2 }]
  };
  const salesOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1b3023', padding: 11, callbacks: { label: (context) => ` ${money(context.raw)}` } } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#968b82', font: { family: 'DM Sans', size: 13.2 } } }, y: { beginAtZero: true, grid: { color: '#f0ebe6' }, border: { display: false, dash: [4, 4] }, ticks: { color: '#968b82', font: { family: 'DM Sans', size: 12 }, callback: (value) => value >= 1000 ? `₹${value / 1000}k` : `₹${value}` } } } };
  const monthlyData = { labels: data.monthly.map((entry) => entry.label), datasets: [{ data: data.monthly.map((entry) => entry.sales), backgroundColor: data.monthly.map((_, index) => index === data.monthly.length - 1 ? '#6f915b' : '#dce8d7'), borderRadius: 5, maxBarThickness: 29 }] };
  const monthlyOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${money(context.raw)}` } } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#968b82', font: { family: 'DM Sans', size: 12 } } }, y: { beginAtZero: true, grid: { color: '#f0ebe6' }, border: { display: false }, ticks: { color: '#968b82', font: { family: 'DM Sans', size: 10.8 }, callback: (value) => value >= 1000 ? `₹${value / 1000}k` : `₹${value}` } } } };
  const methodColors = { Cash: '#708c53', UPI: '#8b9b76', Card: '#d9b36b' };
  const methods = data.methods.filter((item) => item.total > 0);
  const firstName = (() => { try { return (JSON.parse(localStorage.getItem('abg_user') || sessionStorage.getItem('abg_user') || '{}').name || 'there').split(' ')[0]; } catch { return 'there'; } })();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const doughnutData = { labels: methods.map((item) => item._id), datasets: [{ data: methods.map((item) => item.total), backgroundColor: methods.map((item) => methodColors[item._id]), borderWidth: 0, hoverOffset: 4 }] };
  const doughnutOptions = { cutout: '75%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${context.label}: ${money(context.raw)}` } } } };
  return <>
    <PageHeading eyebrow={`${new Date().toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase()}, YOUR CAFE IS LOOKING GOOD`} title={`${greeting}, ${firstName}.`} description="Here’s what’s brewing at your cafe today." action={<NavLink className="button button-dark" to="/billing"><Plus size={17} /> New order</NavLink>} />
    <div className="welcome-strip"><span className="welcome-spark"><Sparkles size={19} /></span><div><strong>A fresh day, a fresh start.</strong><span>Your cafe is open and ready for its next great order.</span></div><span className="welcome-date"><CalendarDays size={15} />{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
    <div className="stats-grid">{stats.map(({ title, value, change, icon: Icon, tone, extra }) => <article className="stat-card" key={title}><div className="stat-top"><span className={`stat-icon ${tone}`}><Icon size={19} /></span>{extra || <span className="stat-kicker">TODAY</span>}</div><div className="stat-title">{title}</div><div className="stat-value">{value}</div><div className="stat-foot"><span>{change}</span>{title === 'Orders today' ? <ArrowUpRight size={15} /> : null}</div></article>)}</div>
    <div className="dashboard-grid"><section className="panel sales-panel"><div className="panel-heading"><div><h3>Sales overview</h3><p>Your revenue, over the last 7 days</p></div><span className="subtle-select"><CalendarDays size={14} /> This week <ChevronDown size={14} /></span></div><div className="chart-total"><strong>{money(data.weekly.reduce((sum, item) => sum + item.sales, 0))}</strong><span><TrendingUp size={14} /> Last 7 days</span></div><div className="chart-area"><Line data={salesChart} options={salesOptions} /></div></section>
      <section className="panel popular-panel"><div className="panel-heading"><div><h3>Guest favourites</h3><p>Most ordered, lately</p></div><span className="panel-mini-icon"><Flame size={17} /></span></div>{data.popular.length ? <div className="popular-list">{data.popular.map((item, index) => <div className="popular-row" key={item._id}><span className={`popular-number n-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><div className="popular-item"><strong>{item._id}</strong><small>{item.quantity} sold</small></div><strong className="popular-revenue">{money(item.revenue)}</strong></div>)}</div> : <EmptyState icon={CakeSlice} title="The menu is waiting" detail="Add an order to discover guest favourites." />}</section></div>
    <div className="dashboard-grid monthly-grid"><section className="panel sales-panel"><div className="panel-heading"><div><h3>Monthly revenue</h3><p>A little look at the last 6 months</p></div><span className="panel-mini-icon"><BarChart3 size={16} /></span></div><div className="chart-total"><strong>{money(data.monthly.reduce((sum, item) => sum + item.sales, 0))}</strong><span><Activity size={13} /> Last 6 months</span></div><div className="monthly-chart"><Bar data={monthlyData} options={monthlyOptions} /></div></section><section className="panel quick-actions-panel"><div className="panel-heading"><div><h3>A few quick things</h3><p>Keep the good stuff moving</p></div><span className="panel-mini-icon"><Zap size={16} /></span></div><NavLink className="quick-action" to="/billing"><span className="quick-action-icon"><ShoppingCart size={17} /></span><span><strong>Start a new order</strong><small>Make someone’s day</small></span><ArrowRight size={16} /></NavLink><NavLink className="quick-action" to="/menu"><span className="quick-action-icon sage"><Plus size={18} /></span><span><strong>Add to the menu</strong><small>Make room for a new favourite</small></span><ArrowRight size={16} /></NavLink><NavLink className="quick-action" to="/reports"><span className="quick-action-icon sand"><BarChart3 size={17} /></span><span><strong>See how things are going</strong><small>Your cafe’s latest numbers</small></span><ArrowRight size={16} /></NavLink></section></div>
    <div className="dashboard-grid lower-grid"><section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent orders</h3><p>The latest from your counter</p></div><NavLink className="text-link" to="/orders">All orders <ArrowRight size={14} /></NavLink></div>{data.recentOrders.length ? <div className="table-responsive"><table className="data-table"><thead><tr><th>ORDER</th><th>GUEST</th><th>ITEMS</th><th>AMOUNT</th><th>PAYMENT</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order._id}><td><span className="order-number">{order.billNumber}</span><small>{shortTime(order.createdAt)}</small></td><td>{order.customerName}</td><td>{order.items.length} items</td><td className="amount-cell">{money(order.total)}</td><td><PaymentPill method={order.paymentMethod} /></td></tr>)}</tbody></table></div> : <EmptyState title="Your counter is quiet" detail="Completed orders will show up right here." />}</section>
      <section className="panel payment-panel"><div className="panel-heading"><div><h3>Payment mix</h3><p>Sales by payment type</p></div><span className="panel-mini-icon"><Wallet size={16} /></span></div>{methods.length ? <><div className="payment-chart"><Doughnut data={doughnutData} options={doughnutOptions} /><div className="doughnut-center"><strong>{methods.reduce((sum, method) => sum + method.count, 0)}</strong><small>payments</small></div></div><div className="payment-legend">{methods.map((method) => <div key={method._id}><span><i style={{ backgroundColor: methodColors[method._id] }} />{method._id}</span><strong>{money(method.total)}</strong></div>)}</div></> : <EmptyState icon={CreditCard} title="No payments yet" detail="Payment methods show here after your first sale." />}</section></div>
    <div className="dashboard-footnote"><span><span className="online-dot" /> All systems looking good</span><span>Sales update automatically as you take orders.</span></div>
  </>;
}
function shortTime(value) { return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); }
function PaymentPill({ method }) { return <span className={`payment-pill ${String(method).toLowerCase()}`}>{method}</span>; }
function ErrorState({ message }) { return <div className="notice notice-error error-state"><CircleHelp size={19} />{message}</div>; }

function Billing({ token }) {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState('Dine-in');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [toast, setToast] = useState('');
  const loadItems = useCallback(() => api(`/menu?available=true${search ? `&search=${encodeURIComponent(search)}` : ''}`, { token }).then(setItems).catch((err) => setError(err.message)), [search, token]);
  useEffect(() => { loadItems(); }, [loadItems]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;
  const addItem = (item) => setCart((current) => {
    const exists = current.find((cartItem) => cartItem._id === item._id);
    return exists ? current.map((cartItem) => cartItem._id === item._id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem) : [...current, { ...item, quantity: 1 }];
  });
  const updateQuantity = (id, delta) => setCart((current) => current.map((item) => item._id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  const checkout = async () => {
    if (!cart.length) return setError('Add an item before completing payment.');
    setError(''); setBusy(true);
    try {
      const order = await api('/orders', { token, method: 'POST', body: JSON.stringify({
        items: cart.map((item) => ({ menuItem: item._id, quantity: item.quantity })),
        paymentMethod, customerName, customerPhone, orderType
      }) });
      setReceipt(order); setCart([]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <>
    <PageHeading eyebrow="THE COUNTER" title="New Order" description="A little something lovely, coming right up." action={<span className="counter-open"><i /> COUNTER OPEN</span>} />
    <div className="pos-layout"><section className="pos-catalog">
      <div className="catalog-tools"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a favourite…" /></label></div>
      {error && <div className="notice notice-error compact-notice">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={14} /></button></div>}
      {!items.length ? <EmptyState icon={Coffee} title="The menu is currently empty" detail="No items are available to add to an order." /> : <div className="pos-item-grid">{items.map((item) => <button className="pos-menu-item" key={item._id} onClick={() => addItem(item)}><span className="pos-menu-copy"><strong>{item.name}</strong><small>{money(item.price)}</small></span><span className="pos-menu-add"><Plus size={16} /></span></button>)}</div>}
    </section><aside className="cart-panel"><div className="cart-head"><div><span className="eyebrow">YOUR ORDER</span><h3>Little pleasures <span>({cart.reduce((sum, item) => sum + item.quantity, 0)})</span></h3></div><button className="text-button" onClick={() => setCart([])} disabled={!cart.length}>Clear all</button></div>
      <div className="order-type-toggle">{['Dine-in', 'Takeaway'].map((type) => <button key={type} className={orderType === type ? 'selected' : ''} onClick={() => setOrderType(type)}>{type === 'Dine-in' ? <UtensilsCrossed size={15} /> : <ShoppingBag size={15} />}{type}</button>)}</div>
      <div className="cart-items">{cart.map((item) => <div className="cart-item" key={item._id}><span className="cart-thumb" style={{ backgroundImage: `url("${imageSource(item.image, 100)}")` }} /><div className="cart-item-copy"><strong>{item.name}</strong><small>{money(item.price)} each</small><span className="quantity-control"><button onClick={() => updateQuantity(item._id, -1)} aria-label={`Remove one ${item.name}`}><Minus size={12} /></button><b>{item.quantity}</b><button onClick={() => updateQuantity(item._id, 1)} aria-label={`Add one ${item.name}`}><Plus size={12} /></button></span></div><strong className="cart-item-total">{money(item.price * item.quantity)}</strong></div>)}
        {!cart.length && <div className="cart-empty"><ShoppingBasket size={25} /><strong>Your order starts here</strong><span>Pick something delicious from the menu.</span></div>}
      </div>
      <div className="cart-customer"><div className="cart-section-label"><span>GUEST DETAILS</span><small>optional</small></div><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Guest name" /><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone number" type="tel" /></div>
      <div className="bill-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="bill-total"><span>Total to pay</span><strong>{money(total)}</strong></div></div>
      <div className="payment-select-label">PAYMENT METHOD</div><div className="payment-select">{[['Cash', BanknoteIcon], ['UPI', SmartphoneIcon], ['Card', CreditCard]].map(([method, Icon]) => <button key={method} className={paymentMethod === method ? 'selected' : ''} onClick={() => setPaymentMethod(method)}><Icon size={15} />{method}</button>)}</div>
      <button className="button button-dark checkout-button" onClick={checkout} disabled={busy || !cart.length}>{busy ? <span className="spinner-border spinner-border-sm" /> : <><span>Complete payment</span><span>{money(total)} <ArrowRight size={16} /></span></>}</button>
    </aside></div>
    <Toast message={toast} onClose={() => setToast('')} />
    {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} onNewOrder={() => { setReceipt(null); setToast('Lovely. Ready for the next order!'); }} />}
  </>;
}

function BanknoteIcon(props) { return <IndianRupee {...props} />; }
function SmartphoneIcon(props) { return <Activity {...props} />; }
function ReceiptModal({ order, onClose, onNewOrder }) {
  const [settings, setSettings] = useState({ cafeName: 'Aam Bat God Cafe', address: 'Saswad, Maharashtra', printPaperSize: 'a5', printOrientation: 'portrait' });
  const [printSettingsLoaded, setPrintSettingsLoaded] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('abg_token') || sessionStorage.getItem('abg_token');
    if (!token) {
      setSettingsError('Sign in again to load invoice print settings.');
      setPrintSettingsLoaded(true);
      return () => { active = false; };
    }
    api('/settings', { token }).then((data) => {
      if (active) setSettings(data);
    }).catch((err) => {
      if (active) setSettingsError(err.message);
    }).finally(() => {
      if (active) setPrintSettingsLoaded(true);
    });
    return () => { active = false; };
  }, []);
  const printPaperSize = settings.printPaperSize || 'a5';
  const pageSize = printPaperSize === 'thermal-80mm'
    ? '80mm 200mm'
    : printPaperSize === 'a4'
      ? settings.printOrientation === 'landscape' ? '297mm 210mm' : '210mm 297mm'
      : settings.printOrientation === 'landscape' ? '210mm 148mm' : '148mm 210mm';
  return <>
    <style>{`@page { size: ${pageSize}; margin: 0; }`}</style>
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
        <div className="receipt-actions"><span className="receipt-success"><CheckCircle2 size={16} /> PAYMENT COMPLETE</span><button className="icon-button" onClick={onClose} aria-label="Close receipt"><X size={19} /></button></div>
        {settingsError && <div className="notice notice-error" role="alert">{settingsError}</div>}
        <div className="receipt-paper" id="receipt-print" data-paper-size={printPaperSize}>
          <div className="receipt-brand"><img className="receipt-logo" src="/aam-bat-god-logo.png" alt={`${settings.cafeName || 'Cafe'} logo`} /><p>{settings.address}</p>{settings.phone && <p>{settings.phone}</p>}</div>
          <div className="receipt-rule" />
          <div className="receipt-meta"><span>Bill number</span><strong>{order.billNumber}</strong><span>Date & time</span><strong>{new Date(order.createdAt).toLocaleString('en-IN')}</strong><span>Guest</span><strong>{order.customerName || 'Walk-in customer'}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</strong><span>Order type</span><strong>{order.orderType}</strong></div>
          <div className="receipt-rule" />
          <div className="receipt-lines">{order.items.map((item, index) => <div key={`${item.name}-${index}`}><span>{item.name} <small>× {item.quantity}</small></span><strong>{money(item.price * item.quantity)}</strong><small>{money(item.price)} each</small></div>)}</div>
          <div className="receipt-rule" />
          <div className="receipt-totals">
            <div><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>
            {order.discount > 0 && <div><span>Discount</span><strong>− {money(order.discount)}</strong></div>}
            {order.tax > 0 && <div><span>GST ({order.taxRate}%)</span><strong>{money(order.tax)}</strong></div>}
            <div className="receipt-grand"><span>Total paid</span><strong>{money(order.total)}</strong></div>
            <div><span>Paid by</span><strong>{order.paymentMethod}</strong></div>
          </div>
          <div className="receipt-thanks">A little joy, made fresh.<br /><strong>Thank you for choosing us ♥</strong></div>
        </div>
        <div className="receipt-buttons">
          <button className="button button-outline" onClick={() => window.print()} disabled={!printSettingsLoaded || Boolean(settingsError)}><Printer size={16} /> {printSettingsLoaded ? 'Print / Save PDF' : 'Preparing print…'}</button>
          <button className="button button-dark" onClick={onNewOrder}><Plus size={16} /> New order</button>
        </div>
      </section>
    </div>
  </>;
}

function MenuManagement({ token }) {
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [draft, setDraft] = useState({ name: '', price: '' });
  const [toast, setToast] = useState('');
  useEffect(() => {
    let active = true;
    api('/menu?available=true', { token })
      .then((menuItems) => { if (active) setItems(menuItems); })
      .catch((err) => { if (active) setLoadError(err.message); });
    return () => { active = false; };
  }, [token]);
  const openAddForm = () => {
    setEditingItem(null);
    setDraft({ name: '', price: '' });
    setFormError('');
    setAdding(true);
  };
  const openEditForm = (item) => {
    setEditingItem(item);
    setDraft({ name: item.name, price: String(item.price) });
    setFormError('');
    setAdding(true);
  };
  const saveItem = async (event) => {
    event.preventDefault();
    const name = draft.name.trim();
    const price = Number(draft.price);
    if (!name) return setFormError('Enter an item name.');
    if (!Number.isFinite(price) || price < 0) return setFormError('Enter a valid price.');
    setBusy(true);
    setFormError('');
    try {
      const editing = Boolean(editingItem);
      const item = await api(editing ? `/menu/${editingItem._id}` : '/menu', {
        token, method: editing ? 'PUT' : 'POST', body: JSON.stringify({ name, price })
      });
      setItems((current) => editing
        ? (current || []).map((existing) => existing._id === item._id ? item : existing)
        : [...(current || []), item]);
      setLoadError('');
      setAdding(false);
      setEditingItem(null);
      setToast(editing ? `${item.name} updated.` : `${item.name} added to the menu.`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from the menu? This cannot be undone.`)) return;
    setDeletingId(item._id);
    setLoadError('');
    try {
      await api(`/menu/${item._id}`, { token, method: 'DELETE' });
      setItems((current) => (current || []).filter((existing) => existing._id !== item._id));
      setToast(`${item.name} deleted from the menu.`);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setDeletingId(null);
    }
  };
  const closeForm = () => {
    setAdding(false);
    setEditingItem(null);
    setFormError('');
  };
  return <>
    <PageHeading eyebrow="OUR MENU" title="Menu and prices" description="Every item, with its price." action={<button className="button button-dark menu-add-trigger" onClick={openAddForm}><Plus size={16} /> Add item</button>} />
    {loadError && <div className="notice notice-error compact-notice" role="alert">{loadError}</div>}
    {items === null && !loadError ? <Loading /> : items?.length ? <section className="panel menu-list-panel"><div className="menu-list-wrap"><table className="data-table menu-list-table"><thead><tr><th>ITEM</th><th>PRICE</th><th>ACTIONS</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><strong>{item.name}</strong></td><td className="amount-cell">₹{item.price}</td><td><span className="menu-item-actions"><button className="row-action" type="button" onClick={() => openEditForm(item)} aria-label={`Edit ${item.name}`} title="Edit item" disabled={deletingId === item._id}><Pencil size={15} /></button><button className="row-action row-action-danger" type="button" onClick={() => deleteItem(item)} aria-label={`Delete ${item.name}`} title="Delete item" disabled={deletingId === item._id}>{deletingId === item._id ? <span className="spinner-border spinner-border-sm" /> : <Trash2 size={15} />}</button></span></td></tr>)}</tbody></table></div></section> : !loadError && <EmptyState icon={Coffee} title="Nothing on the menu yet" detail="Add your first item to get started." />}
    {adding && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && closeForm()}><section className="menu-add-modal" role="dialog" aria-modal="true" aria-labelledby="menu-add-title"><div className="menu-add-heading"><div><span className="eyebrow">MENU</span><h2 id="menu-add-title">{editingItem ? 'Edit menu item' : 'Add a menu item'}</h2><p>{editingItem ? 'Update the item name or price.' : 'New items will also be available for billing.'}</p></div><button className="icon-button" type="button" onClick={closeForm} aria-label="Close menu item form" disabled={busy}><X size={18} /></button></div><form className="menu-add-form" onSubmit={saveItem}><label className="field-wrap"><span className="field-label">Item name</span><input className="form-control" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={80} autoFocus required placeholder="e.g. Masala chai" /></label><label className="field-wrap"><span className="field-label">Price (₹)</span><input className="form-control" type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required placeholder="0.00" /></label>{formError && <div className="notice notice-error" role="alert">{formError}</div>}<div className="menu-add-actions"><button type="button" className="button button-outline" onClick={closeForm} disabled={busy}>Cancel</button><button type="submit" className="button button-dark" disabled={busy}>{busy ? editingItem ? 'Saving…' : 'Adding…' : editingItem ? <><Check size={15} /> Save changes</> : <><Plus size={15} /> Add item</>}</button></div></form></section></div>}
    <Toast message={toast} onClose={() => setToast('')} />
  </>;
}

function Orders({ token }) {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const load = useCallback(() => {
    const today = cafeDateKey(new Date());
    const weekStart = cafeDateKey(new Date(new Date(`${today}T12:00:00+05:30`).getTime() - 6 * 86400000));
    const from = period === 'today' ? today : period === 'week' ? weekStart : period === 'custom' ? fromDate : '';
    const to = period === 'custom' ? toDate : '';
    if (from && to && from > to) {
      setOrders([]);
      setError('Start date must be on or before end date.');
      return;
    }
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    setError('');
    api(`/orders${query ? `?${query}` : ''}`, { token }).then(setOrders).catch((err) => setError(err.message));
  }, [fromDate, period, toDate, token]);
  useEffect(() => { load(); }, [load]);
  const filtered = orders.filter((order) => `${order.billNumber} ${order.customerName} ${order.customerPhone}`.toLowerCase().includes(search.toLowerCase()));
  const changePeriod = (event) => {
    setPeriod(event.target.value);
    setFromDate('');
    setToDate('');
  };
  const changeDate = (setter) => (event) => {
    setter(event.target.value);
    setPeriod('custom');
  };
  return <><PageHeading eyebrow="A LITTLE LOOK BACK" title="Orders" description="A clear view of everything you’ve served." action={<button className="button button-outline" onClick={() => downloadCsv(filtered)}><Download size={16} /> Export orders</button>} />
    <div className="order-stats"><div><span>ORDERS FOUND</span><strong>{filtered.length}</strong></div><div><span>TOTAL SALES</span><strong>{money(filtered.reduce((sum, order) => sum + order.total, 0))}</strong></div><div><span>AVERAGE ORDER</span><strong>{money(filtered.length ? filtered.reduce((sum, order) => sum + order.total, 0) / filtered.length : 0)}</strong></div><div className="order-stat-icon"><ShoppingBag size={21} /></div></div>
    <section className="panel orders-panel"><div className="orders-toolbar"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bill, guest or phone…" /></label><label className="orders-date-field"><span>From</span><input type="date" aria-label="Orders from date" value={fromDate} max={toDate || undefined} onChange={changeDate(setFromDate)} /></label><label className="orders-date-field"><span>To</span><input type="date" aria-label="Orders to date" value={toDate} min={fromDate || undefined} onChange={changeDate(setToDate)} /></label><select className="select-control" aria-label="Quick date filter" value={period} onChange={changePeriod}><option value="all">All time</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="custom">Custom dates</option></select><span className="results-count">{filtered.length} orders</span></div>{error ? <ErrorState message={error} /> : filtered.length ? <div className="table-responsive"><table className="data-table orders-table"><thead><tr><th>BILL NUMBER</th><th>GUEST</th><th>WHEN</th><th>ORDER</th><th>ITEMS</th><th>TOTAL</th><th>PAYMENT</th><th></th></tr></thead><tbody>{filtered.map((order) => <tr key={order._id}><td><span className="order-number">{order.billNumber}</span></td><td><strong className="guest-name">{order.customerName || 'Walk-in customer'}</strong>{order.customerPhone && <small>{order.customerPhone}</small>}</td><td><span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><small>{shortTime(order.createdAt)}</small></td><td>{order.orderType}</td><td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</td><td className="amount-cell">{money(order.total)}</td><td><PaymentPill method={order.paymentMethod} /></td><td><button className="row-action" onClick={() => setSelected(order)} aria-label={`View bill ${order.billNumber}`}><ArrowRight size={15} /></button></td></tr>)}</tbody></table></div> : <EmptyState icon={ShoppingBag} title={period === 'all' && !search ? 'A lovely fresh start' : 'No orders match these filters'} detail={period === 'all' && !search ? 'Your completed cafe orders will be saved here.' : 'Try a different date range or search term.'} />}</section>
    {selected && <ReceiptModal order={selected} onClose={() => setSelected(null)} onNewOrder={() => setSelected(null)} />}
  </>;
}
function downloadCsv(orders) {
  const rows = [['Bill number', 'Guest', 'Date', 'Items', 'Total INR', 'Payment method'], ...orders.map((order) => [order.billNumber, order.customerName, new Date(order.createdAt).toLocaleString('en-IN'), order.items.map((item) => `${item.name} x${item.quantity}`).join('; '), order.total, order.paymentMethod])];
  const blob = new Blob([rows.map((row) => row.map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'aam-bat-god-orders.csv'; link.click(); URL.revokeObjectURL(link.href);
}

function Customers({ token }) {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/orders', { token }).then(setOrders).catch((err) => setError(err.message)); }, [token]);
  const customers = useMemo(() => {
    const map = new Map();
    orders.filter((order) => order.customerPhone).forEach((order) => {
      const existing = map.get(order.customerPhone) || { name: order.customerName, phone: order.customerPhone, visits: 0, spend: 0, lastVisit: order.createdAt };
      existing.visits += 1; existing.spend += order.total;
      if (new Date(order.createdAt) > new Date(existing.lastVisit)) { existing.name = order.customerName; existing.lastVisit = order.createdAt; }
      map.set(order.customerPhone, existing);
    });
    return [...map.values()].filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.spend - a.spend);
  }, [orders, search]);
  return <><PageHeading eyebrow="THE PEOPLE WHO MAKE IT SPECIAL" title="A little more personal." description="Get to know the lovely people who keep coming back." action={<span className="counter-open">{customers.length} SAVED GUESTS</span>} /><section className="panel customers-panel"><div className="orders-toolbar"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a guest…" /></label><span className="results-count">{customers.length} guests</span></div>{error ? <ErrorState message={error} /> : customers.length ? <div className="table-responsive"><table className="data-table"><thead><tr><th>GUEST</th><th>VISITS</th><th>TOTAL SPENT</th><th>LAST VISIT</th><th>FAVOURITE GUEST</th></tr></thead><tbody>{customers.map((customer, index) => <tr key={customer.phone}><td><div className="customer-cell"><span className="avatar customer-avatar">{initials(customer.name)}</span><span><strong>{customer.name}</strong><small>{customer.phone}</small></span></div></td><td>{customer.visits} {customer.visits === 1 ? 'visit' : 'visits'}</td><td className="amount-cell">{money(customer.spend)}</td><td>{new Date(customer.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{index === 0 && customer.visits > 1 ? <span className="favourite-badge"><Sparkles size={13} /> Cafe regular</span> : <span className="quiet-dash">—</span>}</td></tr>)}</tbody></table></div> : <EmptyState icon={Users} title="Your regulars, soon" detail="Add a guest’s phone number at checkout to remember them next time." />}</section></>;
}

function Reports({ token }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('week');
  useEffect(() => { api('/orders', { token }).then(setOrders).catch((err) => setError(err.message)); }, [token]);
  const visible = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (period === 'week' ? 6 : period === 'month' ? 29 : 364));
    return orders.filter((order) => new Date(order.createdAt) >= start);
  }, [orders, period]);
  const revenue = visible.reduce((sum, order) => sum + order.total, 0);
  const byDay = useMemo(() => {
    const count = period === 'week' ? 7 : period === 'month' ? 14 : 12;
    const grouped = new Map();
    visible.forEach((order) => { const key = period === 'year' ? new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short' }) : new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); grouped.set(key, (grouped.get(key) || 0) + order.total); });
    if (period === 'year') return [...grouped.entries()].slice(-count);
    return [...grouped.entries()].slice(-count);
  }, [visible, period]);
  const chartData = { labels: byDay.map(([label]) => label), datasets: [{ label: 'Revenue', data: byDay.map(([, total]) => total), backgroundColor: '#7c9b64', borderRadius: 5, maxBarThickness: 26 }] };
  const paymentBreakdown = ['Cash', 'UPI', 'Card'].map((name) => ({ name, total: visible.filter((order) => order.paymentMethod === name).reduce((sum, order) => sum + order.total, 0), count: visible.filter((order) => order.paymentMethod === name).length }));
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${money(context.raw)}` } }, }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#968b82', font: { family: 'DM Sans' } } }, y: { beginAtZero: true, grid: { color: '#f0ebe6' }, border: { display: false }, ticks: { color: '#968b82', callback: (value) => `₹${value}` } } } };
  return <><PageHeading eyebrow="THE STORY IN YOUR NUMBERS" title="Sales report" description="The full picture of how your cafe is doing." action={<select className="select-control report-select" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="week">Last 7 days</option><option value="month">Last 30 days</option><option value="year">Last 12 months</option></select>} />
    {error && <ErrorState message={error} />}
    <div className="report-stats"><article className="report-stat"><span><IndianRupee size={16} /> REVENUE</span><strong>{money(revenue)}</strong><small>{period === 'week' ? 'in the last 7 days' : period === 'month' ? 'in the last 30 days' : 'in the last 12 months'}</small></article><article className="report-stat"><span><ShoppingBag size={16} /> ORDERS</span><strong>{visible.length}</strong><small>{money(visible.length ? revenue / visible.length : 0)} average order value</small></article><article className="report-stat"><span><Activity size={16} /> TOP PAYMENT</span><strong>{[...paymentBreakdown].sort((a, b) => b.total - a.total)[0]?.total ? [...paymentBreakdown].sort((a, b) => b.total - a.total)[0].name : '—'}</strong><small>by revenue this period</small></article></div>
    <div className="reports-grid"><section className="panel report-chart-panel"><div className="panel-heading"><div><h3>Revenue at a glance</h3><p>Paid orders, grouped by day</p></div><span className="chart-legend-dot"><i /> Revenue</span></div><div className="report-chart"><Bar data={chartData} options={options} /></div></section><section className="panel payment-report-panel"><div className="panel-heading"><div><h3>Where guests pay</h3><p>A little split by payment type</p></div></div><div className="payment-breakdown">{paymentBreakdown.map((method) => <div className="payment-breakdown-row" key={method.name}><span className={`payment-method-icon ${method.name.toLowerCase()}`}>{method.name === 'Card' ? <CreditCard size={16} /> : method.name === 'Cash' ? <IndianRupee size={16} /> : <Activity size={16} />}</span><span><strong>{method.name}</strong><small>{method.count} {method.count === 1 ? 'order' : 'orders'}</small></span><strong>{money(method.total)}</strong></div>)}</div></section></div>
  </>;
}

function Profile({ user, token, onUserUpdate }) {
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', username: user?.username || '', designation: user?.designation || 'Administrator' });
  useEffect(() => setProfile((current) => ({ ...current, designation: user?.designation || 'Administrator' })), [user?.designation]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <><PageHeading eyebrow="A LITTLE ABOUT YOU" title="My Profile" description="Your account, your details. Just the way they should be." /><div className="profile-layout"><section className="panel profile-card"><div className="profile-card-cover"><span className="brand-mark"><Coffee size={22} /></span></div><div className="profile-card-body"><span className="profile-avatar">{initials(profile.name)}</span><h3>{profile.name || 'Cafe Admin'}</h3><p>{profile.email}</p><span className="admin-badge"><ShieldCheck size={14} /> {profile.designation}</span></div><div className="profile-card-foot"><span><span className="online-dot" /> Account active</span><small>Secure admin access</small></div></section><section className="panel profile-form-panel"><div className="panel-heading"><div><h3>Your details</h3><p>The little details that keep things in order.</p></div></div>{saved && <div className="notice notice-success">Your account details are up to date.</div>}{error && <div className="notice notice-error">{error}</div>}<form className="editor-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(''); try { const updated = await api('/auth/me', { token, method: 'PUT', body: JSON.stringify(profile) }); setProfile({ name: updated.name, email: updated.email, phone: updated.phone, username: updated.username, designation: updated.designation || profile.designation }); onUserUpdate(updated); setSaved(true); window.setTimeout(() => setSaved(false), 3500); } catch (err) { setError(err.message); } finally { setBusy(false); } }}><Field label="Full name" name="profileName" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /><Field label="Email address" name="profileEmail" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required /><div className="form-row"><Field label="Phone number" name="profilePhone" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} required /><Field label="Username" name="profileUsername" value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} required /></div><div className="notice notice-info"><ShieldCheck size={16} /> Your profile details are securely saved to your cafe account.</div><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : <><Check size={16} /> Save changes</>}</button></form></section></div></>;
}

function Settings({ token }) {
  const [settings, setSettings] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(true);
  const [loginHistoryError, setLoginHistoryError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/settings', { token }).then(setSettings).catch((err) => setError(err.message)); }, [token]);
  useEffect(() => {
    api('/auth/login-history', { token })
      .then(setLoginHistory)
      .catch((err) => setLoginHistoryError(err.message))
      .finally(() => setLoginHistoryLoading(false));
  }, [token]);
  const change = (event) => setSettings({ ...settings, [event.target.name]: event.target.value });
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const updated = await api('/settings', { token, method: 'PUT', body: JSON.stringify({ ...settings, taxRate: Number(settings.taxRate) }) }); setSettings(updated); setMessage('Your cafe settings are saved.'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const setOrientation = (printOrientation) => setSettings((current) => ({
    ...current,
    printOrientation: current.printPaperSize === 'thermal-80mm' ? 'portrait' : printOrientation
  }));
  const changePaperSize = (event) => {
    const printPaperSize = event.target.value;
    setSettings((current) => ({
      ...current,
      printPaperSize,
      printOrientation: printPaperSize === 'thermal-80mm' ? 'portrait' : current.printOrientation
    }));
  };
  if (!settings && !error) return <Loading label="Getting your cafe settings…" />;
  return <>
    <PageHeading eyebrow="CAFE PREFERENCES" title="Setting page" description="Manage your cafe details and invoice printing." />
    <div className="settings-layout">
      <section className="panel settings-form-panel">
        <div className="panel-heading"><div><h3>{activeTab === 'print' ? 'Print settings' : 'Cafe details'}</h3><p>{activeTab === 'print' ? 'Set the page layout for printed invoices.' : 'Keep your business information up to date.'}</p></div></div>
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          <button id="settings-tab-details" type="button" role="tab" aria-selected={activeTab === 'details'} className={activeTab === 'details' ? 'active' : ''} onClick={() => { setActiveTab('details'); setMessage(''); }}>Cafe details</button>
          <button id="settings-tab-print" type="button" role="tab" aria-selected={activeTab === 'print'} className={activeTab === 'print' ? 'active' : ''} onClick={() => { setActiveTab('print'); setMessage(''); }}>Print</button>
        </div>
        {error && <ErrorState message={error} />}
        {message && <div className="notice notice-success">{message}</div>}
        {settings && <form className="editor-form" onSubmit={save}>
          {activeTab === 'details' ? <div role="tabpanel" aria-labelledby="settings-tab-details">
            <Field label="Cafe name" name="cafeName" value={settings.cafeName} onChange={change} placeholder="Aam Bat God Cafe" required />
            <div className="field-wrap">
              <label className="field-label" htmlFor="address">Cafe address</label>
              <textarea id="address" name="address" className="form-control" rows="2" value={settings.address} onChange={change} placeholder="Street, city, state" />
            </div>
            <div className="form-row">
              <Field label="Contact phone" name="phone" value={settings.phone} onChange={change} placeholder="+91 98765 43210" />
              <Field label="Contact email" name="email" type="email" value={settings.email} onChange={change} placeholder="hello@yourcafe.in" />
            </div>
          </div> : <div className="print-settings" role="tabpanel" aria-labelledby="settings-tab-print">
            <div className="print-settings-heading">
              <div><h3>Paper Size &amp; Orientation</h3><p>Choose the paper and direction; select a printer that supports this size in the print dialog.</p></div>
              <Printer size={20} />
            </div>
            <label className="print-paper-select">
              <span className="field-label">Paper Size</span>
              <select className="form-select" name="printPaperSize" value={settings.printPaperSize || 'a5'} onChange={changePaperSize}>
                <option value="a5">A5 (148×210mm) — Compact</option>
                <option value="a4">A4 (210×297mm) — Standard</option>
                <option value="thermal-80mm">Thermal (80 × 200mm) — POS Receipt</option>
              </select>
            </label>
            <div className="print-orientation">
              <span className="field-label">Orientation</span>
              <div className={`print-orientation-options ${settings.printPaperSize === 'thermal-80mm' ? 'single' : ''}`}>
                <button type="button" className={`print-orientation-option ${settings.printOrientation !== 'landscape' || settings.printPaperSize === 'thermal-80mm' ? 'selected' : ''}`} aria-pressed={settings.printOrientation !== 'landscape' || settings.printPaperSize === 'thermal-80mm'} onClick={() => setOrientation('portrait')}>
                  <span className="paper-preview portrait" aria-hidden="true" />
                  <span><strong>Portrait</strong><small>{settings.printPaperSize === 'a4' ? '210 × 297 mm' : settings.printPaperSize === 'thermal-80mm' ? '80 × 200 mm' : '148 × 210 mm'}</small></span>
                </button>
                {settings.printPaperSize !== 'thermal-80mm' && <button type="button" className={`print-orientation-option ${settings.printOrientation === 'landscape' ? 'selected' : ''}`} aria-pressed={settings.printOrientation === 'landscape'} onClick={() => setOrientation('landscape')}>
                  <span className="paper-preview landscape" aria-hidden="true" />
                  <span><strong>Landscape</strong><small>{settings.printPaperSize === 'a4' ? '297 × 210 mm' : '210 × 148 mm'}</small></span>
                </button>}
              </div>
            </div>
          </div>}
          <div className="settings-form-foot">
            <span><ShieldCheck size={14} /> {activeTab === 'print' ? 'Applies to invoice printing' : 'Changes apply to your cafe details'}</span>
            <button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : <><Check size={16} /> Save {activeTab === 'print' ? 'print settings' : 'cafe details'}</>}</button>
          </div>
        </form>}
      </section>
      <section className="panel settings-login-history">
        <div className="panel-heading">
          <div><h3>Login activity</h3><p>Recent successful sign-ins to this software.</p></div>
          {!loginHistoryLoading && !loginHistoryError && <span className="login-history-count">{loginHistory.length} recent</span>}
        </div>
        {loginHistoryError ? <ErrorState message={loginHistoryError} /> : loginHistoryLoading ? <Loading label="Loading login activity…" /> : loginHistory.length ? <div className="login-history-list">{loginHistory.map((entry) => <div className="login-history-entry" key={entry._id}><span className="avatar">{initials(entry.name)}</span><div><strong>{entry.name}</strong><small>{entry.email}</small></div><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div>)}</div> : <EmptyState icon={UserRound} title="No login activity yet" detail="Successful sign-ins will appear here." />}
      </section>
    </div>
  </>;
}

export default App;
