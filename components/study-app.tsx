"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownRight, ArrowUpRight, Bell, BookOpen, Brain, CalendarDays,
  CalendarRange, ChartNoAxesCombined, Check, ChevronLeft, ChevronRight,
  Clock3, Crown, Flag, Flame, LayoutDashboard, LockKeyhole, LogOut, MapPinned, Medal,
  MoonStar, MoreHorizontal, Navigation, NotebookPen, Pause, Pencil, Play, Plus, RotateCcw,
  Search, Settings2, ShieldCheck, Sparkles, Sunrise, Target, TimerReset, Trophy,
  Trash2, UserRound, Zap, Download, Upload,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { cn, formatMinutes, localDate } from "@/lib/utils";

type PageId = "dashboard" | "timer" | "records" | "analytics" | "calendar" | "journey" | "goals" | "achievements" | "profile";

type Session = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  minutes: number;
  subject: string;
  tags: string[];
  note: string;
};

type Account = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt?: string;
  role?: "admin" | "user";
};

type Goals = { daily: number; weekly: number; monthly: number };
type JourneyAnimation = { key: string; fromKm: number; toKm: number; addedKm: number; subject: string };
type AchievementMetric = "hours" | "streak" | "sessions" | "early" | "late";
type AchievementDefinition = {
  id: string;
  icon: string;
  title: string;
  text: string;
  metric: AchievementMetric;
  target: number;
};

const ACCOUNTS_KEY = "studyTraceAccountsV1";
const SESSION_KEY = "studyTraceSessionV1";
const ACHIEVEMENTS_KEY = "studyTraceAchievementDefinitionsV1";
const ACHIEVEMENT_METRIC_LABELS: Record<AchievementMetric, string> = {
  hours: "累積讀書時數",
  streak: "連續讀書天數",
  sessions: "讀書紀錄次數",
  early: "早上七點前讀書",
  late: "晚上十點後讀書",
};
const DEFAULT_ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "first-hour", icon: "📚", title: "第一小時", text: "累積完成第一個小時的讀書紀錄", metric: "hours", target: 1 },
  { id: "seven-day-streak", icon: "🔥", title: "七天連續", text: "連續七天都有留下學習足跡", metric: "streak", target: 7 },
  { id: "hundred-hours", icon: "💯", title: "百小時旅人", text: "累積讀書時間達到一百小時", metric: "hours", target: 100 },
  { id: "night-owl", icon: "🌙", title: "夜貓子", text: "晚上十點後完成一次專注學習", metric: "late", target: 1 },
  { id: "early-bird", icon: "🌅", title: "早起鳥", text: "早上七點前完成一次專注學習", metric: "early", target: 1 },
  { id: "thousand-hours", icon: "🏆", title: "千小時大師", text: "長期累積一千小時的學習時間", metric: "hours", target: 1000 },
];
const TAIWAN_LOOP_KM = 960.8;
const TAIWAN_ROUTE_STAGES = [
  { km: 0, city: "臺北" },
  { km: 80, city: "宜蘭" },
  { km: 190, city: "花蓮" },
  { km: 350, city: "臺東" },
  { km: 470, city: "屏東" },
  { km: 560, city: "高雄" },
  { km: 630, city: "臺南" },
  { km: 710, city: "嘉義" },
  { km: 800, city: "臺中" },
  { km: 875, city: "新竹" },
  { km: TAIWAN_LOOP_KM, city: "臺北" },
];
// Natural Earth 1:10m 公開領域海岸線，保留足夠節點讓輪廓接近真實臺灣本島。
const TAIWAN_MAIN_ISLAND: Array<[number, number]> = [
  [121.539724, 25.287421], [121.597911, 25.271430], [121.649669, 25.197089],
  [121.684418, 25.200507], [121.676443, 25.179389], [121.703868, 25.156887],
  [121.905121, 25.106594], [121.899913, 25.065985], [121.919200, 25.022040],
  [121.967540, 25.021064], [122.005382, 25.001899], [121.905772, 24.950100],
  [121.814626, 24.831732], [121.814952, 24.644355], [121.827973, 24.622789],
  [121.881847, 24.597805], [121.840831, 24.590318], [121.855968, 24.550523],
  [121.852794, 24.530992], [121.830089, 24.519232], [121.840017, 24.481350],
  [121.780040, 24.432685], [121.758556, 24.332343], [121.772716, 24.309231],
  [121.662852, 24.193101], [121.607432, 24.076850], [121.629161, 24.014960],
  [121.521495, 23.658677], [121.462169, 23.343004], [121.408865, 23.254584],
  [121.400076, 23.145494], [121.347423, 23.083319], [121.299571, 22.959174],
  [121.255626, 22.897773], [121.190278, 22.843166], [121.177419, 22.778632],
  [121.021007, 22.647895], [120.948253, 22.526801], [120.922862, 22.424750],
  [120.886567, 22.365953], [120.879242, 22.055813], [120.863617, 22.008938],
  [120.835704, 21.987250], [120.840343, 21.904608], [120.767426, 21.959296],
  [120.737315, 21.966132], [120.727306, 21.934475], [120.700369, 21.948432],
  [120.704356, 21.981391], [120.681651, 22.022528], [120.696951, 22.113227],
  [120.621267, 22.295071], [120.569672, 22.373847], [120.511974, 22.424750],
  [120.413259, 22.482327], [120.380870, 22.483873], [120.285167, 22.580064],
  [120.333669, 22.525946], [120.313487, 22.577053], [120.239594, 22.659084],
  [120.246349, 22.709906], [120.199962, 22.792467], [120.203461, 22.839667],
  [120.142100, 22.980292], [120.170258, 23.013373], [120.166189, 23.031724],
  [120.142100, 23.034898], [120.114106, 23.007636], [120.107921, 23.048570],
  [120.055186, 23.043687], [120.059418, 23.075873], [120.100434, 23.096991],
  [120.059418, 23.110663], [120.089203, 23.117743], [120.059418, 23.151028],
  [120.086925, 23.182034], [120.078624, 23.206977], [120.108897, 23.286689],
  [120.124685, 23.294989], [120.110494, 23.303699], [120.116527, 23.317897],
  [120.148936, 23.322252], [120.120779, 23.341254], [120.130149, 23.360960],
  [120.164577, 23.361711], [120.130544, 23.450995], [120.157544, 23.491476],
  [120.125029, 23.489611], [120.124262, 23.520021], [120.141689, 23.537947],
  [120.143609, 23.638036], [120.189220, 23.774807], [120.292247, 23.911933],
  [120.350352, 24.038072], [120.411876, 24.096910], [120.422048, 24.152167],
  [120.493175, 24.230658], [120.558116, 24.385891], [120.648936, 24.483873],
  [120.702159, 24.607001], [120.727875, 24.613918], [120.778087, 24.665717],
  [120.826671, 24.666083], [120.823009, 24.685045], [120.909190, 24.816881],
  [120.902354, 24.836819], [120.926036, 24.884711], [120.953624, 24.905015],
  [121.005544, 25.000678], [121.059337, 25.050238], [121.210948, 25.111151],
  [121.330251, 25.130683], [121.387380, 25.159329], [121.443207, 25.136420],
  [121.399099, 25.192125], [121.461274, 25.261908], [121.539724, 25.287421],
];
// 科目、標籤和顏色集中放在這裡，之後要新增選項會比較方便。
const SUBJECTS = ["數學", "英文", "資訊", "物理", "化學", "生物", "國文", "歷史", "地理", "公民", "其他"];
const TAGS = ["複習", "新進度", "刷題", "筆記", "考前", "專注"];
const SUBJECT_COLORS: Record<string, string> = {
  數學: "#8b7cf6", 英文: "#65d3ff", 資訊: "#65d99a", 物理: "#ffb86b",
  化學: "#ff7b84", 生物: "#78d8b1", 國文: "#d7a6ff", 歷史: "#d8b478",
  地理: "#71b7df", 公民: "#a5aaaf", 其他: "#7d8390",
};

const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard; badge?: string }[] = [
  { id: "dashboard", label: "總覽", icon: LayoutDashboard },
  { id: "timer", label: "專注計時", icon: TimerReset, badge: "計時" },
  { id: "records", label: "讀書紀錄", icon: NotebookPen },
  { id: "analytics", label: "學習分析", icon: ChartNoAxesCombined },
  { id: "calendar", label: "學習月曆", icon: CalendarDays },
  { id: "journey", label: "環島足跡", icon: MapPinned },
  { id: "goals", label: "學習目標", icon: Target },
  { id: "achievements", label: "成就系統", icon: Trophy },
  { id: "profile", label: "個人頁面", icon: UserRound },
];

const PAGE_COPY: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: "學習總覽", subtitle: "整理今天、本週和本月的讀書狀況。" },
  timer: { title: "專注計時", subtitle: "先設定科目和時間，再開始專心。" },
  records: { title: "讀書紀錄", subtitle: "把每一次讀書內容簡單記下來。" },
  analytics: { title: "學習分析", subtitle: "用圖表看看自己的讀書習慣。" },
  calendar: { title: "學習月曆", subtitle: "從月曆回顧每天讀了哪些科目。" },
  journey: { title: "環島足跡", subtitle: "每讀一小時，就沿著臺灣前進一公里。" },
  goals: { title: "學習目標", subtitle: "設定每天、每週和每月想完成的時間。" },
  achievements: { title: "成就系統", subtitle: "完成里程碑，記錄自己的進步。" },
  profile: { title: "個人頁面", subtitle: "查看自己的等級、時數與常讀科目。" },
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function isValidAchievement(value: unknown): value is AchievementDefinition {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0
    && typeof item.icon === "string" && item.icon.length > 0 && item.icon.length <= 12
    && typeof item.title === "string" && item.title.length > 0 && item.title.length <= 30
    && typeof item.text === "string" && item.text.length > 0 && item.text.length <= 100
    && typeof item.metric === "string" && Object.hasOwn(ACHIEVEMENT_METRIC_LABELS, item.metric)
    && typeof item.target === "number" && Number.isFinite(item.target) && item.target > 0 && item.target <= 100000;
}

function readAchievementDefinitions() {
  const stored = readJson<unknown>(ACHIEVEMENTS_KEY, []);
  if (Array.isArray(stored) && stored.length && stored.every(isValidAchievement)) return stored;
  return DEFAULT_ACHIEVEMENTS.map((item) => ({ ...item }));
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
}

function createDemoSessions(): Session[] {
  // 第一次預覽時先放入一些示範紀錄，這樣圖表不會是空白的。
  const examples = [
    [0, "19:00", "20:20", 80, "數學", ["刷題"], "完成機率題型整理"],
    [0, "16:10", "16:55", 45, "英文", ["複習"], "複習 Unit 7 單字"],
    [1, "20:00", "21:30", 90, "物理", ["新進度"], "動量與碰撞"],
    [2, "18:30", "19:20", 50, "資訊", ["專注"], "JavaScript 陣列練習"],
    [3, "19:10", "20:20", 70, "數學", ["考前"], "模擬考錯題訂正"],
    [4, "06:40", "07:20", 40, "英文", ["筆記"], "閱讀測驗兩篇"],
    [5, "20:00", "21:00", 60, "化學", ["複習"], "氧化還原反應"],
    [6, "15:30", "17:00", 90, "數學", ["刷題"], "排列組合題組"],
    [7, "19:30", "20:10", 40, "國文", ["筆記"], "古文十五篇整理"],
    [8, "20:20", "21:30", 70, "物理", ["新進度"], "圓周運動"],
    [10, "18:00", "19:00", 60, "資訊", ["專注"], "網頁版面練習"],
    [12, "20:00", "21:20", 80, "數學", ["考前"], "段考範圍統整"],
  ] as const;
  return examples.map(([days, startTime, endTime, minutes, subject, tags, note]) => ({
    id: uid(), date: dateDaysAgo(days), startTime, endTime, minutes, subject, tags: [...tags], note,
  }));
}

function startOfWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function computeStreak(sessions: Session[]) {
  const days = new Set(sessions.map((session) => session.date));
  let cursor = new Date();
  if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function playCompletionTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    [0, 0.18, 0.36].forEach((delay, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = [523.25, 659.25, 783.99][index];
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.24);
    });
  } catch { /* Browser audio may be unavailable until interaction. */ }
}

// 統計今天、本週、本月和全部的讀書分鐘數。
function getSessionTotals(sessions: Session[]) {
  const today = localDate();
  const weekStart = localDate(startOfWeek());
  const month = today.slice(0, 7);
  return {
    today: sessions.filter((item) => item.date === today).reduce((sum, item) => sum + item.minutes, 0),
    week: sessions.filter((item) => item.date >= weekStart).reduce((sum, item) => sum + item.minutes, 0),
    month: sessions.filter((item) => item.date.startsWith(month)).reduce((sum, item) => sum + item.minutes, 0),
    total: sessions.reduce((sum, item) => sum + item.minutes, 0),
  };
}

function getAchievementMetricValues(sessions: Session[]): Record<AchievementMetric, number> {
  const totals = getSessionTotals(sessions);
  return {
    hours: totals.total / 60,
    streak: computeStreak(sessions),
    sessions: sessions.length,
    early: sessions.some((item) => Number(item.startTime.slice(0, 2)) < 7) ? 1 : 0,
    late: sessions.some((item) => Number(item.startTime.slice(0, 2)) >= 22) ? 1 : 0,
  };
}

function getUnlockedAchievements(sessions: Session[], definitions: AchievementDefinition[]) {
  const values = getAchievementMetricValues(sessions);
  return definitions.filter((item) => values[item.metric] >= item.target);
}

function subjectBreakdown(sessions: Session[]) {
  const totals = sessions.reduce<Record<string, number>>((map, item) => {
    map[item.subject] = (map[item.subject] || 0) + item.minutes;
    return map;
  }, {});
  return Object.entries(totals).map(([name, value]) => ({ name, value, color: SUBJECT_COLORS[name] || SUBJECT_COLORS.其他 })).sort((a, b) => b.value - a.value);
}

function LoadingScreen() {
  return (
    <div className="auth-page">
      <div style={{ width: "min(720px, 100%)" }}>
        <Skeleton className="h-10 w-44 mb-7" />
        <div className="metrics-grid">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32" />)}
        </div>
        <Skeleton className="h-80 mt-3" />
      </div>
    </div>
  );
}

// 本機帳號不直接保存明文密碼，而是保存雜湊後的結果。
async function hashPassword(username: string, password: string) {
  const value = `${username}:${password}:study-trace-v1`;
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `local-${(hash >>> 0).toString(16)}`;
}

// 匯入 JSON 前先檢查每個欄位，避免錯誤檔案被寫入 localStorage。
function isValidAccount(value: unknown): value is Account {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 200
    && typeof item.username === "string" && item.username.length >= 3 && item.username.length <= 50 && !/\s/.test(item.username)
    && typeof item.displayName === "string" && item.displayName.length > 0 && item.displayName.length <= 50
    && typeof item.passwordHash === "string" && item.passwordHash.length > 0 && item.passwordHash.length <= 256
    && (item.createdAt === undefined || typeof item.createdAt === "string")
    && (item.role === undefined || item.role === "admin" || item.role === "user");
}

// 舊帳號沒有角色欄位時，第一個正式帳號會自動成為本機管理者。
function withAccountRoles(accounts: Account[]) {
  const normalized = accounts.map((item) => ({ ...item, role: item.id === "demo-account" ? "user" as const : item.role || "user" as const }));
  if (!normalized.some((item) => item.role === "admin")) {
    const firstAccount = normalized.findIndex((item) => item.id !== "demo-account");
    if (firstAccount >= 0) normalized[firstAccount] = { ...normalized[firstAccount], role: "admin" };
  }
  return normalized;
}

function AuthScreen({ onAuth }: { onAuth: (account: Account, demo?: boolean) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");

  function showError(text: string) {
    setMessageTone("error");
    setMessage(text);
  }

  function showSuccess(text: string) {
    setMessageTone("success");
    setMessage(text);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const displayName = String(data.get("displayName") || "").trim();
    if (username.length < 3 || /\s/.test(username)) return showError("帳號需至少 3 個字元，且不能包含空白。");
    if (password.length < 6) return showError("密碼需至少 6 個字元。");
    const accounts = withAccountRoles(readJson<Account[]>(ACCOUNTS_KEY, []));
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    const passwordHash = await hashPassword(username, password);
    if (mode === "register") {
      if (!displayName) return showError("請輸入你的顯示名稱。");
      if (accounts.some((item) => item.username === username)) return showError("這個帳號已經存在。");
      const account: Account = { id: uid(), username, displayName, passwordHash, createdAt: new Date().toISOString(), role: accounts.some((item) => item.role === "admin") ? "user" : "admin" };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
      localStorage.setItem(SESSION_KEY, account.id);
      onAuth(account);
      return;
    }
    const account = accounts.find((item) => item.username === username && item.passwordHash === passwordHash);
    if (!account) return showError("帳號或密碼不正確。");
    localStorage.setItem(SESSION_KEY, account.id);
    onAuth(account);
  }

  function enterDemo() {
    const accounts = withAccountRoles(readJson<Account[]>(ACCOUNTS_KEY, []));
    let account = accounts.find((item) => item.id === "demo-account");
    if (!account) {
      account = { id: "demo-account", username: "demo", displayName: "學習者", passwordHash: "demo", role: "user" };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
    }
    localStorage.setItem(SESSION_KEY, account.id);
    onAuth(account, true);
  }

  function exportAccounts() {
    const accounts = withAccountRoles(readJson<Account[]>(ACCOUNTS_KEY, [])).filter((item) => item.id !== "demo-account");
    if (!accounts.length) return showError("目前沒有可匯出的本機帳號。");
    const backup = {
      type: "study-tracker-account-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      notice: "此檔案包含登入憑證的雜湊值，請妥善保管，不要公開上傳。",
      accounts,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `study-tracker-accounts-${localDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(`已匯出 ${accounts.length} 個本機帳號。`);
  }

  async function importAccounts(file?: File) {
    if (!file) return;
    if (file.size > 1024 * 1024) return showError("帳號備份檔案不可超過 1 MB。");
    try {
      const backup = JSON.parse(await file.text()) as { type?: unknown; version?: unknown; accounts?: unknown };
      if (backup.type !== "study-tracker-account-backup" || backup.version !== 1 || !Array.isArray(backup.accounts)) throw new Error("invalid backup");
      if (!backup.accounts.length || !backup.accounts.every(isValidAccount)) throw new Error("invalid accounts");

      const existing = withAccountRoles(readJson<Account[]>(ACCOUNTS_KEY, []));
      const usernames = new Set(existing.map((item) => item.username));
      const ids = new Set(existing.map((item) => item.id));
      const added: Account[] = [];
      let skipped = 0;

      backup.accounts.forEach((item) => {
        const username = item.username.toLowerCase();
        if (item.id === "demo-account" || usernames.has(username)) {
          skipped += 1;
          return;
        }
        const account = { ...item, id: ids.has(item.id) ? uid() : item.id, username };
        usernames.add(username);
        ids.add(account.id);
        added.push(account);
      });

      if (added.length) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(withAccountRoles([...existing, ...added])));
      setMode("login");
      showSuccess(`已匯入 ${added.length} 個帳號${skipped ? `，略過 ${skipped} 個同名帳號` : ""}。現在可以使用原本的密碼登入。`);
    } catch {
      showError("無法讀取這個帳號備份，請選擇由讀書足跡匯出的 JSON 檔案。");
    }
  }

  return (
    <motion.main className="auth-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="auth-shell">
        <section className="auth-showcase">
          <div className="brand"><div className="brand-mark">ST</div><div className="brand-copy"><div className="brand-name">讀書足跡<span>高中生專題</span></div></div></div>
          <div className="auth-copy">
            <div className="eyebrow">高中生讀書時間管理工具</div>
            <h1>記下每天的努力，<br />看見自己的進步。</h1>
            <p>我做這個網站，是希望把讀書時間、科目和目標整理在同一個地方，也方便回顧自己的學習習慣。</p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="auth-preview-row"><div className="preview-block" /><div className="preview-block" /><div className="preview-block" /></div>
            <div className="preview-chart" />
          </div>
        </section>
        <section className="auth-form-panel">
          <div className="brand"><div className="brand-mark">ST</div><div className="brand-copy"><div className="brand-name">讀書足跡<span>本機資料模式</span></div></div></div>
          <h2>{mode === "login" ? "歡迎回來" : "建立學習帳號"}</h2>
          <p>{mode === "login" ? "登入後繼續累積你的學習軌跡。" : "你的資料只會保存在目前瀏覽器。"}</p>
          <div className="auth-tabs">
            <button className={cn("auth-tab", mode === "login" && "active")} onClick={() => { setMode("login"); setMessage(""); }}>登入</button>
            <button className={cn("auth-tab", mode === "register" && "active")} onClick={() => { setMode("register"); setMessage(""); }}>建立帳號</button>
          </div>
          <form key={mode} onSubmit={submit} autoComplete="off">
            {mode === "register" && <div className="form-field" style={{ marginBottom: 13 }}><label className="form-label" htmlFor="displayName">顯示名稱</label><input className="input" id="displayName" name="displayName" placeholder="例如：小安" autoComplete="off" defaultValue="" /></div>}
            <div className="form-field" style={{ marginBottom: 13 }}><label className="form-label" htmlFor="username">帳號</label><input className="input" id="username" name="username" placeholder="至少 3 個字元" autoComplete="off" autoCapitalize="none" spellCheck={false} defaultValue="" required /></div>
            <div className="form-field" style={{ marginBottom: 12 }}><label className="form-label" htmlFor="password">密碼</label><input className="input" id="password" name="password" type="password" placeholder="至少 6 個字元" autoComplete="new-password" defaultValue="" required /></div>
            <Button style={{ width: "100%" }} type="submit">{mode === "login" ? "登入" : "建立帳號並開始"}<ArrowUpRight size={14} /></Button>
            <p className={cn("auth-message", messageTone === "success" && "success")} role="status">{message}</p>
          </form>
          <button className="demo-button" onClick={enterDemo}><Sparkles size={12} style={{ display: "inline", marginRight: 6 }} />直接查看示範資料</button>
          <div className="account-backup-actions">
            <button className="account-backup-button" type="button" onClick={exportAccounts}><Download size={15} /><span><strong>匯出帳號</strong><small>下載 JSON 備份</small></span></button>
            <label className="account-backup-button"><Upload size={15} /><span><strong>匯入帳號</strong><small>選擇 JSON 備份</small></span><input type="file" accept="application/json,.json" hidden onChange={(event) => { void importAccounts(event.target.files?.[0]); event.target.value = ""; }} /></label>
          </div>
          <div className="auth-note">備份不含明文密碼與讀書紀錄，但仍請妥善保管。清除瀏覽器資料後，帳號與紀錄會一併移除。</div>
        </section>
      </div>
    </motion.main>
  );
}

function MetricCard({ label, value, unit, trend, icon: Icon, color = "var(--violet-strong)" }: {
  label: string; value: string | number; unit: string; trend: string; icon: typeof Clock3; color?: string;
}) {
  const negative = trend.startsWith("-");
  return (
    <Card className="metric-card hoverable">
      <div className="metric-head"><span>{label}</span><span className="metric-icon" style={{ color }}><Icon size={15} /></span></div>
      <div className="metric-value">{value}<span>{unit}</span></div>
      <div className="metric-foot"><span className={negative ? "trend-down" : "trend-up"}>{negative ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}</span><span>{trend}</span></div>
    </Card>
  );
}

function CustomChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; payload?: { name?: string } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return <div className="chart-tooltip"><strong>{label || item.payload?.name || "學習時間"}</strong><span>{formatMinutes(Number(item.value || 0))}</span></div>;
}

function DashboardPage({ sessions, goals, onNavigate }: { sessions: Session[]; goals: Goals; onNavigate: (page: PageId) => void }) {
  const totals = getSessionTotals(sessions);
  const subjects = subjectBreakdown(sessions);
  const maxSubject = subjects[0];
  const dailyData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    const key = localDate(date);
    return { day: new Intl.DateTimeFormat("zh-TW", { weekday: "short" }).format(date), minutes: sessions.filter((item) => item.date === key).reduce((sum, item) => sum + item.minutes, 0) };
  });
  const goalPercent = Math.min(100, Math.round((totals.today / goals.daily) * 100));
  const recent = [...sessions].sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)).slice(0, 4);
  const priorWeekStart = new Date(startOfWeek());
  priorWeekStart.setDate(priorWeekStart.getDate() - 7);
  const priorWeekEnd = new Date(startOfWeek());
  priorWeekEnd.setDate(priorWeekEnd.getDate() - 1);
  const priorWeek = sessions.filter((item) => item.date >= localDate(priorWeekStart) && item.date <= localDate(priorWeekEnd)).reduce((sum, item) => sum + item.minutes, 0);
  const change = priorWeek ? Math.round(((totals.week - priorWeek) / priorWeek) * 100) : 18;
  const remaining = Math.max(0, goals.daily - totals.today);

  return (
    <>
      <div className="metrics-grid">
        <MetricCard label="今日讀書" value={(totals.today / 60).toFixed(1)} unit="小時" trend={`${Math.max(0, goalPercent)}% 今日目標`} icon={Clock3} />
        <MetricCard label="本週累積" value={(totals.week / 60).toFixed(1)} unit="小時" trend={`${change >= 0 ? "+" : ""}${change}% 較上週`} icon={CalendarRange} color="var(--cyan)" />
        <MetricCard label="本月累積" value={(totals.month / 60).toFixed(1)} unit="小時" trend="穩定成長中" icon={ChartNoAxesCombined} color="var(--green)" />
        <MetricCard label="累積總時數" value={Math.floor(totals.total / 60)} unit="小時" trend={`${sessions.length} 次專注紀錄`} icon={BookOpen} color="var(--orange)" />
      </div>

      <div className="dashboard-grid">
        <Card className="chart-card">
          <div className="card-heading"><div><h2 className="card-title">最近七天</h2><p className="card-subtitle">每天的專注時間變化</p></div><Button variant="ghost" size="sm" onClick={() => onNavigate("analytics")}>查看分析<ArrowUpRight size={12} /></Button></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 8, right: 3, left: -26, bottom: 0 }}>
                <defs><linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b7cf6" stopOpacity={0.36} /><stop offset="100%" stopColor="#8b7cf6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#747884", fontSize: 9 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#60636f", fontSize: 8 }} />
                <ChartTooltip content={<CustomChartTooltip />} cursor={{ stroke: "rgba(139,124,246,.3)" }} />
                <Area type="monotone" dataKey="minutes" stroke="#9c8fff" strokeWidth={2.2} fill="url(#areaGlow)" dot={{ r: 3, fill: "#0d0f14", stroke: "#a699ff", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#a699ff", stroke: "#fff", strokeWidth: 1 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="goal-ring-card">
          <div className="card-heading"><div><h2 className="card-title">今日目標</h2><p className="card-subtitle">{formatMinutes(goals.daily)} 專注計畫</p></div><Tooltip label="調整目標"><button className="mini-action" onClick={() => onNavigate("goals")}><Settings2 size={14} /></button></Tooltip></div>
          <div className="goal-ring" style={{ "--progress": `${goalPercent * 3.6}deg` } as React.CSSProperties}><div className="goal-ring-copy"><strong>{goalPercent}%</strong><span>完成率</span></div></div>
          <div className="goal-meta"><div>已完成<strong>{formatMinutes(totals.today)}</strong></div><div style={{ textAlign: "right" }}>尚需<strong>{formatMinutes(remaining)}</strong></div></div>
        </Card>
      </div>

      <div className="dashboard-bottom">
        <Card className="card-pad">
          <div className="card-heading"><div><h2 className="card-title">最近紀錄</h2><p className="card-subtitle">最後四次學習活動</p></div><Button variant="ghost" size="sm" onClick={() => onNavigate("records")}>全部紀錄<ArrowUpRight size={12} /></Button></div>
          {recent.length ? <div className="records-list">{recent.map((item) => <div className="record-row" style={{ gridTemplateColumns: "38px 1fr 74px" }} key={item.id}><div className="record-icon" style={{ color: SUBJECT_COLORS[item.subject] }}>{item.subject.slice(0, 1)}</div><div className="record-main"><strong>{item.subject}</strong><span>{item.date} · {item.tags.join("、") || "一般學習"}</span></div><div className="record-cell" style={{ textAlign: "right", color: "white" }}>{formatMinutes(item.minutes)}</div></div>)}</div> : <EmptyState icon={NotebookPen} title="還沒有讀書紀錄" text="開始一次專注計時，或手動新增第一筆紀錄。" />}
        </Card>

        <Card className="subject-summary">
          <div className="card-heading"><div><h2 className="card-title">最常讀科目</h2><p className="card-subtitle">本月投入分布</p></div></div>
          {maxSubject ? <><div className="top-subject"><div style={{ width: 70, height: 70, flex: "0 0 70px" }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={subjects} dataKey="value" innerRadius={21} outerRadius={32} paddingAngle={3} stroke="none">{subjects.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart></ResponsiveContainer></div><div><strong>{maxSubject.name}</strong><span>累積 {formatMinutes(maxSubject.value)} · 投入最多</span></div></div><div className="mini-bars">{subjects.slice(0, 3).map((item) => <div key={item.name}><div className="mini-bar-head"><span>{item.name}</span><span>{Math.round((item.value / Math.max(1, totals.total)) * 100)}%</span></div><div className="mini-bar-track"><div className="mini-bar-fill" style={{ width: `${(item.value / maxSubject.value) * 100}%` }} /></div></div>)}</div></> : <EmptyState icon={BookOpen} title="等待第一筆資料" text="新增紀錄後會自動找出最常讀的科目。" />}
        </Card>

        <Card className="insight-card">
          <div className="card-heading"><div className="insight-orb"><Brain size={18} /></div><span className="record-tag">學習小提醒</span></div>
          <h2 className="card-title">本週紀錄整理</h2>
          <div className="insight-list">
            <div className="insight-item">本週比上週{change >= 0 ? "多" : "少"}讀了 {Math.abs(change)}%，整體節奏{change >= 0 ? "正在提升" : "需要調整"}。</div>
            <div className="insight-item">{maxSubject ? `${maxSubject.name}是目前投入最多的科目，佔總時間 ${Math.round((maxSubject.value / Math.max(1, totals.total)) * 100)}%。` : "完成第一筆紀錄後，我會開始分析你的科目分布。"}</div>
            <div className="insight-item">{remaining ? `建議今天再讀 ${formatMinutes(remaining)}，即可完成每日目標。` : "今天的目標已完成，可以安排輕量複習或休息。"}</div>
          </div>
        </Card>
      </div>
    </>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof BookOpen; title: string; text: string }) {
  return <div className="empty-state"><div><div className="empty-icon"><Icon size={19} /></div><strong>{title}</strong><p>{text}</p></div></div>;
}

function TimerPage({ onComplete }: { onComplete: (session: Session) => void }) {
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState("數學");
  const [completed, setCompleted] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  // 計時器每秒減一；歸零時會播放提示音並自動新增紀錄。
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value > 1) return value - 1;
        window.clearInterval(id);
        setRunning(false);
        playCompletionTone();
        const end = new Date();
        const start = new Date(end.getTime() - duration * 60_000);
        onComplete({ id: uid(), date: localDate(end), startTime: start.toTimeString().slice(0, 5), endTime: end.toTimeString().slice(0, 5), minutes: duration, subject, tags: ["專注"], note: "由專注計時器自動建立" });
        setCompleted(true);
        return duration * 60;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, duration, subject, onComplete]);

  function changeDuration(value: number) {
    setDuration(value);
    setTimeLeft(value * 60);
    setRunning(false);
  }

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 360;

  return (
    <>
      <div className="timer-layout">
        <Card className="timer-card">
          <div className="timer-presets">
            {[25, 50].map((value) => <button key={value} className={cn("preset-button", duration === value && "active")} onClick={() => changeDuration(value)}>{value} 分鐘</button>)}
            <button className={cn("preset-button", ![25, 50].includes(duration) && "active")} onClick={() => setCustomOpen(true)}>自訂</button>
          </div>
          <div className="timer-ring" style={{ "--progress": `${progress}deg` } as React.CSSProperties}>
            <div className="timer-time">{minutes}:{seconds}<span>{running ? "專注進行中" : "準備好就開始"}</span></div>
          </div>
          <div className="timer-actions">
            <Tooltip label="重設計時"><Button variant="secondary" size="icon" onClick={() => { setRunning(false); setTimeLeft(duration * 60); }}><RotateCcw size={17} /></Button></Tooltip>
            <Button className="timer-primary" size="icon" onClick={() => setRunning((value) => !value)}>{running ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</Button>
            <Tooltip label={running ? "暫停" : "開始專注"}><Button variant="secondary" size="icon" onClick={() => setRunning((value) => !value)}>{running ? <Pause size={17} /> : <Zap size={17} />}</Button></Tooltip>
          </div>
        </Card>

        <div className="timer-side">
          <Card className="timer-info">
            <div className="card-heading"><div><h2 className="card-title">這次要讀什麼？</h2><p className="card-subtitle">完成後會自動建立紀錄</p></div></div>
            <label className="form-label" htmlFor="timerSubject">科目</label>
            <select id="timerSubject" className="select" value={subject} onChange={(event) => setSubject(event.target.value)}>{SUBJECTS.map((item) => <option key={item}>{item}</option>)}</select>
            <div className="stat-list" style={{ marginTop: 17 }}>
              <div className="stat-line"><span>計時模式</span><strong>番茄鐘</strong></div>
              <div className="stat-line"><span>預計完成</span><strong>{duration} 分鐘</strong></div>
              <div className="stat-line"><span>提示音</span><strong>開啟</strong></div>
            </div>
          </Card>
          <Card className="focus-quote"><Sparkles size={17} color="var(--violet-strong)" style={{ margin: "0 auto 14px" }} /><blockquote>「你不需要一次完成全部，只需要專心完成眼前的二十五分鐘。」</blockquote><cite>讀書足跡 · 今日提醒</cite></Card>
        </div>
      </div>
      <Dialog open={completed} onOpenChange={setCompleted} title="專注完成" description="這段時間已經自動加入你的讀書紀錄。">
        <div className="completion"><motion.div className="completion-burst" initial={{ scale: .4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 240 }}><Check size={32} /></motion.div><h3>做得很好！</h3><p>你完成了 {duration} 分鐘的 {subject} 專注時段。</p><Button onClick={() => setCompleted(false)} style={{ marginTop: 8 }}>繼續下一段</Button></div>
      </Dialog>
      <Dialog open={customOpen} onOpenChange={setCustomOpen} title="自訂專注時間" description="設定 1～180 分鐘的專注時段。">
        <form onSubmit={(event) => { event.preventDefault(); const value = Number(new FormData(event.currentTarget).get("minutes")); if (value >= 1 && value <= 180) { changeDuration(value); setCustomOpen(false); } }}>
          <div className="form-field"><label className="form-label">分鐘數</label><input className="input" name="minutes" type="number" min="1" max="180" defaultValue={40} autoFocus /></div>
          <Button type="submit" style={{ width: "100%", marginTop: 14 }}>套用時間</Button>
        </form>
      </Dialog>
    </>
  );
}

function RecordsPage({ sessions, onAdd, onDelete }: { sessions: Session[]; onAdd: (session: Session) => void; onDelete: (id: string) => void }) {
  const [tags, setTags] = useState<string[]>(["複習"]);
  const sorted = [...sessions].sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const startTime = String(data.get("startTime"));
    const endTime = String(data.get("endTime"));
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (minutes <= 0) minutes += 1440;
    onAdd({ id: uid(), date: String(data.get("date")), startTime, endTime, minutes, subject: String(data.get("subject")), tags, note: String(data.get("note") || "") });
    form.reset();
    (form.elements.namedItem("date") as HTMLInputElement).value = localDate();
    setTags(["複習"]);
    toast.success("已新增一筆讀書紀錄");
  }

  return (
    <div className="records-layout">
      <Card className="card-pad">
        <div className="card-heading"><div><h2 className="card-title">所有紀錄</h2><p className="card-subtitle">共 {sessions.length} 次學習活動</p></div><Button variant="secondary" size="sm"><Search size={12} />搜尋紀錄</Button></div>
        {sorted.length ? <div className="records-list">{sorted.map((item) => <motion.div layout className="record-row" key={item.id}><div className="record-icon" style={{ color: SUBJECT_COLORS[item.subject] }}>{item.subject.slice(0, 1)}</div><div className="record-main"><strong>{item.subject}</strong><span>{item.date} · {item.startTime}–{item.endTime}</span></div><div className="record-cell optional">{item.note || "沒有備註"}</div><div className="record-tag">{item.tags[0] || "一般"}</div><Button variant="ghost" size="sm" onClick={() => { onDelete(item.id); toast("紀錄已刪除"); }}>刪除</Button></motion.div>)}</div> : <EmptyState icon={NotebookPen} title="還沒有任何紀錄" text="使用右側表單新增，或前往專注計時器開始一段學習。" />}
      </Card>
      <Card className="card-pad" style={{ alignSelf: "start" }}>
        <div className="card-heading"><div><h2 className="card-title">新增讀書紀錄</h2><p className="card-subtitle">手動補上今天的學習</p></div><div className="insight-orb" style={{ width: 32, height: 32 }}><Plus size={15} /></div></div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-field full"><label className="form-label">日期</label><input className="input" name="date" type="date" defaultValue={localDate()} required /></div>
            <div className="form-field"><label className="form-label">開始時間</label><input className="input" name="startTime" type="time" defaultValue="19:00" required /></div>
            <div className="form-field"><label className="form-label">結束時間</label><input className="input" name="endTime" type="time" defaultValue="20:00" required /></div>
            <div className="form-field full"><label className="form-label">科目</label><select className="select" name="subject">{SUBJECTS.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="form-field full"><label className="form-label">標籤</label><div className="tag-row">{TAGS.map((tag) => <button type="button" key={tag} className={cn("tag-chip", tags.includes(tag) && "active")} onClick={() => setTags((value) => value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag])}>{tag}</button>)}</div></div>
            <div className="form-field full"><label className="form-label">備註</label><textarea className="textarea" name="note" placeholder="這次讀了什麼？哪裡需要再複習？" /></div>
            <div className="form-field full"><Button type="submit" style={{ width: "100%" }}><Plus size={14} />加入讀書紀錄</Button></div>
          </div>
        </form>
      </Card>
    </div>
  );
}

function AnalyticsPage({ sessions }: { sessions: Session[] }) {
  const totals = getSessionTotals(sessions);
  const subjects = subjectBreakdown(sessions);
  const streak = computeStreak(sessions);
  const activeDays = new Set(sessions.map((item) => item.date)).size;
  const average = activeDays ? Math.round(totals.total / activeDays) : 0;
  const highestDay = Object.entries(sessions.reduce<Record<string, number>>((map, item) => { map[item.date] = (map[item.date] || 0) + item.minutes; return map; }, {})).sort((a, b) => b[1] - a[1])[0];
  const previousMonthDate = new Date(); previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const previousMonth = sessions.filter((item) => item.date.startsWith(previousMonthKey)).reduce((sum, item) => sum + item.minutes, 0);
  const monthChange = previousMonth ? Math.round(((totals.month - previousMonth) / previousMonth) * 100) : 0;
  const last14 = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - 13 + index); const key = localDate(date);
    return { day: `${date.getMonth() + 1}/${date.getDate()}`, minutes: sessions.filter((item) => item.date === key).reduce((sum, item) => sum + item.minutes, 0) };
  });
  const weekly = Array.from({ length: 6 }, (_, index) => {
    const end = new Date(); end.setDate(end.getDate() - (5 - index) * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const value = sessions.filter((item) => item.date >= localDate(start) && item.date <= localDate(end)).reduce((sum, item) => sum + item.minutes, 0);
    return { week: `W${index + 1}`, minutes: value };
  });
  const heatDays = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - 364 + index); const key = localDate(date);
    const minutes = sessions.filter((item) => item.date === key).reduce((sum, item) => sum + item.minutes, 0);
    const level = minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 120 ? 3 : 4;
    return { key, minutes, level };
  });

  return (
    <div className="analytics-grid">
      <Card className="analytics-wide"><div className="card-heading"><div><h2 className="card-title">每日讀書時數</h2><p className="card-subtitle">最近 14 天專注趨勢</p></div><span className="record-tag">每日</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={last14} margin={{ left: -26, right: 4 }}><defs><linearGradient id="analyticsGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#65d3ff" stopOpacity={.3} /><stop offset="1" stopColor="#65d3ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#747884", fontSize: 8 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#60636f", fontSize: 8 }} /><ChartTooltip content={<CustomChartTooltip />} /><Area type="monotone" dataKey="minutes" stroke="#65d3ff" strokeWidth={2} fill="url(#analyticsGlow)" /></AreaChart></ResponsiveContainer></div></Card>
      <Card className="analytics-side"><div className="card-heading"><div><h2 className="card-title">關鍵指標</h2><p className="card-subtitle">長期學習品質</p></div><Sparkles size={15} color="var(--violet-strong)" /></div><div className="stat-list"><div className="stat-line"><span>平均每天</span><strong>{formatMinutes(average)}</strong></div><div className="stat-line"><span>單日最高</span><strong>{formatMinutes(highestDay?.[1] || 0)}</strong></div><div className="stat-line"><span>連續讀書</span><strong>{streak} 天 🔥</strong></div><div className="stat-line"><span>月度比較</span><strong className={monthChange >= 0 ? "trend-up" : "trend-down"}>{monthChange >= 0 ? "+" : ""}{monthChange}%</strong></div></div></Card>
      <Card className="analytics-half"><div className="card-heading"><div><h2 className="card-title">每週比較</h2><p className="card-subtitle">近六週投入時間</p></div></div><div className="chart-wrap compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} margin={{ left: -28 }}><CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false} /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#747884", fontSize: 8 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#60636f", fontSize: 8 }} /><ChartTooltip content={<CustomChartTooltip />} /><Bar dataKey="minutes" fill="#8b7cf6" radius={[6, 6, 2, 2]} maxBarSize={34} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="analytics-half"><div className="card-heading"><div><h2 className="card-title">各科比例</h2><p className="card-subtitle">累積投入分布</p></div></div>{subjects.length ? <><div className="chart-wrap compact"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={subjects} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="78%" paddingAngle={4} stroke="none">{subjects.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><ChartTooltip content={<CustomChartTooltip />} /></PieChart></ResponsiveContainer></div><div className="legend-row">{subjects.slice(0, 5).map((item) => <div className="legend-item" key={item.name}><span className="legend-dot" style={{ background: item.color }} />{item.name}</div>)}</div></> : <EmptyState icon={ChartNoAxesCombined} title="尚無分析資料" text="新增讀書紀錄後，這裡會顯示各科比例。" />}</Card>
      <Card className="heatmap-card"><div className="card-heading"><div><h2 className="card-title">年度學習熱力圖</h2><p className="card-subtitle">過去 365 天的每一次累積</p></div><span className="record-tag">{new Date().getFullYear()}</span></div><div className="heatmap-scroll"><div className="heatmap">{heatDays.map((day) => <Tooltip key={day.key} label={`${day.key} · ${formatMinutes(day.minutes)}`}><div className={cn("heat-cell", day.level > 0 && `heat-${day.level}`)} /></Tooltip>)}</div></div><div className="heat-legend"><span>少</span>{[0,1,2,3,4].map((level) => <span key={level} className={cn("heat-cell", level > 0 && `heat-${level}`)} />)}<span>多</span></div></Card>
    </div>
  );
}

function CalendarPage({ sessions }: { sessions: Session[] }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first); start.setDate(start.getDate() - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  const selectedSessions = selectedDate ? sessions.filter((item) => item.date === selectedDate) : [];
  const formatMonth = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" }).format(month);

  return (
    <>
      <Card className="calendar-card">
        <div className="calendar-head"><div><h2>{formatMonth}</h2><p className="card-subtitle">點擊日期查看當天詳細紀錄</p></div><div className="calendar-controls"><Button variant="secondary" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></Button><Button variant="secondary" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>今天</Button><Button variant="secondary" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></Button></div></div>
        <div className="calendar-grid">{["日","一","二","三","四","五","六"].map((day) => <div className="weekday" key={day}>{day}</div>)}{days.map((date) => { const key = localDate(date); const items = sessions.filter((item) => item.date === key); const total = items.reduce((sum, item) => sum + item.minutes, 0); return <button key={key} className={cn("calendar-day", date.getMonth() !== month.getMonth() && "outside", key === localDate() && "today")} onClick={() => setSelectedDate(key)}><span className="day-number">{date.getDate()}</span>{total > 0 && <><strong className="day-total">{formatMinutes(total)}</strong><span className="day-subjects">{Array.from(new Set(items.map((item) => item.subject))).slice(0, 5).map((subject) => <span className="day-dot" key={subject} style={{ background: SUBJECT_COLORS[subject] || SUBJECT_COLORS.其他 }} />)}</span></>}</button>; })}</div>
      </Card>
      <Dialog open={Boolean(selectedDate)} onOpenChange={(open) => !open && setSelectedDate(null)} title={selectedDate ? `${selectedDate} 的讀書紀錄` : "讀書紀錄"} description={`當天累積 ${formatMinutes(selectedSessions.reduce((sum, item) => sum + item.minutes, 0))}`}>
        {selectedSessions.length ? <div className="records-list">{selectedSessions.map((item) => <div className="record-row" style={{ gridTemplateColumns: "38px 1fr auto" }} key={item.id}><div className="record-icon" style={{ color: SUBJECT_COLORS[item.subject] }}>{item.subject.slice(0,1)}</div><div className="record-main"><strong>{item.subject}</strong><span>{item.startTime}–{item.endTime} · {item.note || "一般學習"}</span></div><div className="record-cell" style={{ color: "white" }}>{formatMinutes(item.minutes)}</div></div>)}</div> : <EmptyState icon={CalendarDays} title="這天沒有紀錄" text="選擇有顏色標記的日期查看學習內容。" />}
      </Dialog>
    </>
  );
}

function GoalsPage({ sessions, goals, onChange }: { sessions: Session[]; goals: Goals; onChange: (goals: Goals) => void }) {
  const totals = getSessionTotals(sessions);
  const [editing, setEditing] = useState(false);
  const goalItems = [
    { key: "daily" as const, label: "每日目標", icon: Sunrise, current: totals.today, target: goals.daily },
    { key: "weekly" as const, label: "每週目標", icon: CalendarRange, current: totals.week, target: goals.weekly },
    { key: "monthly" as const, label: "每月目標", icon: Target, current: totals.month, target: goals.monthly },
  ];
  const forecast = totals.week >= goals.weekly * .6 || new Date().getDay() <= 3;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onChange({ daily: Number(data.get("daily")) * 60, weekly: Number(data.get("weekly")) * 60, monthly: Number(data.get("monthly")) * 60 });
    setEditing(false);
    toast.success("學習目標已更新");
  }

  return (
    <>
      <div className="goals-grid">{goalItems.map(({ key, label, icon: Icon, current, target }) => { const percent = Math.min(100, Math.round((current / target) * 100)); return <Card className="goal-card hoverable" key={key}><div className="card-heading"><div className="goal-card-icon"><Icon size={18} /></div><Tooltip label="編輯目標"><button className="mini-action" onClick={() => setEditing(true)}><Settings2 size={14} /></button></Tooltip></div><div className="goal-amount">{(current / 60).toFixed(1)}<span> / {(target / 60).toFixed(0)} 小時</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div><div className="goal-foot"><span>{label}</span><span>{percent}% 完成</span></div></Card>; })}</div>
      <Card className="forecast-card"><div className="forecast-icon">{forecast ? <Check size={20} /> : <Brain size={20} />}</div><div><strong>{forecast ? "照目前節奏，你有很高機率完成本週目標" : "本週進度稍微落後，建議安排一段額外專注時間"}</strong><p>{forecast ? "預估將在週六前完成，剩餘時間可以用來彈性複習。" : `本週尚需 ${formatMinutes(Math.max(0, goals.weekly - totals.week))}，可以拆成數個 25 分鐘時段。`}</p></div><span className="record-tag">依目前進度估算</span></Card>
      <Card className="card-pad" style={{ marginTop: 12 }}><div className="card-heading"><div><h2 className="card-title">目標拆解建議</h2><p className="card-subtitle">讓計畫更容易完成</p></div><Sparkles size={16} color="var(--violet-strong)" /></div><div className="stat-list"><div className="stat-line"><span>今天建議</span><strong>{formatMinutes(Math.max(0, goals.daily - totals.today))}</strong></div><div className="stat-line"><span>本週每天平均尚需</span><strong>{formatMinutes(Math.ceil(Math.max(0, goals.weekly - totals.week) / Math.max(1, 7 - (new Date().getDay() || 7))))}</strong></div><div className="stat-line"><span>建議番茄鐘次數</span><strong>{Math.ceil(Math.max(0, goals.daily - totals.today) / 25)} 回合</strong></div></div></Card>
      <Dialog open={editing} onOpenChange={setEditing} title="調整學習目標" description="輸入想要完成的時數，系統會自動重新計算進度。"><form onSubmit={submit}><div className="form-grid"><div className="form-field full"><label className="form-label">每日目標（小時）</label><input className="input" type="number" step="0.5" min="0.5" max="24" name="daily" defaultValue={goals.daily / 60} /></div><div className="form-field full"><label className="form-label">每週目標（小時）</label><input className="input" type="number" step="1" min="1" max="168" name="weekly" defaultValue={goals.weekly / 60} /></div><div className="form-field full"><label className="form-label">每月目標（小時）</label><input className="input" type="number" step="1" min="1" max="720" name="monthly" defaultValue={goals.monthly / 60} /></div><div className="form-field full"><Button type="submit" style={{ width: "100%" }}>儲存學習目標</Button></div></div></form></Dialog>
    </>
  );
}

function TaiwanJourneyPage({ sessions, account, animation, onAnimationComplete }: {
  sessions: Session[];
  account: Account;
  animation: JourneyAnimation | null;
  onAnimationComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const totals = getSessionTotals(sessions);
  const earnedKm = totals.total / 60;
  const progressKm = Math.min(TAIWAN_LOOP_KM, earnedKm);
  const progressRatio = progressKm / TAIWAN_LOOP_KM;
  const nextStageIndex = TAIWAN_ROUTE_STAGES.findIndex((stage) => stage.km > progressKm);
  const currentStageIndex = nextStageIndex < 0 ? TAIWAN_ROUTE_STAGES.length - 1 : Math.max(0, nextStageIndex - 1);
  const currentStage = TAIWAN_ROUTE_STAGES[currentStageIndex];
  const nextStage = TAIWAN_ROUTE_STAGES[Math.min(TAIWAN_ROUTE_STAGES.length - 1, currentStageIndex + 1)];
  const segmentPercent = currentStage.km === nextStage.km ? 100 : Math.round(((progressKm - currentStage.km) / (nextStage.km - currentStage.km)) * 100);
  const journeyLevel = Math.max(1, Math.floor(earnedKm / 25) + 1);
  const journeyTitle = earnedKm >= TAIWAN_LOOP_KM ? "環島完成者" : earnedKm >= 500 ? "島嶼遠征者" : earnedKm >= 100 ? "長途旅人" : earnedKm >= 10 ? "學習探險家" : "環島新手";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const travelStartedAt = performance.now();
    const canTravel = Boolean(animation && animation.toKm > animation.fromKm && !reduceMotion);
    let completionSent = false;
    let frameId = 0;

    if (animation && reduceMotion) window.setTimeout(onAnimationComplete, 0);

    function paint(now = 0) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(280, rect.width);
      const height = Math.max(440, rect.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const canvasWidth = Math.round(width * pixelRatio);
      const canvasHeight = Math.round(height * pixelRatio);
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      const time = reduceMotion ? 0 : now;

      const centerLon = 121.03;
      const centerLat = 23.596;
      const longitudeScale = Math.cos(centerLat * Math.PI / 180);
      const geoWidth = (122.01 - 120.05) * longitudeScale;
      const geoHeight = 25.29 - 21.90;
      const mapScale = Math.min(width * .62 / geoWidth, (height - 48) / geoHeight);
      const toPoint = ([longitude, latitude]: [number, number]) => ({
        x: width * .5 + (longitude - centerLon) * longitudeScale * mapScale,
        y: height * .5 - (latitude - centerLat) * mapScale,
      });
      const outline = TAIWAN_MAIN_ISLAND.map(toPoint);
      const islandCenter = toPoint([centerLon, centerLat]);
      const route = outline.slice(0, -1).map((point) => ({
        x: islandCenter.x + (point.x - islandCenter.x) * 1.055,
        y: islandCenter.y + (point.y - islandCenter.y) * 1.022,
      }));
      route.push(route[0]);

      const segmentLengths = route.slice(1).map((point, index) => Math.hypot(point.x - route[index].x, point.y - route[index].y));
      const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0);
      function pointAlongRoute(distance: number) {
        let travelled = 0;
        for (let index = 0; index < segmentLengths.length; index += 1) {
          const length = segmentLengths[index];
          if (travelled + length >= distance) {
            const ratio = length ? (distance - travelled) / length : 0;
            return {
              x: route[index].x + (route[index + 1].x - route[index].x) * ratio,
              y: route[index].y + (route[index + 1].y - route[index].y) * ratio,
            };
          }
          travelled += length;
        }
        return route[route.length - 1];
      }

      const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
      const ease = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);
      const elapsed = Math.max(0, now - travelStartedAt);
      const fromRatio = animation ? clamp01(animation.fromKm / TAIWAN_LOOP_KM) : progressRatio;
      const toRatio = animation ? clamp01(animation.toKm / TAIWAN_LOOP_KM) : progressRatio;
      let displayedRatio = progressRatio;
      let cameraZoom = 1;
      let cameraPan = 0;
      if (canTravel) {
        if (elapsed < 850) {
          const phase = ease(elapsed / 850);
          displayedRatio = fromRatio;
          cameraZoom = 1 + phase * 5;
          cameraPan = phase;
        } else if (elapsed < 3150) {
          const phase = ease((elapsed - 850) / 2300);
          displayedRatio = fromRatio + (toRatio - fromRatio) * phase;
          cameraZoom = 6;
          cameraPan = 1;
        } else if (elapsed < 4400) {
          const phase = ease((elapsed - 3150) / 1250);
          displayedRatio = toRatio;
          cameraZoom = 6 - phase * 5;
          cameraPan = 1 - phase;
        } else {
          displayedRatio = toRatio;
        }
      }
      const travelMarker = pointAlongRoute(totalLength * displayedRatio);
      const cameraFocus = {
        x: islandCenter.x + (travelMarker.x - islandCenter.x) * cameraPan,
        y: islandCenter.y + (travelMarker.y - islandCenter.y) * cameraPan,
      };

      const glowX = width * (.5 + Math.sin(time / 3200) * .025);
      const glowY = height * (.46 + Math.cos(time / 3800) * .018);
      const backgroundGlow = context.createRadialGradient(glowX, glowY, 20, glowX, glowY, Math.min(width, height) * .5);
      backgroundGlow.addColorStop(0, `rgba(139,124,246,${.10 + (Math.sin(time / 1700) + 1) * .025})`);
      backgroundGlow.addColorStop(1, "rgba(139,124,246,0)");
      context.fillStyle = backgroundGlow;
      context.fillRect(0, 0, width, height);

      // 海面上的微光與緩慢擴散波紋讓地圖保持生命感。
      context.save();
      for (let index = 0; index < 18; index += 1) {
        const seedX = ((index * 73) % 101) / 101;
        const seedY = ((index * 47) % 97) / 97;
        const drift = Math.sin(time / 1800 + index * 1.7);
        const x = 16 + seedX * (width - 32) + drift * 5;
        const y = 22 + seedY * (height - 44) + Math.cos(time / 2200 + index) * 4;
        context.beginPath();
        context.arc(x, y, index % 4 === 0 ? 1.4 : .8, 0, Math.PI * 2);
        context.fillStyle = `rgba(101,211,255,${.055 + (drift + 1) * .025})`;
        context.fill();
      }
      for (let index = 0; index < 3; index += 1) {
        const phase = ((time / 3600) + index / 3) % 1;
        context.beginPath();
        context.ellipse(islandCenter.x, islandCenter.y, mapScale * (.98 + phase * .18), mapScale * (1.72 + phase * .24), -.14, 0, Math.PI * 2);
        context.strokeStyle = `rgba(101,211,255,${(1 - phase) * .035})`;
        context.lineWidth = 1;
        context.stroke();
      }
      context.restore();

      context.save();
      context.translate(width * .5, height * .5);
      context.scale(cameraZoom, cameraZoom);
      context.translate(-cameraFocus.x, -cameraFocus.y);

      context.beginPath();
      outline.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.closePath();
      const islandFill = context.createLinearGradient(width * .3, 0, width * .7, height);
      islandFill.addColorStop(0, "rgba(101,211,255,.16)");
      islandFill.addColorStop(.55, "rgba(139,124,246,.18)");
      islandFill.addColorStop(1, "rgba(101,217,154,.08)");
      context.fillStyle = islandFill;
      context.shadowColor = "rgba(101,211,255,.14)";
      context.shadowBlur = 28 / cameraZoom;
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = `rgba(183,229,255,${.15 + (Math.sin(time / 1400) + 1) * .035})`;
      context.lineWidth = 1.5 / cameraZoom;
      context.lineJoin = "round";
      context.stroke();

      const ridgeStart = toPoint([121.43, 25.04]);
      const ridgeControlA = toPoint([121.24, 24.42]);
      const ridgeControlB = toPoint([121.18, 23.55]);
      const ridgeEnd = toPoint([120.86, 22.48]);
      context.beginPath();
      context.moveTo(ridgeStart.x, ridgeStart.y);
      context.bezierCurveTo(ridgeControlA.x, ridgeControlA.y, ridgeControlB.x, ridgeControlB.y, ridgeEnd.x, ridgeEnd.y);
      context.strokeStyle = "rgba(255,255,255,.07)";
      context.lineWidth = 8 / cameraZoom;
      context.lineCap = "round";
      context.stroke();

      const drawWholeRoute = () => {
        context.beginPath();
        route.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
        context.lineJoin = "round";
        context.lineCap = "round";
      };
      drawWholeRoute();
      context.strokeStyle = "rgba(4,5,9,.9)";
      context.lineWidth = 9 / cameraZoom;
      context.stroke();
      drawWholeRoute();
      context.setLineDash([5 / cameraZoom, 8 / cameraZoom]);
      context.lineDashOffset = -time * .018 / cameraZoom;
      context.strokeStyle = "rgba(255,255,255,.18)";
      context.lineWidth = 2 / cameraZoom;
      context.stroke();
      context.setLineDash([]);
      context.lineDashOffset = 0;

      let remainingLength = totalLength * displayedRatio;
      let marker = route[0];
      context.beginPath();
      context.moveTo(route[0].x, route[0].y);
      for (let index = 0; index < segmentLengths.length; index += 1) {
        const start = route[index];
        const end = route[index + 1];
        const length = segmentLengths[index];
        if (remainingLength >= length) {
          context.lineTo(end.x, end.y);
          marker = end;
          remainingLength -= length;
        } else {
          const ratio = length ? remainingLength / length : 0;
          marker = { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
          context.lineTo(marker.x, marker.y);
          break;
        }
      }
      context.strokeStyle = "#9c8fff";
      context.lineWidth = 5 / cameraZoom;
      context.shadowColor = "rgba(139,124,246,.75)";
      context.shadowBlur = 13;
      context.stroke();
      context.shadowBlur = 0;

      const completedLength = totalLength * displayedRatio;

      if (completedLength > 4) {
        for (let index = 0; index < 3; index += 1) {
          const phase = ((time / 2600) + index / 3) % 1;
          const particle = pointAlongRoute(completedLength * phase);
          context.beginPath();
          context.arc(particle.x, particle.y, (1.5 + phase * 1.3) / cameraZoom, 0, Math.PI * 2);
          context.fillStyle = `rgba(207,202,255,${.25 + phase * .55})`;
          context.shadowColor = "rgba(139,124,246,.9)";
          context.shadowBlur = 8;
          context.fill();
          context.shadowBlur = 0;
        }
      }

      for (let index = 0; index < 2; index += 1) {
        const pulse = ((time / 1700) + index / 2) % 1;
        context.beginPath();
        context.arc(marker.x, marker.y, (9 + pulse * 17) / cameraZoom, 0, Math.PI * 2);
        context.strokeStyle = `rgba(156,143,255,${(1 - pulse) * .38})`;
        context.lineWidth = 1.5 / cameraZoom;
        context.stroke();
      }

      context.beginPath();
      context.arc(marker.x, marker.y, 8 / cameraZoom, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.fill();
      context.beginPath();
      context.arc(marker.x, marker.y, 4 / cameraZoom, 0, Math.PI * 2);
      context.fillStyle = "#8b7cf6";
      context.fill();

      const cities = [
        ["臺北", 121.565, 25.033], ["宜蘭", 121.753, 24.757], ["花蓮", 121.606, 23.991], ["臺東", 121.147, 22.755], ["屏東", 120.744, 22.000],
        ["高雄", 120.301, 22.627], ["臺南", 120.205, 22.993], ["嘉義", 120.449, 23.480], ["臺中", 120.674, 24.147], ["新竹", 120.964, 24.804],
      ] as Array<[string, number, number]>;
      context.font = `600 ${10 / cameraZoom}px system-ui, sans-serif`;
      cities.forEach(([name, longitude, latitude]) => {
        const point = toPoint([longitude, latitude]);
        context.beginPath();
        context.arc(point.x, point.y, 2.5 / cameraZoom, 0, Math.PI * 2);
        context.fillStyle = "rgba(255,255,255,.75)";
        context.fill();
        context.fillStyle = "rgba(220,223,233,.72)";
        context.fillText(name, point.x + 7 / cameraZoom, point.y + 3 / cameraZoom);
      });
      context.restore();

      if (canTravel && elapsed < 4400) {
        const markerScreen = {
          x: width * .5 + (travelMarker.x - cameraFocus.x) * cameraZoom,
          y: height * .5 + (travelMarker.y - cameraFocus.y) * cameraZoom,
        };
        const walking = elapsed >= 850 && elapsed < 3150;
        const bounce = walking ? Math.abs(Math.sin(time / 105)) * 5 : 0;
        context.beginPath();
        context.ellipse(markerScreen.x, markerScreen.y + 12, 14, 4, 0, 0, Math.PI * 2);
        context.fillStyle = "rgba(0,0,0,.3)";
        context.fill();
        context.font = "24px system-ui, sans-serif";
        context.textAlign = "center";
        context.fillText("🚶", markerScreen.x, markerScreen.y - 8 - bounce);
        context.textAlign = "start";
      }

      if (canTravel && elapsed >= 4400 && !completionSent) {
        completionSent = true;
        window.setTimeout(onAnimationComplete, 0);
      }
    }

    function animate(now: number) {
      paint(now);
      frameId = window.requestAnimationFrame(animate);
    }

    paint(performance.now());
    if (!reduceMotion) frameId = window.requestAnimationFrame(animate);
    const observer = new ResizeObserver(() => reduceMotion && paint(performance.now()));
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [progressRatio, animation?.key, onAnimationComplete]);

  return (
    <div className="journey-layout">
      <Card className="journey-map-card">
        <div className="card-heading"><div><h2 className="card-title">臺灣環島一號線</h2><p className="card-subtitle">從臺北出發，順時針累積你的讀書里程</p></div><span className="journey-rule"><Clock3 size={12} />1 小時 = 1 公里</span></div>
        <div className="taiwan-canvas-wrap"><div className="journey-pass"><div className="journey-pass-avatar">{account.displayName.slice(0, 1).toUpperCase()}</div><div><span>環島旅人</span><strong>{account.displayName}</strong><small>Lv.{journeyLevel} · {journeyTitle}</small></div></div><span className="map-data-source">真實海岸線 · Natural Earth</span>{animation && <motion.div key={animation.key} className="journey-travel-status" initial={{ opacity: 0, y: 10, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .35 }}><span><Navigation size={10} />本次新增里程</span><strong>+{animation.addedKm.toFixed(1)} 公里</strong><small>{animation.subject}已存檔 · 正在前進</small></motion.div>}<canvas ref={canvasRef} className="taiwan-canvas" role="img" aria-label={`臺灣環島進度，已完成 ${progressKm.toFixed(1)} 公里`}><span>臺灣環島進度</span></canvas><div className="journey-location"><Navigation size={15} /><div><span>目前位置</span><strong>{progressKm >= TAIWAN_LOOP_KM ? "完成環島" : `${currentStage.city} → ${nextStage.city}`}</strong><small>{progressKm >= TAIWAN_LOOP_KM ? "恭喜回到臺北" : `這一段已完成 ${Math.max(0, segmentPercent)}%`}</small></div></div></div>
        <div className="journey-main-progress"><div className="journey-progress-copy"><span>環島完成率</span><strong>{Math.round(progressRatio * 100)}%</strong></div><div className="progress-track"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progressRatio * 100}%` }} /></div><div className="journey-scale"><span>臺北 · 0 公里</span><span>臺北 · {TAIWAN_LOOP_KM} 公里</span></div></div>
      </Card>

      <div className="journey-side">
        <div className="journey-metrics">
          <Card className="journey-stat"><Navigation size={15} /><span>累積前進</span><strong>{earnedKm.toFixed(1)}<small> 公里</small></strong></Card>
          <Card className="journey-stat"><Flag size={15} /><span>距離終點</span><strong>{Math.max(0, TAIWAN_LOOP_KM - progressKm).toFixed(1)}<small> 公里</small></strong></Card>
          <Card className="journey-stat"><Clock3 size={15} /><span>今日增加</span><strong>{(totals.today / 60).toFixed(1)}<small> 公里</small></strong></Card>
        </div>
        <Card className="route-stages-card"><div className="card-heading"><div><h2 className="card-title">環島路線</h2><p className="card-subtitle">城市節點為進度視覺化，非導航里程</p></div><MapPinned size={16} color="var(--violet-strong)" /></div><div className="route-stage-list">{TAIWAN_ROUTE_STAGES.map((stage, index) => { const done = progressKm >= stage.km; const current = index === currentStageIndex && progressKm < TAIWAN_LOOP_KM; return <div className={cn("route-stage", done && "done", current && "current")} key={`${stage.city}-${stage.km}`}><div className="route-stage-dot">{done ? <Check size={10} /> : index + 1}</div><div><strong>{stage.city}</strong><span>{stage.km.toFixed(stage.km % 1 ? 1 : 0)} 公里</span></div></div>; })}</div></Card>
      </div>
    </div>
  );
}

function AchievementsPage({ sessions, definitions }: { sessions: Session[]; definitions: AchievementDefinition[] }) {
  const metricValues = getAchievementMetricValues(sessions);
  return <div className="achievement-grid">{definitions.map((item) => { const current = metricValues[item.metric]; const unlocked = current >= item.target; const percent = Math.min(100, Math.round((current / item.target) * 100)); return <Card className={cn("achievement-card hoverable", !unlocked && "locked")} key={item.id}><div className="achievement-top"><div className="achievement-icon">{item.icon}</div><div className="achievement-status">{unlocked ? <Check size={14} /> : <LockKeyhole size={13} />}</div></div><h3>{item.title}</h3><p>{item.text}</p><div className="achievement-progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div><div className="goal-foot"><span>{unlocked ? "已解鎖" : "進行中"}</span><span>{percent}%</span></div></div></Card>; })}</div>;
}

function ProfilePage({ account, sessions, goals, achievementDefinitions, onImport, onAchievementsChange }: {
  account: Account;
  sessions: Session[];
  goals: Goals;
  achievementDefinitions: AchievementDefinition[];
  onImport: (sessions: Session[], goals?: Goals) => void;
  onAchievementsChange: (definitions: AchievementDefinition[]) => void;
}) {
  const [leaderboard, setLeaderboard] = useState(true);
  const [achievementEditorOpen, setAchievementEditorOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AchievementDefinition | null>(null);
  const totals = getSessionTotals(sessions);
  const subjects = subjectBreakdown(sessions);
  const level = Math.max(1, Math.floor(totals.total / 600) + 1);
  const currentXp = totals.total % 600;
  const completion = Math.min(100, Math.round((totals.today / 120) * 100));
  // 排行榜只比較目前瀏覽器中的真實本機帳號，不再放固定的假名字。
  const storedAccounts = withAccountRoles(readJson<Account[]>(ACCOUNTS_KEY, []));
  const rankingAccounts = storedAccounts.some((item) => item.id === account.id) ? storedAccounts : [...storedAccounts, account];
  const visibleAccounts = rankingAccounts.filter((item) => item.id !== "demo-account" || item.id === account.id);
  const leaders = rankingAccounts
    .filter((item) => item.id !== "demo-account" || item.id === account.id)
    .map((item) => {
      const accountSessions = item.id === account.id ? sessions : readJson<Session[]>(`studyTraceNextSessions:${item.id}`, []);
      return {
        id: item.id,
        name: item.displayName,
        username: item.username,
        minutes: getSessionTotals(accountSessions).week,
        streak: computeStreak(accountSessions),
        me: item.id === account.id,
      };
    })
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, "zh-Hant"))
    .map((item, index) => ({ ...item, rank: index + 1 }));

  function exportData() {
    const data = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), profile: { username: account.username, displayName: account.displayName }, goals, sessions }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `study-tracker-${localDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("備份檔案已匯出");
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as { sessions?: Session[]; goals?: Goals };
      if (!Array.isArray(data.sessions)) throw new Error("invalid");
      const safeSessions = data.sessions.filter((item) => item && typeof item.id === "string" && typeof item.minutes === "number" && typeof item.subject === "string");
      onImport(safeSessions, data.goals);
      toast.success(`已匯入 ${safeSessions.length} 筆讀書紀錄`);
    } catch {
      toast.error("無法讀取這個備份檔案");
    }
  }

  function openAchievementEditor(item?: AchievementDefinition) {
    setEditingAchievement(item || null);
    setAchievementEditorOpen(true);
  }

  function saveAchievement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const metric = String(data.get("metric")) as AchievementMetric;
    const target = metric === "early" || metric === "late" ? 1 : Number(data.get("target"));
    const nextItem: AchievementDefinition = {
      id: editingAchievement?.id || uid(),
      icon: String(data.get("icon") || "⭐").trim().slice(0, 12) || "⭐",
      title: String(data.get("title") || "").trim().slice(0, 30),
      text: String(data.get("text") || "").trim().slice(0, 100),
      metric,
      target,
    };
    if (!isValidAchievement(nextItem)) {
      toast.error("請完整填寫成就名稱、說明與有效目標");
      return;
    }
    onAchievementsChange(editingAchievement
      ? achievementDefinitions.map((item) => item.id === editingAchievement.id ? nextItem : item)
      : [...achievementDefinitions, nextItem]);
    setAchievementEditorOpen(false);
    setEditingAchievement(null);
    toast.success(editingAchievement ? "成就已更新" : "新成就已加入");
  }

  function deleteAchievement(id: string) {
    if (achievementDefinitions.length <= 1) {
      toast.error("成就系統至少需要保留一個成就");
      return;
    }
    onAchievementsChange(achievementDefinitions.filter((item) => item.id !== id));
    toast.success("成就已刪除");
  }

  function resetAchievements() {
    onAchievementsChange(DEFAULT_ACHIEVEMENTS.map((item) => ({ ...item })));
    toast.success("成就系統已恢復預設");
  }

  return (
    <>
    <div className="profile-grid">
      <Card className="profile-card"><div className="profile-avatar">{account.displayName.slice(0,1).toUpperCase()}</div><h2>{account.displayName}</h2><p className="handle">@{account.username}</p><div className="level-pill">{account.role === "admin" ? <ShieldCheck size={10} style={{ display: "inline", marginRight: 4 }} /> : <Zap size={10} style={{ display: "inline", marginRight: 4 }} />}{account.role === "admin" ? "管理者" : "一般帳號"} · 等級 {level}</div><div className="xp-block"><div className="xp-head"><span>升級進度</span><span>{currentXp} / 600 經驗值</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${(currentXp / 600) * 100}%` }} /></div></div><div className="profile-stats"><div className="profile-stat"><strong>{Math.floor(totals.total / 60)} 小時</strong><span>總時數</span></div><div className="profile-stat"><strong>{subjects[0]?.name || "—"}</strong><span>最常讀</span></div><div className="profile-stat"><strong>{completion}%</strong><span>完成率</span></div></div></Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card className="leaderboard-card"><div className="card-heading"><div><h2 className="card-title">本週排行榜</h2><p className="card-subtitle">依本機帳號的本週讀書時間排序</p></div><button className={cn("toggle", leaderboard && "on")} onClick={() => setLeaderboard((value) => !value)} aria-label="切換排行榜" /></div>{leaderboard ? <><div className="leaderboard-list">{leaders.map((item) => <div className={cn("leader-row", item.me && "me")} key={item.id}><div className="leader-rank">{item.rank === 1 ? <Crown size={14} color="var(--orange)" /> : `#${item.rank}`}</div><div className="leader-avatar">{item.name.slice(0,1)}</div><div className="leader-name"><strong>{item.name}{item.me && "（你）"}</strong><span>@{item.username} · 🔥 {item.streak} 天連續</span></div><div className="leader-hours">{formatMinutes(item.minutes)}</div></div>)}</div>{leaders.length <= 1 && <p className="leaderboard-hint">目前只有一個本機帳號；建立或匯入其他帳號後，就能比較本週排名。</p>}</> : <EmptyState icon={Medal} title="排行榜已關閉" text="你的個人學習資料不受影響，隨時可以重新開啟。" />}</Card>
        {account.role === "admin" && <Card className="card-pad admin-card"><div className="card-heading"><div><h2 className="card-title">本機帳號管理</h2><p className="card-subtitle">管理者可查看這個瀏覽器中的帳號</p></div><span className="admin-badge"><ShieldCheck size={11} />管理者</span></div><div className="admin-account-list">{visibleAccounts.map((item) => <div className="admin-account-row" key={item.id}><div className="leader-avatar">{item.displayName.slice(0,1)}</div><div className="admin-account-copy"><strong>{item.displayName}{item.id === account.id && "（你）"}</strong><span>@{item.username}</span></div><span className={cn("account-role", item.role === "admin" && "admin")}>{item.role === "admin" ? "管理者" : "一般帳號"}</span></div>)}</div><p className="leaderboard-hint">帳號與權限只保存在目前瀏覽器，不會同步到其他裝置。</p></Card>}
        {account.role === "admin" && <Card className="card-pad admin-card"><div className="card-heading"><div><h2 className="card-title">自訂成就系統</h2><p className="card-subtitle">設定會套用到所有本機帳號</p></div><div className="admin-achievement-actions"><Button variant="ghost" size="sm" onClick={resetAchievements}>恢復預設</Button><Button size="sm" onClick={() => openAchievementEditor()}><Plus size={12} />新增成就</Button></div></div><div className="admin-achievement-list">{achievementDefinitions.map((item) => <div className="admin-achievement-row" key={item.id}><div className="admin-achievement-icon">{item.icon}</div><div className="admin-achievement-copy"><strong>{item.title}</strong><span>{ACHIEVEMENT_METRIC_LABELS[item.metric]} · 目標 {item.target}</span></div><div className="admin-row-actions"><Tooltip label="編輯成就"><button className="mini-action" aria-label={`編輯 ${item.title}`} onClick={() => openAchievementEditor(item)}><Pencil size={13} /></button></Tooltip><Tooltip label="刪除成就"><button className="mini-action danger" aria-label={`刪除 ${item.title}`} onClick={() => deleteAchievement(item.id)}><Trash2 size={13} /></button></Tooltip></div></div>)}</div></Card>}
        <Card className="card-pad"><div className="card-heading"><div><h2 className="card-title">我的學習習慣</h2><p className="card-subtitle">依照目前的紀錄簡單整理</p></div><MoonStar size={16} color="var(--cyan)" /></div><div className="stat-list"><div className="stat-line"><span>主要時段</span><strong>晚上讀書較多</strong></div><div className="stat-line"><span>常讀科目</span><strong>{subjects[0]?.name || "等待資料"}</strong></div><div className="stat-line"><span>目前狀況</span><strong>目標明確 · 持續累積</strong></div></div></Card>
        <Card className="card-pad"><div className="card-heading"><div><h2 className="card-title">資料與隱私</h2><p className="card-subtitle">備份或還原本機學習資料</p></div><LockKeyhole size={15} color="var(--green)" /></div><div className="data-actions"><button className="data-action" onClick={exportData}><Download size={16} color="var(--cyan)" /><strong>匯出備份</strong><span>下載包含目標與紀錄的 JSON 檔案</span></button><label className="data-action"><Upload size={16} color="var(--violet-strong)" /><strong>匯入備份</strong><span>從先前匯出的檔案還原資料</span><input type="file" accept="application/json" hidden onChange={(event) => { void importData(event.target.files?.[0]); event.target.value = ""; }} /></label></div></Card>
      </div>
    </div>
    <Dialog open={achievementEditorOpen} onOpenChange={(open) => { setAchievementEditorOpen(open); if (!open) setEditingAchievement(null); }} title={editingAchievement ? "編輯成就" : "新增成就"} description="設定名稱、解鎖條件與需要達成的數值。">
      <form key={editingAchievement?.id || "new-achievement"} onSubmit={saveAchievement}>
        <div className="form-grid">
          <div className="form-field"><label className="form-label" htmlFor="achievementIcon">圖示</label><input className="input" id="achievementIcon" name="icon" maxLength={12} defaultValue={editingAchievement?.icon || "⭐"} required /></div>
          <div className="form-field"><label className="form-label" htmlFor="achievementTitle">成就名稱</label><input className="input" id="achievementTitle" name="title" maxLength={30} defaultValue={editingAchievement?.title || ""} placeholder="例如：十次專注" required /></div>
          <div className="form-field full"><label className="form-label" htmlFor="achievementText">成就說明</label><input className="input" id="achievementText" name="text" maxLength={100} defaultValue={editingAchievement?.text || ""} placeholder="說明達成這個成就需要完成什麼" required /></div>
          <div className="form-field"><label className="form-label" htmlFor="achievementMetric">計算方式</label><select className="select" id="achievementMetric" name="metric" defaultValue={editingAchievement?.metric || "hours"}>{Object.entries(ACHIEVEMENT_METRIC_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="form-field"><label className="form-label" htmlFor="achievementTarget">目標數值</label><input className="input" id="achievementTarget" name="target" type="number" min="0.5" max="100000" step="0.5" defaultValue={editingAchievement?.target || 1} required /><small className="form-help">早起與夜間條件會自動設為 1 次。</small></div>
          <div className="form-field full"><Button type="submit" style={{ width: "100%" }}>{editingAchievement ? "儲存成就" : "加入成就"}</Button></div>
        </div>
      </form>
    </Dialog>
    </>
  );
}

// 主元件負責切換頁面，並把目前帳號的紀錄存進 localStorage。
export function StudyApp() {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [page, setPage] = useState<PageId>("dashboard");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<Goals>({ daily: 120, weekly: 600, monthly: 2400 });
  const [achievementDefinitions, setAchievementDefinitions] = useState<AchievementDefinition[]>(DEFAULT_ACHIEVEMENTS);
  const [journeyAnimation, setJourneyAnimation] = useState<JourneyAnimation | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");

  function sessionsKey(userId: string) { return `studyTraceNextSessions:${userId}`; }
  function goalsKey(userId: string) { return `studyTraceNextGoals:${userId}`; }

  function loadAccountData(user: Account, demo = false) {
    let saved = readJson<Session[]>(sessionsKey(user.id), []);
    const legacy = readJson<Array<{ id: number; subject: string; minutes: number; focus: number; createdAt: string }>>(`studyTraceRecordsV1:${user.id}`, []);
    if (!saved.length && legacy.length) saved = legacy.map((item) => { const date = new Date(item.createdAt); const end = date.toTimeString().slice(0,5); const startDate = new Date(date.getTime() - item.minutes * 60_000); return { id: String(item.id), date: localDate(date), startTime: startDate.toTimeString().slice(0,5), endTime: end, minutes: item.minutes, subject: item.subject, tags: ["匯入"], note: `原專注程度 ${item.focus}/5` }; });
    if (!saved.length && demo) saved = createDemoSessions();
    localStorage.setItem(sessionsKey(user.id), JSON.stringify(saved));
    setSessions(saved);
    setGoals(readJson<Goals>(goalsKey(user.id), { daily: 120, weekly: 600, monthly: 2400 }));
  }

  useEffect(() => {
    const accounts = withAccountRoles(readJson<Account[]>(ACCOUNTS_KEY, []));
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    const savedAchievements = readAchievementDefinitions();
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(savedAchievements));
    setAchievementDefinitions(savedAchievements);
    const sessionId = localStorage.getItem(SESSION_KEY);
    const user = accounts.find((item) => item.id === sessionId) || null;
    if (user) { setAccount(user); loadAccountData(user, user.id === "demo-account"); }
    setReady(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!ready || !account) return;
    const welcomeKey = `studyTraceWelcome:${account.id}`;
    if (sessionStorage.getItem(welcomeKey)) return;
    sessionStorage.setItem(welcomeKey, "1");
    const hour = new Date().getHours();
    const greeting = hour < 11 ? "早安" : hour < 18 ? "午安" : "晚安";
    toast(`${greeting}，${account.displayName}`, {
      description: "今天也替自己的學習旅程前進一點吧。",
      icon: "✨",
      duration: 4200,
    });
  }, [ready, account]);

  useEffect(() => {
    if (!ready || !account) return;
    const unlocked = getUnlockedAchievements(sessions, achievementDefinitions);
    const notifiedKey = `studyTraceAchievementNotifiedV1:${account.id}`;
    const notified = readJson<string[]>(notifiedKey, []);
    const newlyUnlocked = unlocked.filter((item) => !notified.includes(item.id));
    if (!newlyUnlocked.length) return;
    localStorage.setItem(notifiedKey, JSON.stringify(Array.from(new Set([...notified, ...unlocked.map((item) => item.id)]))));
    const achievement = newlyUnlocked[0];
    const extraCount = newlyUnlocked.length - 1;
    toast.custom((toastId) => (
      <button className="achievement-unlock-toast" type="button" onClick={() => { setPage("achievements"); toast.dismiss(toastId); }}>
        <span className="achievement-toast-glow" />
        <span className="achievement-toast-icon">{achievement.icon}</span>
        <span className="achievement-toast-copy"><small>成就解鎖 · {account.displayName}</small><strong>{achievement.title}</strong><span>{achievement.text}{extraCount > 0 ? `，另外解鎖 ${extraCount} 個成就` : ""}</span></span>
        <span className="achievement-toast-action">查看</span>
      </button>
    ), { duration: 7200 });
  }, [ready, account, sessions, achievementDefinitions]);

  function auth(user: Account, demo = false) {
    setAccount(user);
    loadAccountData(user, demo);
    setJourneyAnimation(null);
    setPage("dashboard");
  }

  function saveSessions(next: Session[]) {
    if (!account) return;
    setSessions(next);
    localStorage.setItem(sessionsKey(account.id), JSON.stringify(next));
  }

  function addSession(session: Session) {
    const fromKm = Math.min(TAIWAN_LOOP_KM, getSessionTotals(sessions).total / 60);
    const toKm = Math.min(TAIWAN_LOOP_KM, fromKm + session.minutes / 60);
    saveSessions([session, ...sessions]);
    setJourneyAnimation({ key: session.id, fromKm, toKm, addedKm: session.minutes / 60, subject: session.subject });
    setPage("journey");
    toast.success("專注完成，讀書紀錄已保存", { description: `${session.subject} · ${formatMinutes(session.minutes)}` });
  }

  const finishJourneyAnimation = useCallback(() => setJourneyAnimation(null), []);

  function updateGoals(next: Goals) {
    if (!account) return;
    setGoals(next);
    localStorage.setItem(goalsKey(account.id), JSON.stringify(next));
  }

  function updateAchievementDefinitions(next: AchievementDefinition[]) {
    setAchievementDefinitions(next);
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(next));
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    setAccount(null);
    setSessions([]);
    setJourneyAnimation(null);
  }

  const pageView = useMemo(() => {
    if (!account) return null;
    if (page === "dashboard") return <DashboardPage sessions={sessions} goals={goals} onNavigate={setPage} />;
    if (page === "timer") return <TimerPage onComplete={addSession} />;
    if (page === "records") return <RecordsPage sessions={sessions} onAdd={addSession} onDelete={(id) => saveSessions(sessions.filter((item) => item.id !== id))} />;
    if (page === "analytics") return <AnalyticsPage sessions={sessions} />;
    if (page === "calendar") return <CalendarPage sessions={sessions} />;
    if (page === "journey") return <TaiwanJourneyPage sessions={sessions} account={account} animation={journeyAnimation} onAnimationComplete={finishJourneyAnimation} />;
    if (page === "goals") return <GoalsPage sessions={sessions} goals={goals} onChange={updateGoals} />;
    if (page === "achievements") return <AchievementsPage sessions={sessions} definitions={achievementDefinitions} />;
    return <ProfilePage account={account} sessions={sessions} goals={goals} achievementDefinitions={achievementDefinitions} onAchievementsChange={updateAchievementDefinitions} onImport={(items, nextGoals) => { saveSessions(items); if (nextGoals) updateGoals(nextGoals); }} />;
  }, [account, page, sessions, goals, achievementDefinitions, journeyAnimation, finishJourneyAnimation]);

  if (!ready) return <LoadingScreen />;
  if (!account) return <AuthScreen onAuth={auth} />;
  const copy = PAGE_COPY[page];
  const currentHour = new Date().getHours();
  const greeting = currentHour < 11 ? "早安" : currentHour < 18 ? "午安" : "晚安";
  const achievementValues = getAchievementMetricValues(sessions);
  const nextAchievement = achievementDefinitions.find((item) => achievementValues[item.metric] < item.target);
  const normalizedQuery = query.trim().toLowerCase();
  const pageResults = NAV_ITEMS.filter((item) => !normalizedQuery || `${item.label}${PAGE_COPY[item.id].subtitle}`.toLowerCase().includes(normalizedQuery));
  const sessionResults = [...sessions]
    .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`))
    .filter((item) => !normalizedQuery || `${item.subject}${item.note}${item.tags.join("")}${item.date}`.toLowerCase().includes(normalizedQuery))
    .slice(0, 6);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">ST</div><div className="brand-copy"><div className="brand-name">讀書足跡<span>高中生專題</span></div></div></div>
        <div className="sidebar-label">主要功能</div>
        <nav className="nav-list">{NAV_ITEMS.slice(0,5).map(({ id, label, icon: Icon, badge }) => <Tooltip key={id} label={label}><button className={cn("nav-button", page === id && "active")} onClick={() => setPage(id)}><Icon size={16} /><span>{label}</span>{badge && <span className="nav-badge">{badge}</span>}</button></Tooltip>)}</nav>
        <div className="sidebar-label">學習進度</div>
        <nav className="nav-list">{NAV_ITEMS.slice(5).map(({ id, label, icon: Icon }) => <Tooltip key={id} label={label}><button className={cn("nav-button", page === id && "active")} onClick={() => setPage(id)}><Icon size={16} /><span>{label}</span></button></Tooltip>)}</nav>
        <div className="sidebar-bottom"><div className="profile-mini"><div className="avatar">{account.displayName.slice(0,1)}</div><div><strong>{account.displayName}</strong><small>{account.role === "admin" ? "管理者 · " : ""}等級 {Math.max(1, Math.floor(getSessionTotals(sessions).total / 600) + 1)}</small></div><Tooltip label="登出"><button className="mini-action" aria-label="登出" onClick={signOut}><LogOut size={14} /></button></Tooltip></div></div>
      </aside>

      <main className="workspace">
        <div className="page-wrap">
          <div className="mobile-logo"><div className="brand-mark">ST</div>讀書足跡<span className="mobile-user-name">{account.displayName}</span></div>
          <header className="topbar">
            <div className="topbar-copy"><div className="topbar-title-row"><h1>{copy.title}</h1><span className="student-name-chip"><Sparkles size={10} />{greeting}，{account.displayName}</span></div><p>{copy.subtitle}</p></div>
            <div className="top-actions"><button className="search-box" onClick={() => setCommandOpen(true)}><Search size={13} /><span>搜尋紀錄、科目或標籤…</span><kbd className="search-shortcut">Ctrl K</kbd></button><Tooltip label="通知"><button className="icon-button" onClick={() => nextAchievement ? toast(`${account.displayName} 的下一個成就`, { description: `${nextAchievement.icon} ${nextAchievement.title} · 已完成 ${Math.min(99, Math.round((achievementValues[nextAchievement.metric] / nextAchievement.target) * 100))}%` }) : toast.success(`${account.displayName} 已解鎖全部成就！`)}><Bell size={15} /><span className="notification-dot" /></button></Tooltip><Button onClick={() => setPage("records")}><Plus size={14} /><span className="desktop-only">新增紀錄</span></Button></div>
          </header>
          <AnimatePresence mode="wait"><motion.section key={page} className="page-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .25, ease: [0.22, 1, 0.36, 1] }}>{pageView}</motion.section></AnimatePresence>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="手機版主要功能">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button className={cn("mobile-nav-button", page === id && "active")} key={id} onClick={() => setPage(id)}><Icon size={17} /><span>{label}</span></button>)}<button className="mobile-nav-button mobile-logout" aria-label="登出" onClick={signOut}><LogOut size={17} /><span>登出</span></button></nav>
      <Dialog open={commandOpen} onOpenChange={(open) => { setCommandOpen(open); if (!open) setQuery(""); }} title="快速搜尋" description="搜尋頁面、科目、標籤或學習備註。">
        <div className="command-input-wrap"><Search size={16} color="var(--muted)" /><input className="command-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="輸入關鍵字…" autoFocus /><kbd className="search-shortcut">ESC</kbd></div>
        <div className="command-results">
          {pageResults.length > 0 && <div className="command-group"><div className="command-label">前往頁面</div>{pageResults.slice(0, 5).map(({ id, label, icon: Icon }) => <button className="command-item" key={id} onClick={() => { setPage(id); setCommandOpen(false); setQuery(""); }}><span className="command-item-icon"><Icon size={14} /></span><span><strong>{label}</strong><span>{PAGE_COPY[id].subtitle}</span></span><kbd>前往</kbd></button>)}</div>}
          {sessionResults.length > 0 && <div className="command-group"><div className="command-label">讀書紀錄</div>{sessionResults.map((item) => <button className="command-item" key={item.id} onClick={() => { setPage("records"); setCommandOpen(false); setQuery(""); }}><span className="command-item-icon" style={{ color: SUBJECT_COLORS[item.subject] }}>{item.subject.slice(0,1)}</span><span><strong>{item.subject} · {formatMinutes(item.minutes)}</strong><span>{item.date} · {item.note || item.tags.join("、") || "一般學習"}</span></span><kbd>↵</kbd></button>)}</div>}
          {!pageResults.length && !sessionResults.length && <EmptyState icon={Search} title="找不到相關內容" text="試試科目名稱、日期、標籤或備註中的文字。" />}
        </div>
      </Dialog>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#15171d", border: "1px solid rgba(255,255,255,.1)", borderRadius: "12px", color: "#fff" } }} />
    </div>
  );
}
