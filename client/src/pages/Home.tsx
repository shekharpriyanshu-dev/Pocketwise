import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  Goal,
  Home as HomeIcon,
  Lightbulb,
  LogIn,
  Menu,
  Moon,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyScenario,
  buildDemoInput,
  calculateFinanceState,
  type FinanceCommitment,
  type FinanceGoal,
  type FinanceInput,
  type FinanceTransaction,
} from "@shared/finance";

type Section = "overview" | "activity" | "goals" | "commitments" | "coach" | "settings";
type Modal = "transaction" | "simulator" | "goal" | "commitment" | "settings" | null;
type ScenarioKind = "expense" | "income" | "save" | "bill";

const categories = ["Food", "Transportation", "Shopping", "Entertainment", "Education", "Bills", "Subscriptions", "Healthcare", "Unexpected expenses", "Other"];
const navItems: Array<{ id: Section; label: string; icon: typeof HomeIcon }> = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "activity", label: "Activity", icon: ReceiptText },
  { id: "goals", label: "Savings goals", icon: Goal },
  { id: "commitments", label: "Commitments", icon: CreditCard },
  { id: "coach", label: "Money coach", icon: Sparkles },
];

const formatMoney = (value: number, decimals = 0) => `₹${Math.round(value).toLocaleString("en-IN", { maximumFractionDigits: decimals })}`;
const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`));
const today = () => new Date().toISOString().slice(0, 10);

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function Logo() {
  return (
    <div className="brand-mark" aria-label="Pocketwise">
      <span className="brand-mark-icon"><WalletCards size={18} strokeWidth={2.4} /></span>
      <span className="brand-wordmark">pocketwise</span>
    </div>
  );
}

function SectionEyebrow({ children, tone = "mint" }: { children: React.ReactNode; tone?: "mint" | "amber" | "ink" }) {
  return <p className={`eyebrow eyebrow-${tone}`}>{children}</p>;
}

function MetricTile({ label, value, helper, tone = "default", icon: Icon }: { label: string; value: string; helper?: string; tone?: "default" | "mint" | "amber" | "coral"; icon?: typeof WalletCards }) {
  return (
    <div className={`metric-tile metric-${tone}`}>
      <div className="metric-heading"><span>{label}</span>{Icon ? <Icon size={16} /> : null}</div>
      <strong className="metric-value">{value}</strong>
      {helper ? <span className="metric-helper">{helper}</span> : null}
    </div>
  );
}

function StatusPill({ level }: { level: string }) {
  const tone = level.includes("High") ? "coral" : level.includes("Moderate") || level.includes("Attention") ? "amber" : "mint";
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{level}</span>;
}

function ProgressRing({ value, label, caption }: { value: number; label: string; caption: string }) {
  return (
    <div className="ring-wrap">
      <div className="progress-ring" style={{ background: `conic-gradient(var(--mint) ${Math.max(0, Math.min(100, value)) * 3.6}deg, rgba(255,255,255,.11) 0deg)` }}>
        <div className="progress-ring-inner"><strong>{label}</strong><span>{caption}</span></div>
      </div>
    </div>
  );
}

function ModalShell({ title, description, onClose, children, wide = false }: { title: string; description?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal-card ${wide ? "modal-wide" : ""}`}>
        <div className="modal-head">
          <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MiniTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; dataKey?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong><span>{formatMoney(Number(payload[0].value ?? 0))}</span></div>;
}

function Overview({
  finance,
  input,
  onOpen,
  onSection,
  onRunSimulator,
}: {
  finance: ReturnType<typeof calculateFinanceState>;
  input: FinanceInput;
  onOpen: (modal: Exclude<Modal, null>) => void;
  onSection: (section: Section) => void;
  onRunSimulator: () => void;
}) {
  const topCategories = Object.entries(finance.categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxCategory = Math.max(1, ...topCategories.map(([, value]) => value));
  const nextCommitment = input.commitments.find(item => !item.paid && item.active !== false);
  return (
    <>
      <section className="page-intro">
        <div>
          <SectionEyebrow>Monday, 12 October 2026 · Day {input.elapsedDays} of {input.durationDays}</SectionEyebrow>
          <h1>Make your month feel lighter.</h1>
          <p>Here’s the clearest view of what your money can do next.</p>
        </div>
        <div className="intro-actions">
          <button className="quiet-button" onClick={() => onOpen("transaction")}><Plus size={16} /> Add activity</button>
          <button className="primary-button" onClick={onRunSimulator}><Zap size={16} /> Run a decision</button>
        </div>
      </section>

      <section className="hero-grid">
        <div className="balance-card">
          <div className="balance-topline"><span className="overline">Available to spend</span><span className="live-dot"><span /> Live plan</span></div>
          <div className="balance-row"><strong>{formatMoney(finance.availableBalance)}</strong><span className="balance-change"><TrendingUp size={14} /> {finance.riskLevel === "Low Risk" ? "On track" : finance.riskLevel === "Moderate Risk" ? "Needs attention" : "Under pressure"}</span></div>
          <p className="balance-note">After actual activity and allocated savings · original budget {formatMoney(input.startingBudget)}</p>
          <div className="balance-contour contour-one" /><div className="balance-contour contour-two" />
          <div className="balance-footer">
            <div><span>Reserved next</span><strong>{formatMoney(finance.reservedCommitments)}</strong></div>
            <div><span>Discretionary / day</span><strong>{formatMoney(finance.discretionaryAllowance)}</strong></div>
            <div><span>Month-end estimate</span><strong>{formatMoney(finance.projectedMonthEndBalance)}</strong></div>
          </div>
        </div>

        <div className="health-card surface-card">
          <div className="card-title-row"><div><SectionEyebrow>Financial health</SectionEyebrow><h3>Room to breathe</h3></div><ShieldCheck className="mint-icon" size={20} /></div>
          <div className="health-content"><ProgressRing value={finance.healthScore} label={`${finance.healthScore}`} caption="out of 100" /><div><StatusPill level={finance.healthLabel} /><p className="health-copy">{finance.riskMessage}</p><button className="text-button" onClick={() => onSection("coach")}>See what moves the score <ChevronRight size={14} /></button></div></div>
          <div className="health-meta"><span>Previous check-in <strong>{finance.previousHealthScore}</strong></span><span className="positive-text">+{finance.healthScore - finance.previousHealthScore} pts</span></div>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricTile label="Daily allowance" value={formatMoney(finance.dailyAllowance)} helper={`Balance ÷ ${finance.remainingDays} days`} icon={CalendarDays} />
        <MetricTile label="Reserved commitments" value={formatMoney(finance.reservedCommitments)} helper={nextCommitment ? `${nextCommitment.name} · ${formatDate(nextCommitment.dueDate)}` : "Nothing due"} tone="amber" icon={CreditCard} />
        <MetricTile label="Savings progress" value={`${Math.round(finance.savingsProgress)}%`} helper={`${formatMoney(finance.allocatedSavings)} allocated so far`} tone="mint" icon={Target} />
        <MetricTile label="Budget used" value={`${Math.round(finance.budgetUtilization)}%`} helper={`${formatMoney(finance.actualExpenses)} actual spending`} tone={finance.budgetUtilization > 75 ? "coral" : "default"} icon={BarChart3} />
      </section>

      <section className="content-grid">
        <div className="surface-card chart-card">
          <div className="card-title-row"><div><SectionEyebrow>Plan vs reality</SectionEyebrow><h3>Your spending runway</h3></div><button className="ghost-link" onClick={() => onSection("activity")}>View activity <ChevronRight size={14} /></button></div>
          <div className="chart-legend"><span><i className="legend-dot actual" /> Actual</span><span><i className="legend-dot planned" /> Planned pace</span><span className="chart-caption">Cumulative · INR</span></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={finance.trend} margin={{ left: -22, right: 8, top: 12, bottom: 0 }}><defs><linearGradient id="actualFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#27c99a" stopOpacity={0.22} /><stop offset="100%" stopColor="#27c99a" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 6" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-text)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-text)", fontSize: 11 }} tickFormatter={(value: number) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`} /><Tooltip content={<MiniTooltip />} /><Area type="monotone" dataKey="planned" stroke="#aeb9b5" strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" /><Area type="monotone" dataKey="actual" stroke="#27c99a" strokeWidth={2.5} fill="url(#actualFill)" /></AreaChart></ResponsiveContainer></div>
          <div className="chart-footnote"><span className="insight-icon"><Lightbulb size={15} /></span><span>{finance.actualExpenses === 0 ? "No spending recorded yet — your plan has the full runway available." : `You're averaging ${formatMoney(finance.actualExpenses / Math.max(1, input.elapsedDays))} per elapsed day.`}</span></div>
        </div>

        <div className="surface-card decision-card">
          <div className="decision-top"><span className="decision-orb"><Zap size={18} /></span><span className="decision-label">Decision simulator</span></div>
          <h3>Thinking about a purchase?</h3>
          <p>See the trade-off before your money leaves. Your real records stay untouched until you confirm.</p>
          <div className="decision-example"><div className="decision-example-icon"><CircleDollarSign size={17} /></div><div><strong>Try a ₹2,500 purchase</strong><span>See the new daily allowance</span></div><ChevronRight size={16} /></div>
          <button className="primary-button full-width" onClick={onRunSimulator}>Open simulator <ArrowUpRight size={15} /></button>
          <div className="decision-foot"><ShieldCheck size={14} /> Private to your plan · educational, not financial advice</div>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="surface-card activity-card">
          <div className="card-title-row"><div><SectionEyebrow>Actual activity</SectionEyebrow><h3>Recent transactions</h3></div><button className="ghost-link" onClick={() => onSection("activity")}>See all <ChevronRight size={14} /></button></div>
          {input.transactions.length === 0 ? <div className="empty-state"><div className="empty-icon"><ReceiptText size={19} /></div><div><strong>Your plan is fresh</strong><p>Add your first expense or income to start a real spending trail.</p></div><button className="small-button" onClick={() => onOpen("transaction")}><Plus size={14} /> Add</button></div> : <div className="transaction-list">{input.transactions.slice(-4).reverse().map(transaction => <TransactionRow key={transaction.id} transaction={transaction} />)}</div>}
        </div>
        <div className="surface-card commitment-card">
          <div className="card-title-row"><div><SectionEyebrow>Planned, not spent</SectionEyebrow><h3>Coming up</h3></div><button className="ghost-link" onClick={() => onSection("commitments")}>Manage <ChevronRight size={14} /></button></div>
          <div className="commitment-total"><strong>{formatMoney(finance.reservedCommitments)}</strong><span>reserved for {input.commitments.filter(item => item.active !== false && !item.paid).length} commitments</span></div>
          <div className="commitment-list">{input.commitments.slice(0, 3).map(commitment => <CommitmentRow key={commitment.id} commitment={commitment} />)}</div>
        </div>
      </section>

      <section className="surface-card timeline-card">
        <div className="card-title-row"><div><SectionEyebrow>30-day view</SectionEyebrow><h3>Your month at a glance</h3></div><span className="timeline-caption">Actuals in mint · planned in ink</span></div>
        <div className="timeline"><div className="timeline-line" /><div className="timeline-event current"><span className="timeline-node" /><div><strong>Today · Day {input.elapsedDays}</strong><span>{formatMoney(finance.availableBalance)} available</span></div></div><div className="timeline-event next"><span className="timeline-node" /><div><strong>{nextCommitment ? `${formatDate(nextCommitment.dueDate)} · ${nextCommitment.name}` : "No upcoming bill"}</strong><span>{nextCommitment ? `${formatMoney(nextCommitment.amount)} reserved` : "You're clear for now"}</span></div></div><div className="timeline-event end"><span className="timeline-node" /><div><strong>Month end · Day {input.durationDays}</strong><span>{formatMoney(finance.projectedMonthEndBalance)} projected</span></div></div></div>
      </section>
      {topCategories.length > 0 ? <section className="surface-card category-card"><div className="card-title-row"><div><SectionEyebrow>Spending mix</SectionEyebrow><h3>Where your money is going</h3></div><button className="ghost-link" onClick={() => onSection("activity")}>Full breakdown <ChevronRight size={14} /></button></div><div className="category-bars">{topCategories.map(([category, amount]) => <div className="category-bar-row" key={category}><div className="category-label"><span>{category}</span><strong>{formatMoney(amount)}</strong></div><div className="bar-track"><span style={{ width: `${(amount / maxCategory) * 100}%` }} /></div></div>)}</div></section> : null}
    </>
  );
}

function TransactionRow({ transaction, onDelete }: { transaction: FinanceTransaction; onDelete?: () => void }) {
  const isIncome = transaction.kind === "income" || transaction.kind === "refund";
  return <div className="transaction-row"><div className={`transaction-icon ${isIncome ? "income" : "expense"}`}>{isIncome ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}</div><div className="transaction-main"><strong>{transaction.description}</strong><span>{transaction.category} · {formatDate(transaction.date)}</span></div><strong className={`transaction-amount ${isIncome ? "income-text" : ""}`}>{isIncome ? "+" : "−"}{formatMoney(transaction.amount)}</strong>{onDelete ? <button className="row-delete" onClick={onDelete} aria-label={`Delete ${transaction.description}`}><X size={14} /></button> : null}</div>;
}

function CommitmentRow({ commitment, onPay }: { commitment: FinanceCommitment; onPay?: () => void }) {
  return <div className="commitment-row"><div className={`commitment-icon ${commitment.kind === "subscription" ? "subscription" : "bill"}`}>{commitment.kind === "subscription" ? <Sparkles size={15} /> : <FileText size={15} />}</div><div className="transaction-main"><strong>{commitment.name}</strong><span>{commitment.kind === "subscription" ? "Subscription" : "Bill"} · Due {formatDate(commitment.dueDate)}</span></div><div className="commitment-amount"><strong>{formatMoney(commitment.amount)}</strong>{onPay ? <button onClick={onPay}>Mark paid</button> : <span>{commitment.paid ? "Paid" : "Reserved"}</span>}</div></div>;
}

function ActivitySection({ transactions, onOpen, onDelete, onSection }: { transactions: FinanceTransaction[]; onOpen: () => void; onDelete: (id: string | number) => void; onSection: (section: Section) => void }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const filtered = transactions.filter(item => (filter === "All" || item.category === filter) && item.description.toLowerCase().includes(query.toLowerCase())).slice().reverse();
  return <section className="detail-section"><div className="section-heading"><div><SectionEyebrow>Actual records</SectionEyebrow><h1>Activity</h1><p>Every confirmed movement updates your runway, goals, and forecast.</p></div><button className="primary-button" onClick={onOpen}><Plus size={16} /> Add activity</button></div><div className="filter-row"><input className="search-input" placeholder="Search descriptions" value={query} onChange={event => setQuery(event.target.value)} /><div className="filter-pills"><button className={filter === "All" ? "active" : ""} onClick={() => setFilter("All")}>All</button>{categories.slice(0, 6).map(category => <button className={filter === category ? "active" : ""} key={category} onClick={() => setFilter(category)}>{category}</button>)}</div></div><div className="surface-card detail-card">{filtered.length === 0 ? <div className="large-empty"><div className="empty-icon"><ReceiptText size={21} /></div><h3>No matching activity</h3><p>Try a different filter or add a new transaction.</p><button className="small-button" onClick={onOpen}><Plus size={14} /> Add transaction</button></div> : <div className="transaction-list">{filtered.map(transaction => <TransactionRow key={transaction.id} transaction={transaction} onDelete={() => onDelete(transaction.id)} />)}</div>}</div><button className="back-link" onClick={() => onSection("overview")}>← Back to overview</button></section>;
}

function GoalsSection({ goals, finance, onOpen, onContribute }: { goals: FinanceGoal[]; finance: ReturnType<typeof calculateFinanceState>; onOpen: () => void; onContribute: (goalId: string | number) => void }) {
  return <section className="detail-section"><div className="section-heading"><div><SectionEyebrow>Future you, funded</SectionEyebrow><h1>Savings goals</h1><p>Protected money is not spendable money. Keep both views honest.</p></div><button className="primary-button" onClick={onOpen}><Plus size={16} /> New goal</button></div><div className="goal-summary surface-card"><ProgressRing value={finance.savingsProgress} label={`${Math.round(finance.savingsProgress)}%`} caption="overall progress" /><div><SectionEyebrow tone="ink">Across active goals</SectionEyebrow><h3>{formatMoney(finance.allocatedSavings)} saved of {formatMoney(finance.allocatedSavings + finance.remainingPlannedSavings)}</h3><p>{formatMoney(finance.remainingPlannedSavings)} remains planned. It is already excluded from discretionary spending.</p></div></div><div className="goal-grid">{goals.map(goal => { const progress = goal.targetAmount > 0 ? Math.min(100, goal.currentSaved / goal.targetAmount * 100) : 0; return <div className="surface-card goal-card" key={goal.id}><div className="goal-card-head"><div className="goal-icon"><Target size={17} /></div><span className={goal.protected ? "protected-tag" : "soft-tag"}>{goal.protected ? "Protected" : "Flexible"}</span></div><h3>{goal.name}</h3><div className="goal-money"><strong>{formatMoney(goal.currentSaved)}</strong><span>of {formatMoney(goal.targetAmount)}</span></div><div className="goal-progress"><span style={{ width: `${progress}%` }} /></div><div className="goal-foot"><span>{Math.round(progress)}% complete</span><span>Target {formatDate(goal.targetDate)}</span></div><button className="secondary-button full-width" onClick={() => onContribute(goal.id)}>Allocate money <Plus size={14} /></button></div> })}</div></section>;
}

function CommitmentsSection({ commitments, onPay, onOpen }: { commitments: FinanceCommitment[]; onPay: (id: string | number) => void; onOpen: () => void }) {
  const active = commitments.filter(item => item.active !== false && !item.paid);
  return <section className="detail-section"><div className="section-heading"><div><SectionEyebrow>Planned, not spent</SectionEyebrow><h1>Commitments</h1><p>Bills and subscriptions are reserved separately so your available balance stays truthful.</p></div><button className="primary-button" onClick={onOpen}><Plus size={16} /> Add commitment</button></div><div className="commitment-summary-row"><MetricTile label="Reserved next" value={formatMoney(active.reduce((sum, item) => sum + item.amount, 0))} helper={`${active.length} unpaid commitments`} tone="amber" /><MetricTile label="Subscriptions" value={formatMoney(active.filter(item => item.kind === "subscription").reduce((sum, item) => sum + item.amount, 0))} helper="Future recurring spend" /><MetricTile label="Potential save" value={formatMoney(active.filter(item => item.kind === "subscription").reduce((sum, item) => sum + item.amount, 0))} helper="If optional subs stop" tone="mint" /></div><div className="surface-card detail-card"><div className="commitment-list large-list">{commitments.map(commitment => <CommitmentRow key={commitment.id} commitment={commitment} onPay={!commitment.paid ? () => onPay(commitment.id) : undefined} />)}</div></div><div className="notice-panel"><Lightbulb size={18} /><div><strong>Why this matters</strong><p>Reserved commitments affect your discretionary allowance, but they are not counted as actual spending until you mark them paid.</p></div></div></section>;
}

function CoachSection({ finance, input, onRunSimulator }: { finance: ReturnType<typeof calculateFinanceState>; input: FinanceInput; onRunSimulator: () => void }) {
  const insights = [
    { icon: ShieldCheck, tone: "mint", title: "Your commitments are covered", body: `${formatMoney(finance.availableBalance)} available against ${formatMoney(finance.reservedCommitments)} reserved.` },
    { icon: Target, tone: "amber", title: "Keep the goal visible", body: `${formatMoney(finance.remainingPlannedSavings)} remains planned across ${input.goals.length} active goals.` },
    { icon: Zap, tone: "ink", title: "Decisions are cheaper than regrets", body: "Run a what-if before a big purchase — it only becomes real after you confirm." },
  ];
  return <section className="detail-section"><div className="section-heading"><div><SectionEyebrow>Calculated, not generic</SectionEyebrow><h1>Money coach</h1><p>Small prompts grounded in your actual plan. No motivational filler.</p></div><button className="primary-button" onClick={onRunSimulator}><Zap size={16} /> Run a decision</button></div><div className="coach-hero surface-card"><div className="coach-spark"><Sparkles size={20} /></div><div><SectionEyebrow tone="ink">Today’s read</SectionEyebrow><h3>{finance.riskMessage}</h3><p>{finance.recommendations[2]}</p></div><StatusPill level={finance.riskLevel} /></div><div className="insight-grid">{insights.map(({ icon: Icon, tone, title, body }) => <div className={`surface-card insight-card ${tone}`} key={title}><Icon size={19} /><h3>{title}</h3><p>{body}</p></div>)}</div><div className="method-note"><CircleDollarSign size={16} /><span>Health score is a transparent educational budgeting indicator — not a credit score or professional financial assessment.</span></div></section>;
}

function SettingsSection({ settings, onSave }: { settings: { startingBudget: number; durationDays: number; emergencyFundTarget: number }; onSave: (value: { startingBudget: number; durationDays: number; emergencyFundTarget: number }) => void }) {
  const [draft, setDraft] = useState(settings);
  return <section className="detail-section"><div className="section-heading"><div><SectionEyebrow>Your starting line</SectionEyebrow><h1>Plan settings</h1><p>Change the assumptions behind your runway. Existing confirmed activity stays intact.</p></div></div><div className="settings-layout"><div className="surface-card settings-card"><div className="setting-row"><div><strong>Starting budget</strong><span>The money available at day one.</span></div><input className="number-input" type="number" min="0" value={draft.startingBudget} onChange={event => setDraft({ ...draft, startingBudget: Number(event.target.value) })} /></div><div className="setting-row"><div><strong>Budget duration</strong><span>How many days this plan covers.</span></div><input className="number-input" type="number" min="1" max="365" value={draft.durationDays} onChange={event => setDraft({ ...draft, durationDays: Number(event.target.value) })} /></div><div className="setting-row"><div><strong>Emergency fund target</strong><span>Protected reserve you want to keep intact.</span></div><input className="number-input" type="number" min="0" value={draft.emergencyFundTarget} onChange={event => setDraft({ ...draft, emergencyFundTarget: Number(event.target.value) })} /></div><Button className="save-settings" onClick={() => onSave(draft)}>Save changes <Check size={15} /></Button></div><div className="surface-card disclosure-card"><ShieldCheck size={21} /><h3>Private by default</h3><p>Pocketwise does not connect to bank accounts or ask for card PINs. This demo uses fictional budgeting data until you confirm a record.</p><div className="disclosure-line"><span>Currency</span><strong>INR · ₹</strong></div><div className="disclosure-line"><span>Forecast</span><strong>Transparent baseline</strong></div></div></div></section>;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const { data: backendSnapshot } = trpc.finance.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const createTransactionMutation = trpc.finance.createTransaction.useMutation();
  const deleteTransactionMutation = trpc.finance.deleteTransaction.useMutation();
  const contributeMutation = trpc.finance.contributeToGoal.useMutation();
  const createGoalMutation = trpc.finance.createGoal.useMutation();
  const createCommitmentMutation = trpc.finance.createCommitment.useMutation();
  const payCommitmentMutation = trpc.finance.payCommitment.useMutation();
  const confirmScenarioMutation = trpc.finance.confirmScenario.useMutation();
  const updateSettingsMutation = trpc.finance.updateSettings.useMutation();
  const demo = useMemo(() => buildDemoInput(), []);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [modal, setModal] = useState<Modal>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => loadStored("pocketwise.demo.transactions", demo.transactions));
  const [goals, setGoals] = useState<FinanceGoal[]>(() => loadStored("pocketwise.demo.goals", demo.goals));
  const [commitments, setCommitments] = useState<FinanceCommitment[]>(() => loadStored("pocketwise.demo.commitments", demo.commitments));
  const [settings, setSettings] = useState(() => loadStored("pocketwise.demo.settings", { startingBudget: 10000, durationDays: 30, emergencyFundTarget: 1500 }));
  const [mobileNav, setMobileNav] = useState(false);
  const [simulation, setSimulation] = useState<{ kind: ScenarioKind; amount: number; category: string; description: string }>({ kind: "expense", amount: 2500, category: "Shopping", description: "New headphones" });
  const [txDraft, setTxDraft] = useState({ kind: "expense" as "expense" | "income", amount: "", category: "Food", description: "", date: today() });
  const [goalDraft, setGoalDraft] = useState({ name: "", amount: "", date: "2026-11-30", protected: false });
  const [commitmentDraft, setCommitmentDraft] = useState({ name: "", amount: "", kind: "subscription" as FinanceCommitment["kind"], date: "2026-10-25" });

  useEffect(() => {
    if (!backendSnapshot) return;
    setTransactions(backendSnapshot.input.transactions);
    setGoals(backendSnapshot.input.goals);
    setCommitments(backendSnapshot.input.commitments);
    setSettings({ startingBudget: backendSnapshot.input.startingBudget, durationDays: backendSnapshot.input.durationDays, emergencyFundTarget: backendSnapshot.input.emergencyFundTarget });
  }, [backendSnapshot]);

  const storageScope = user?.openId ? `user-${user.openId}` : "demo";
  useEffect(() => { localStorage.setItem(`pocketwise.${storageScope}.transactions`, JSON.stringify(transactions)); }, [storageScope, transactions]);
  useEffect(() => { localStorage.setItem(`pocketwise.${storageScope}.goals`, JSON.stringify(goals)); }, [storageScope, goals]);
  useEffect(() => { localStorage.setItem(`pocketwise.${storageScope}.commitments`, JSON.stringify(commitments)); }, [storageScope, commitments]);
  useEffect(() => { localStorage.setItem(`pocketwise.${storageScope}.settings`, JSON.stringify(settings)); }, [storageScope, settings]);

  const input = useMemo<FinanceInput>(() => ({ ...demo, ...settings, startingBalance: settings.startingBudget, transactions, goals, commitments }), [demo, settings, transactions, goals, commitments]);
  const finance = useMemo(() => calculateFinanceState(input), [input]);
  const proposed = useMemo(() => applyScenario(input, { kind: simulation.kind, amount: Number(simulation.amount) || 0, category: simulation.category, description: simulation.kind === "bill" ? commitments[0]?.name : simulation.description }), [input, simulation, commitments]);

  const openSection = (section: Section) => { setActiveSection(section); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const addTransaction = async () => {
    const amount = Number(txDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter an amount greater than ₹0"); return; }
    if (txDraft.kind === "expense" && amount > finance.availableBalance) { toast.error("That expense is larger than your available balance"); return; }
    if (user) {
      try {
        await createTransactionMutation.mutateAsync({ kind: txDraft.kind, amount, category: txDraft.category, description: txDraft.description.trim() || txDraft.category, transactionDate: txDraft.date });
        await utils.finance.snapshot.invalidate();
        toast.success(txDraft.kind === "expense" ? "Expense added — your plan is updated" : "Income added — your runway is longer");
        setTxDraft({ kind: "expense", amount: "", category: "Food", description: "", date: today() });
        setModal(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save activity");
      }
      return;
    }
    setTransactions([...transactions, { id: `${Date.now()}`, kind: txDraft.kind, amount, category: txDraft.category, description: txDraft.description.trim() || txDraft.category, date: txDraft.date }]);
    toast.success(txDraft.kind === "expense" ? "Expense added — your plan is updated" : "Income added — your runway is longer");
    setTxDraft({ kind: "expense", amount: "", category: "Food", description: "", date: today() });
    setModal(null);
  };
  const confirmSimulation = async () => {
    const amount = Number(simulation.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter an amount greater than ₹0"); return; }
    if ((simulation.kind === "expense" || simulation.kind === "bill") && amount > finance.availableBalance) { toast.error("This decision would exceed the available balance"); return; }
    if (user) {
      const firstGoal = goals[0];
      const firstCommitment = commitments.find(commitment => commitment.active !== false && !commitment.paid);
      try {
        await confirmScenarioMutation.mutateAsync({
          name: simulation.description || (simulation.kind === "income" ? "Additional income" : simulation.kind === "save" ? "Savings allocation" : "Planned purchase"),
          kind: simulation.kind,
          amount,
          category: simulation.kind === "bill" ? "Bills" : simulation.category,
          goalId: simulation.kind === "save" && typeof firstGoal?.id === "number" ? firstGoal.id : undefined,
          commitmentId: simulation.kind === "bill" && typeof firstCommitment?.id === "number" ? firstCommitment.id : undefined,
        });
        await utils.finance.snapshot.invalidate();
        toast.success("Decision confirmed — your full plan is recalculated");
        setModal(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not confirm this decision");
      }
      return;
    }
    if (simulation.kind === "save") {
      const firstGoal = goals[0];
      if (!firstGoal) { toast.error("Create a savings goal first"); return; }
      if (amount > firstGoal.targetAmount - firstGoal.currentSaved) { toast.error("That allocation is larger than the goal's remaining target"); return; }
      setGoals(goals.map(goal => goal.id === firstGoal.id ? { ...goal, currentSaved: goal.currentSaved + amount } : goal));
    } else if (simulation.kind === "bill") {
      const target = commitments[0];
      setCommitments(commitments.map(item => item.id === target?.id ? { ...item, paid: true } : item));
      setTransactions([...transactions, { id: `${Date.now()}`, kind: "expense", amount, category: "Bills", description: simulation.description || "Bill payment", date: today() }]);
    } else {
      setTransactions([...transactions, { id: `${Date.now()}`, kind: simulation.kind === "income" ? "income" : "expense", amount, category: simulation.category, description: simulation.description || (simulation.kind === "income" ? "Additional income" : "Planned purchase"), date: today() }]);
    }
    toast.success("Decision confirmed — your full plan is recalculated");
    setModal(null);
  };
  const addGoal = async () => {
    const amount = Number(goalDraft.amount);
    if (!goalDraft.name.trim() || !Number.isFinite(amount) || amount <= 0) { toast.error("Add a goal name and a valid target"); return; }
    if (user) {
      try {
        await createGoalMutation.mutateAsync({ name: goalDraft.name.trim(), targetAmount: amount, targetDate: goalDraft.date, protected: goalDraft.protected });
        await utils.finance.snapshot.invalidate();
        toast.success("Savings goal created"); setGoalDraft({ name: "", amount: "", date: "2026-11-30", protected: false }); setModal(null);
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create goal"); }
      return;
    }
    setGoals([...goals, { id: `${Date.now()}`, name: goalDraft.name.trim(), targetAmount: amount, currentSaved: 0, targetDate: goalDraft.date, protected: goalDraft.protected }]);
    toast.success("Savings goal created"); setGoalDraft({ name: "", amount: "", date: "2026-11-30", protected: false }); setModal(null);
  };
  const addCommitment = async () => {
    const amount = Number(commitmentDraft.amount);
    if (!commitmentDraft.name.trim() || !Number.isFinite(amount) || amount <= 0) { toast.error("Add a commitment name and a valid amount"); return; }
    if (user) {
      try {
        await createCommitmentMutation.mutateAsync({ name: commitmentDraft.name.trim(), amount, kind: commitmentDraft.kind, dueDate: commitmentDraft.date, category: commitmentDraft.kind === "subscription" ? "Subscriptions" : "Bills" });
        await utils.finance.snapshot.invalidate();
        toast.success("Commitment added — your reserved balance is updated"); setCommitmentDraft({ name: "", amount: "", kind: "subscription", date: "2026-10-25" }); setModal(null);
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create commitment"); }
      return;
    }
    setCommitments([...commitments, { id: `${Date.now()}`, name: commitmentDraft.name.trim(), amount, dueDate: commitmentDraft.date, kind: commitmentDraft.kind, category: commitmentDraft.kind === "subscription" ? "Subscriptions" : "Bills", active: true, paid: false }]);
    toast.success("Commitment added — your reserved balance is updated");
    setCommitmentDraft({ name: "", amount: "", kind: "subscription", date: "2026-10-25" });
    setModal(null);
  };
  const contribute = async (goalId: string | number) => {
    const amount = Number(window.prompt("How much would you like to allocate?", "100"));
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (amount > finance.availableBalance) { toast.error("That allocation is larger than your available balance"); return; }
    if (user && typeof goalId === "number") {
      try { await contributeMutation.mutateAsync({ goalId, amount }); await utils.finance.snapshot.invalidate(); toast.success("Savings allocated — discretionary balance updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not allocate savings"); }
      return;
    }
    setGoals(goals.map(goal => goal.id === goalId ? { ...goal, currentSaved: goal.currentSaved + amount } : goal));
    toast.success("Savings allocated — discretionary balance updated");
  };
  const payCommitment = async (id: string | number) => {
    const commitment = commitments.find(item => item.id === id);
    if (!commitment) return;
    if (commitment.amount > finance.availableBalance) { toast.error("This payment would exceed your available balance"); return; }
    if (user && typeof id === "number") {
      try { await payCommitmentMutation.mutateAsync({ commitmentId: id }); await utils.finance.snapshot.invalidate(); toast.success(`${commitment.name} marked paid — it won't be reserved twice`); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not record payment"); }
      return;
    }
    setCommitments(commitments.map(item => item.id === id ? { ...item, paid: true } : item));
    setTransactions([...transactions, { id: `${Date.now()}`, kind: "expense", amount: commitment.amount, category: commitment.category ?? "Bills", description: commitment.name, date: today() }]);
    toast.success(`${commitment.name} marked paid — it won't be reserved twice`);
  };
  const saveSettings = async (nextSettings: { startingBudget: number; durationDays: number; emergencyFundTarget: number }) => {
    if (user) {
      try { await updateSettingsMutation.mutateAsync(nextSettings); await utils.finance.snapshot.invalidate(); setSettings(nextSettings); toast.success("Plan settings updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update plan settings"); }
      return;
    }
    setSettings(nextSettings);
    toast.success("Plan settings updated");
  };

  const sectionTitle = navItems.find(item => item.id === activeSection)?.label ?? "Overview";
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="sidebar-top"><Logo /><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="workspace-switcher"><span className="avatar-bubble">{user?.name?.[0]?.toUpperCase() ?? "A"}</span><div><strong>{user?.name?.split(" ")[0] ?? "Alex's"} plan</strong><span>Personal workspace</span></div><ChevronRight size={14} /></div>
        <div className="nav-group"><span className="nav-label">Workspace</span>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${activeSection === id ? "active" : ""}`} onClick={() => openSection(id)}><Icon size={17} /><span>{label}</span>{id === "coach" ? <span className="new-badge">NEW</span> : null}</button>)}</div>
        <div className="nav-group nav-lower"><span className="nav-label">Manage</span><button className={`nav-item ${activeSection === "settings" ? "active" : ""}`} onClick={() => openSection("settings")}><Settings2 size={17} /><span>Plan settings</span></button><button className="nav-item" onClick={() => toast.info("Your monthly plan is currently up to date") }><Bell size={17} /><span>Notifications</span><span className="notification-dot" /></button></div>
        <div className="sidebar-bottom"><div className="sidebar-tip"><Sparkles size={16} /><div><strong>One clear next step</strong><span>{finance.recommendations[2]}</span></div></div><div className="sidebar-foot"><span>POCKETWISE · 2026</span><span className="status-dot mint-dot" /> <span>Private plan</span></div></div>
      </aside>
      <div className="main-area">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="mobile-title">{sectionTitle}</div><div className="topbar-spacer" /><span className="topbar-date"><CalendarDays size={15} /> October 2026</span><button className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>{user ? <div className="profile-chip"><span className="avatar-bubble small">{user.name?.[0]?.toUpperCase() ?? "A"}</span><span>{user.name?.split(" ")[0] ?? "You"}</span></div> : <button className="login-button" onClick={() => { try { startLogin(); } catch { toast.error("Login is not configured in this preview"); } }}><LogIn size={15} /> Sign in</button>}</header>
        <main className="content-area">
          {activeSection === "overview" ? <Overview finance={finance} input={input} onOpen={setModal} onSection={openSection} onRunSimulator={() => setModal("simulator")} /> : null}
          {activeSection === "activity" ? <ActivitySection transactions={transactions} onOpen={() => setModal("transaction")} onDelete={async id => { if (user && typeof id === "number") { try { await deleteTransactionMutation.mutateAsync({ transactionId: id }); await utils.finance.snapshot.invalidate(); toast.success("Transaction removed — totals recalculated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove transaction"); } return; } setTransactions(transactions.filter(item => item.id !== id)); toast.success("Transaction removed — totals recalculated"); }} onSection={openSection} /> : null}
          {activeSection === "goals" ? <GoalsSection goals={goals} finance={finance} onOpen={() => setModal("goal")} onContribute={contribute} /> : null}
          {activeSection === "commitments" ? <CommitmentsSection commitments={commitments} onPay={payCommitment} onOpen={() => setModal("commitment")} /> : null}
          {activeSection === "coach" ? <CoachSection finance={finance} input={input} onRunSimulator={() => setModal("simulator")} /> : null}
          {activeSection === "settings" ? <SettingsSection settings={settings} onSave={saveSettings} /> : null}
        </main>
      </div>
      {mobileNav ? <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation overlay" /> : null}

      {modal === "transaction" ? <ModalShell title="Add activity" description="Confirmed activity changes every connected metric." onClose={() => setModal(null)}><div className="segmented-control"><button className={txDraft.kind === "expense" ? "active" : ""} onClick={() => setTxDraft({ ...txDraft, kind: "expense" })}><ArrowUpRight size={15} /> Expense</button><button className={txDraft.kind === "income" ? "active" : ""} onClick={() => setTxDraft({ ...txDraft, kind: "income" })}><ArrowDownRight size={15} /> Income</button></div><div className="form-grid"><label>Amount<input autoFocus type="number" min="0" placeholder="0" value={txDraft.amount} onChange={event => setTxDraft({ ...txDraft, amount: event.target.value })} /></label><label>Date<input type="date" value={txDraft.date} onChange={event => setTxDraft({ ...txDraft, date: event.target.value })} /></label><label>Category<select value={txDraft.category} onChange={event => setTxDraft({ ...txDraft, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label>Description<input placeholder="e.g. Lunch with friends" value={txDraft.description} onChange={event => setTxDraft({ ...txDraft, description: event.target.value })} /></label></div><div className="modal-actions"><button className="quiet-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={addTransaction}>Save activity <Check size={15} /></button></div></ModalShell> : null}
      {modal === "goal" ? <ModalShell title="Create savings goal" description="Goals are excluded from discretionary spending as you fund them." onClose={() => setModal(null)}><div className="form-grid single"><label>Goal name<input autoFocus placeholder="e.g. New laptop" value={goalDraft.name} onChange={event => setGoalDraft({ ...goalDraft, name: event.target.value })} /></label><label>Target amount<input type="number" min="0" placeholder="2000" value={goalDraft.amount} onChange={event => setGoalDraft({ ...goalDraft, amount: event.target.value })} /></label><label>Target date<input type="date" value={goalDraft.date} onChange={event => setGoalDraft({ ...goalDraft, date: event.target.value })} /></label><label className="checkbox-line"><input type="checkbox" checked={goalDraft.protected} onChange={event => setGoalDraft({ ...goalDraft, protected: event.target.checked })} /> Protect this reserve from everyday spending</label></div><div className="modal-actions"><button className="quiet-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={addGoal}>Create goal <Target size={15} /></button></div></ModalShell> : null}
      {modal === "commitment" ? <ModalShell title="Add commitment" description="Reserve upcoming bills separately from actual spending." onClose={() => setModal(null)}><div className="form-grid"><label>Commitment name<input autoFocus placeholder="e.g. Gym membership" value={commitmentDraft.name} onChange={event => setCommitmentDraft({ ...commitmentDraft, name: event.target.value })} /></label><label>Amount<input type="number" min="0" placeholder="350" value={commitmentDraft.amount} onChange={event => setCommitmentDraft({ ...commitmentDraft, amount: event.target.value })} /></label><label>Type<select value={commitmentDraft.kind} onChange={event => setCommitmentDraft({ ...commitmentDraft, kind: event.target.value as FinanceCommitment["kind"] })}><option value="bill">Bill</option><option value="subscription">Subscription</option></select></label><label>Due date<input type="date" value={commitmentDraft.date} onChange={event => setCommitmentDraft({ ...commitmentDraft, date: event.target.value })} /></label></div><div className="modal-actions"><button className="quiet-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={addCommitment}>Reserve commitment <CreditCard size={15} /></button></div></ModalShell> : null}
      {modal === "settings" ? null : null}
      {modal === "simulator" ? <ModalShell title="Decision simulator" description="Explore the consequence first. Nothing changes until you confirm." onClose={() => setModal(null)} wide><div className="simulator-layout"><div className="simulator-form"><SectionEyebrow>What are you considering?</SectionEyebrow><div className="scenario-types">{(["expense", "income", "save", "bill"] as ScenarioKind[]).map(kind => <button key={kind} className={simulation.kind === kind ? "active" : ""} onClick={() => setSimulation({ ...simulation, kind })}>{kind === "expense" ? "Purchase" : kind === "income" ? "Extra income" : kind === "save" ? "Save more" : "Pay a bill"}</button>)}</div><label>Amount<input type="number" min="0" value={simulation.amount} onChange={event => setSimulation({ ...simulation, amount: Number(event.target.value) })} /></label>{simulation.kind !== "save" && simulation.kind !== "bill" ? <label>Category<select value={simulation.category} onChange={event => setSimulation({ ...simulation, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label> : null}<label>Label<input value={simulation.description} onChange={event => setSimulation({ ...simulation, description: event.target.value })} placeholder="e.g. New headphones" /></label><div className="simulator-tip"><Lightbulb size={16} /><span>Try a larger amount to see when the plan moves from low to moderate risk.</span></div></div><div className="comparison-panel"><div className="comparison-head"><span>Current plan</span><span className="comparison-arrow">→</span><span>With this decision</span></div><div className="comparison-number-row"><div><span>Available balance</span><strong>{formatMoney(finance.availableBalance)}</strong></div><ChevronRight size={17} /><div className={proposed.availableBalance < finance.availableBalance ? "down" : "up"}><span>New balance</span><strong>{formatMoney(proposed.availableBalance)}</strong></div></div><div className="comparison-divider" /><div className="comparison-metrics"><div><span>Daily allowance</span><strong>{formatMoney(finance.discretionaryAllowance)} <em className={proposed.discretionaryAllowance < finance.discretionaryAllowance ? "negative" : "positive"}>{proposed.discretionaryAllowance < finance.discretionaryAllowance ? "↓" : "↑"} {formatMoney(Math.abs(proposed.discretionaryAllowance - finance.discretionaryAllowance))}</em></strong></div><div><span>Month-end estimate</span><strong>{formatMoney(proposed.projectedMonthEndBalance)}</strong></div><div><span>Health score</span><strong>{proposed.healthScore} <em className={proposed.healthScore < finance.healthScore ? "negative" : "positive"}>{proposed.healthScore - finance.healthScore >= 0 ? "+" : ""}{proposed.healthScore - finance.healthScore} pts</em></strong></div><div><span>Risk level</span><StatusPill level={proposed.riskLevel} /></div></div><div className={`consequence ${proposed.riskLevel === "High Risk" ? "danger" : proposed.riskLevel === "Moderate Risk" ? "warning" : "safe"}`}><div className="consequence-icon">{proposed.riskLevel === "Low Risk" ? <ShieldCheck size={16} /> : <TrendingDown size={16} />}</div><div><strong>{proposed.riskLevel === "Low Risk" ? "This fits your plan." : proposed.riskLevel === "Moderate Risk" ? "This is workable with attention." : "This puts the plan under pressure."}</strong><p>{proposed.riskMessage}</p></div></div><div className="comparison-footer"><span><ShieldCheck size={14} /> Simulation only — actual records are unchanged.</span><button className="primary-button" onClick={confirmSimulation}>Confirm decision <Check size={15} /></button></div></div></div></ModalShell> : null}
    </div>
  );
}
