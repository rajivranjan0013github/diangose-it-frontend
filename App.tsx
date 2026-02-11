
import React, { useState, useEffect } from 'react';
import {
  Users,
  Gamepad2,
  Smartphone,
  Crown,
  LayoutDashboard,
  CheckCircle2,
  Calendar,
  Activity,
  TrendingUp,
  Globe,
  Clock,
  ChevronDown,
  Loader2,
  List,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  UserX,
  PlayCircle,
  Timer,
  Bell,
  Send,
  Library,
  HelpCircle,
  Copy
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { fetchSummary, fetchRecentUsers, fetchPaginatedUsers, PaginatedUsersResponse, fetchUserDetails, sendNotification, sendNotificationByTopic, fetchCases, fetchCategories, fetchCasesByCategory, fetchActiveUsersByDate, fetchActiveQuizUsersByDate, ActiveUsersByDateResponse } from './api';
import { TimeRange, AnalyticsSummary, User, UserDetails, Case, Category, SendNotificationRequest } from './types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

const StatsCard = ({ title, value, icon: Icon, trend, color, subText }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {trend && (
        <p className={`text-xs mt-2 font-semibold ${trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend} <span className="text-slate-400 font-normal ml-1">{subText || 'vs last month'}</span>
        </p>
      )}
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
  </div>
);

// Helper function to show time ago
const timeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>(30);

  // State for API data
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state for User List
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const usersPerPage = 15;

  // User Details Page state
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);

  // Notification form state
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationImageUrl, setNotificationImageUrl] = useState('');
  const [notificationData, setNotificationData] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showSendByTopicModal, setShowSendByTopicModal] = useState(false);
  const [targetTopic, setTargetTopic] = useState('');

  // Cases state
  const [cases, setCases] = useState<Case[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);

  // Active Users by Date Modal state
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  const [activeUsersDate, setActiveUsersDate] = useState<string | null>(null);
  const [activeUsersData, setActiveUsersData] = useState<ActiveUsersByDateResponse | null>(null);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [activeUsersModalType, setActiveUsersModalType] = useState<'simulation' | 'quiz'>('simulation');

  // Fetch summary data when timeRange changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, usersData] = await Promise.all([
          fetchSummary(timeRange),
          fetchRecentUsers(10)
        ]);
        setSummary(summaryData);
        setUsers(usersData);
      } catch (err) {
        setError('Failed to load analytics data. Make sure the backend is running on port 3002.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [timeRange]);

  // Fetch paginated users when page changes or tab changes to userlist
  useEffect(() => {
    if (activeTab === 'userlist') {
      const loadPaginatedUsers = async () => {
        setPageLoading(true);
        try {
          const data = await fetchPaginatedUsers(currentPage, usersPerPage, activeSearchTerm);
          setAllUsers(data.users);
          setTotalPages(data.pagination.totalPages);
          setTotalUsers(data.pagination.total);
        } catch (err) {
          console.error(err);
        } finally {
          setPageLoading(false);
        }
      };
      loadPaginatedUsers();
    }
  }, [activeTab, currentPage, activeSearchTerm]);

  // Reset page when active search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm]);

  // Fetch categories when cases tab is active
  useEffect(() => {
    if (activeTab === 'cases') {
      setSelectedCategory(null); // Reset selected category when switching to cases tab
      const loadCategories = async () => {
        setCategoriesLoading(true);
        try {
          const data = await fetchCategories();
          setCategories(data);
        } catch (err) {
          console.error('Failed to fetch categories:', err);
        } finally {
          setCategoriesLoading(false);
        }
      };
      loadCategories();
    }
  }, [activeTab]);

  const handleSearch = () => {
    setActiveSearchTerm(userSearchTerm);
  };

  const handleUserClick = async (userId: string) => {
    setActiveTab('userdetails');
    setUserDetailsLoading(true);
    setSelectedUserDetails(null);
    try {
      const details = await fetchUserDetails(userId);
      setSelectedUserDetails(details);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleBackToUserList = () => {
    setActiveTab('userlist');
    setSelectedUserDetails(null);
    // Reset notification form
    setNotificationTitle('');
    setNotificationBody('');
    setNotificationImageUrl('');
    setNotificationResult(null);
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      setNotificationResult({ type: 'error', message: 'Title and body are required' });
      return;
    }

    if (!selectedUserDetails) return;

    setSendingNotification(true);
    setNotificationResult(null);

    const parseData = () => {
      if (!notificationData.trim()) return undefined;
      try {
        return JSON.parse(notificationData);
      } catch (e) {
        throw new Error('Invalid JSON format in custom data field');
      }
    };

    try {
      const dataPayload = parseData();
      await sendNotification(selectedUserDetails.user._id, {
        title: notificationTitle,
        body: notificationBody,
        imageUrl: notificationImageUrl || undefined,
        data: dataPayload,
      });

      setNotificationResult({
        type: 'success',
        message: `Notification sent successfully to ${selectedUserDetails.user.name}!`
      });

      // Clear form on success
      setNotificationTitle('');
      setNotificationBody('');
      setNotificationImageUrl('');
      setNotificationData('');

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setNotificationResult(null);
      }, 5000);
    } catch (error: any) {
      setNotificationResult({
        type: 'error',
        message: error.message || 'Failed to send notification'
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const handleNotifyByTopic = async () => {
    if (!targetTopic.trim() || !notificationTitle.trim() || !notificationBody.trim()) {
      setNotificationResult({ type: 'error', message: 'Topic, title, and body are required' });
      return;
    }

    setSendingNotification(true);
    setNotificationResult(null);

    const parseData = () => {
      if (!notificationData.trim()) return undefined;
      try {
        return JSON.parse(notificationData);
      } catch (e) {
        throw new Error('Invalid JSON format in custom data field');
      }
    };

    try {
      const dataPayload = parseData();
      await sendNotificationByTopic(targetTopic, {
        title: notificationTitle,
        body: notificationBody,
        imageUrl: notificationImageUrl || undefined,
        data: dataPayload,
      });

      setNotificationResult({
        type: 'success',
        message: `Notification sent successfully to topic: ${targetTopic}!`
      });

      // Clear form and close modal on success
      setTargetTopic('');
      setNotificationTitle('');
      setNotificationBody('');
      setNotificationImageUrl('');
      setNotificationData('');
      setShowSendByTopicModal(false);

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setNotificationResult(null);
      }, 5000);
    } catch (error: any) {
      setNotificationResult({
        type: 'error',
        message: error.message || 'Failed to send notification'
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const handleCategoryClick = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    setCasesLoading(true);
    try {
      const data = await fetchCasesByCategory(categoryName);
      setCases(data);
    } catch (err) {
      console.error('Failed to fetch cases by category:', err);
    } finally {
      setCasesLoading(false);
    }
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setCases([]);
  };

  const handleCaseClick = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setShowCaseModal(true);
  };

  const handleCloseModal = () => {
    setShowCaseModal(false);
    setSelectedCase(null);
  };

  const handleBarClick = async (data: any) => {
    if (!data || !data.date) return;

    setActiveUsersModalType('simulation');
    setActiveUsersDate(data.date);
    setShowActiveUsersModal(true);
    setActiveUsersLoading(true);

    try {
      const result = await fetchActiveUsersByDate(data.date);
      setActiveUsersData(result);
    } catch (err) {
      console.error('Failed to fetch active users:', err);
      setActiveUsersData(null);
    } finally {
      setActiveUsersLoading(false);
    }
  };

  const handleQuizBarClick = async (data: any) => {
    if (!data || !data.date) return;

    setActiveUsersModalType('quiz');
    setActiveUsersDate(data.date);
    setShowActiveUsersModal(true);
    setActiveUsersLoading(true);

    try {
      const result = await fetchActiveQuizUsersByDate(data.date);
      setActiveUsersData(result);
    } catch (err) {
      console.error('Failed to fetch active quiz users:', err);
      setActiveUsersData(null);
    } finally {
      setActiveUsersLoading(false);
    }
  };

  const handleCloseActiveUsersModal = () => {
    setShowActiveUsersModal(false);
    setActiveUsersDate(null);
    setActiveUsersData(null);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
          <div className="text-rose-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Connection Error</h2>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white hidden lg:flex flex-col fixed h-full border-r border-slate-800">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Diagnose <span className="text-indigo-400">It</span></h1>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Analytics Hub' },
              { id: 'userlist', icon: List, label: 'User List' },
              { id: 'cases', icon: Library, label: 'Cases' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8">
        {/* Header - Only show on Analytics Hub */}
        {activeTab === 'overview' && (
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Real-time Performance</h2>
              <p className="text-slate-500">Monitoring user activity cycles across {timeRange} days</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Time Range Selector */}
              <div className="relative inline-block text-left">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm hover:border-indigo-500 transition-colors">
                  <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(Number(e.target.value) as TimeRange)}
                    className="appearance-none bg-transparent pr-8 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </header>
        )}

        {loading || !summary ? (
          <LoadingSpinner />
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Core Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard title="Total Users" value={summary.totalUsers} icon={Users} color="bg-indigo-600" />
                  <StatsCard title="Today's Solved" value={summary.todaySolvedCases} icon={CheckCircle2} color="bg-emerald-500" />
                  <StatsCard title="Premium Tier" value={summary.premiumUsers} icon={Crown} color="bg-amber-500" />
                  <StatsCard title="Conversion" value={`${summary.conversionRate}%`} icon={TrendingUp} color="bg-rose-500" />
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {/* Join Graph */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        User Joins
                      </h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={summary.joinTrend}>
                          <defs>
                            <linearGradient id="colorJoins" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val.split('-').slice(2).join('/')}
                            minTickGap={timeRange > 30 ? 40 : 20}
                          />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelClassName="font-bold text-slate-800 text-xs"
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            name="New Users"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorJoins)"
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gameplay Activity Graph */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-500" />
                        Simulation Activity
                      </h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.gameplayTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val.split('-').slice(2).join('/')}
                            minTickGap={timeRange > 30 ? 40 : 20}
                          />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100">
                                    <p className="font-bold text-slate-800 text-xs mb-2">{label}</p>
                                    <p className="text-sm text-emerald-600">
                                      <span className="font-bold">{payload[0]?.value}</span> Sessions
                                    </p>
                                    <p className="text-sm text-indigo-600">
                                      <span className="font-bold">{payload[0]?.payload?.uniqueUsers || 0}</span> Unique Users
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="count"
                            name="Sessions"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1500}
                            cursor="pointer"
                            onClick={(data) => handleBarClick(data)}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-2">Click on a bar to view active users for that day</p>
                  </div>

                  {/* Quiz Activity Graph */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-indigo-500" />
                        Quiz Activity
                      </h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.quizTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val.split('-').slice(2).join('/')}
                            minTickGap={timeRange > 30 ? 40 : 20}
                          />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100">
                                    <p className="font-bold text-slate-800 text-xs mb-2">{label}</p>
                                    <p className="text-sm text-indigo-600">
                                      <span className="font-bold">{payload[0]?.value}</span> Attempts
                                    </p>
                                    <p className="text-sm text-emerald-600">
                                      <span className="font-bold">{payload[0]?.payload?.uniqueUsers || 0}</span> Unique Users
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="count"
                            name="Attempts"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1500}
                            cursor="pointer"
                            onClick={(data) => handleQuizBarClick(data)}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-2">Daily quiz attempts and participation</p>
                  </div>

                  {/* Platform Distribution */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Platform Distribution</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={summary.platformSplit}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {summary.platformSplit.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Android</span>
                        <span className="font-bold text-slate-700">{summary.platformSplit[0]?.value || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-2"><Smartphone className="w-4 h-4 rotate-180" /> iOS</span>
                        <span className="font-bold text-slate-700">{summary.platformSplit[1]?.value || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global Reach */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-800">Global Reach</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {summary.timezoneDistribution.map((tz, idx) => (
                      <div key={tz.name} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-slate-700 truncate">{tz.name}</p>
                          <p className="text-sm font-bold text-indigo-600 ml-2">{tz.value}</p>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${(tz.value / summary.totalUsers) * 100}%`,
                              backgroundColor: COLORS[idx % COLORS.length]
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}



            {activeTab === 'userlist' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <List className="w-5 h-5 text-indigo-500" />
                        All Users
                      </h3>
                      <p className="text-xs text-slate-400 border-l border-slate-200 pl-2 ml-2">
                        {pageLoading ? 'Loading...' : `${totalUsers} users`}
                      </p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <div className="relative group w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search by name or email..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        />
                        {userSearchTerm && (
                          <button
                            onClick={() => {
                              setUserSearchTerm('');
                              setActiveSearchTerm('');
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={handleSearch}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                      >
                        Search
                      </button>
                      <button
                        onClick={() => setShowSendByTopicModal(true)}
                        className="flex items-center gap-2 border-2 border-indigo-600 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors whitespace-nowrap"
                      >
                        <Send className="w-4 h-4" />
                        Send by Topic
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">User</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Platform</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Cases</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map(u => (
                          <tr
                            key={u._id}
                            onClick={() => handleUserClick(u._id)}
                            className="border-b border-slate-50 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center text-xs font-bold">
                                  {u.name?.[0] || '?'}
                                </div>
                                <span className="text-sm font-medium text-slate-800">{u.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-500">{u.email}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${u.platform === 'android' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {u.platform === 'android' ? 'Android' : (u.platform === 'ios' ? 'iOS' : 'Other')}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-bold text-indigo-600">{(u as any).casesPlayed || 0}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-500">{timeAgo(u.createdAt)}</td>
                            <td className="py-3 px-4">
                              {u.isPremium ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                  <Crown className="w-3 h-3" /> Premium
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Free</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      Showing <span className="font-bold text-slate-700">{(currentPage - 1) * usersPerPage + 1}</span> to{' '}
                      <span className="font-bold text-slate-700">{Math.min(currentPage * usersPerPage, totalUsers)}</span> of{' '}
                      <span className="font-bold text-slate-700">{totalUsers}</span> users
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || pageLoading}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                ? 'bg-indigo-600 text-white'
                                : 'hover:bg-slate-100 text-slate-600'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || pageLoading}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Cases Page */}
        {activeTab === 'cases' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {!selectedCategory ? (
              /* Categories View */
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Library className="w-6 h-6 text-indigo-500" />
                  <h3 className="font-bold text-slate-800 text-xl">Case Categories</h3>
                  <p className="text-xs text-slate-400 border-l border-slate-200 pl-3 ml-3">
                    {categoriesLoading ? 'Loading...' : `${categories.length} categories`}
                  </p>
                </div>

                {categoriesLoading ? (
                  <LoadingSpinner />
                ) : categories.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Library className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium text-lg">No categories available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => handleCategoryClick(category.name)}
                        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-8 hover:shadow-xl hover:border-indigo-400 hover:scale-105 transition-all duration-300 group text-left"
                      >
                        {/* Category Icon */}
                        <div className="mb-4">
                          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Library className="w-8 h-8 text-white" />
                          </div>
                        </div>

                        {/* Category Info */}
                        <h4 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">
                          {category.name}
                        </h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-indigo-600">
                            {category.count}
                          </span>
                          <span className="text-sm text-slate-500 font-medium">
                            {category.count === 1 ? 'case' : 'cases'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Cases by Category View */
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                {/* Back Button */}
                <button
                  onClick={handleBackToCategories}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors group mb-6"
                >
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  Back to Categories
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <Gamepad2 className="w-6 h-6 text-indigo-500" />
                  <h3 className="font-bold text-slate-800 text-xl">{selectedCategory}</h3>
                  <p className="text-xs text-slate-400 border-l border-slate-200 pl-3 ml-3">
                    {casesLoading ? 'Loading...' : `${cases.length} cases`}
                  </p>
                </div>

                {casesLoading ? (
                  <LoadingSpinner />
                ) : cases.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Gamepad2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium text-lg">No cases in this category</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cases.map((caseItem) => (
                      <button
                        key={caseItem._id}
                        onClick={() => handleCaseClick(caseItem)}
                        className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all duration-300 group text-left cursor-pointer"
                      >
                        {/* Case Image */}
                        <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100 overflow-hidden">
                          {caseItem.imageUrl ? (
                            <img
                              src={caseItem.imageUrl}
                              alt={caseItem.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`${caseItem.imageUrl ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}>
                            <Gamepad2 className="w-16 h-16 text-indigo-300" />
                          </div>
                        </div>

                        {/* Case Info */}
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono font-bold text-white bg-indigo-600 px-2 py-1 rounded-md">
                              {caseItem.caseId}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-indigo-600 transition-colors">
                            {caseItem.title}
                          </h4>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* User Details Page */}
        {activeTab === 'userdetails' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Back Button */}
            <button
              onClick={handleBackToUserList}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to User List
            </button>

            {userDetailsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : selectedUserDetails ? (
              <div className="space-y-6">
                {/* User Header Card */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-2xl shadow-lg text-white">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold">
                      {selectedUserDetails.user.name[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold mb-2">{selectedUserDetails.user.name}</h2>
                      <p className="text-white/80 mb-4">{selectedUserDetails.user.email}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                          {selectedUserDetails.user.platform === 'android' ? '📱 Android' : '🍎 iOS'}
                        </span>
                        {selectedUserDetails.user.isPremium && (
                          <span className="text-sm bg-amber-500/30 px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                            <Crown className="w-4 h-4" /> Premium User
                          </span>
                        )}
                        <span className="text-sm text-white/70">
                          👤 {selectedUserDetails.user.gender}
                        </span>
                        <span className="text-sm text-white/70">
                          🌍 {selectedUserDetails.user.timezone || 'Unknown timezone'}
                        </span>
                        <span className="text-sm text-white/70">
                          📅 Joined {timeAgo(selectedUserDetails.user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl border border-indigo-200 shadow-sm">
                    <div className="flex items-center gap-3 text-indigo-600 mb-3">
                      <div className="p-3 bg-indigo-200 rounded-xl">
                        <PlayCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold uppercase">Total Games</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">{selectedUserDetails.stats.totalGames}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200 shadow-sm">
                    <div className="flex items-center gap-3 text-emerald-600 mb-3">
                      <div className="p-3 bg-emerald-200 rounded-xl">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold uppercase">Completed</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">{selectedUserDetails.stats.completedGames}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border border-amber-200 shadow-sm">
                    <div className="flex items-center gap-3 text-amber-600 mb-3">
                      <div className="p-3 bg-amber-200 rounded-xl">
                        <Activity className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold uppercase">In Progress</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">{selectedUserDetails.stats.inProgressGames}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 shadow-sm">
                    <div className="flex items-center gap-3 text-purple-600 mb-3">
                      <div className="p-3 bg-purple-200 rounded-xl">
                        <Timer className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold uppercase">Total Time</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">{selectedUserDetails.stats.totalTimeMinutes}m</p>
                  </div>
                </div>

                {/* Send Notification Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Send Push Notification</h3>
                      <p className="text-sm text-slate-500">Send a custom notification to this user's device</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Title Input */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Notification Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={notificationTitle}
                        onChange={(e) => setNotificationTitle(e.target.value)}
                        placeholder="e.g., New Case Available!"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        disabled={sendingNotification}
                      />
                    </div>

                    {/* Body Input */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Message Body <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={notificationBody}
                        onChange={(e) => setNotificationBody(e.target.value)}
                        placeholder="e.g., A new medical case matching your interests is now available."
                        rows={3}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
                        disabled={sendingNotification}
                      />
                    </div>

                    {/* Image URL Input (Optional) */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Image URL <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="url"
                        value={notificationImageUrl}
                        onChange={(e) => setNotificationImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        disabled={sendingNotification}
                      />
                    </div>

                    {/* Custom Data Input (Optional) */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Custom Data (JSON) <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={notificationData}
                        onChange={(e) => setNotificationData(e.target.value)}
                        placeholder='{"key": "value", "screen": "details"}'
                        rows={2}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 font-mono resize-none"
                        disabled={sendingNotification}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Must be a valid JSON object. Values should be strings.</p>
                    </div>

                    {/* Result Message */}
                    {notificationResult && (
                      <div className={`p-4 rounded-xl border-2 ${notificationResult.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          {notificationResult.type === 'success' ? '✓' : '✗'} {notificationResult.message}
                        </p>
                      </div>
                    )}

                    {/* Send Button */}
                    <button
                      onClick={handleSendNotification}
                      disabled={sendingNotification || !notificationTitle.trim() || !notificationBody.trim()}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {sendingNotification ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Notification
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Gameplay History */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Gamepad2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    Gameplay History
                    <span className="text-sm font-normal text-slate-400 ml-auto">
                      {selectedUserDetails.gameplays.length} {selectedUserDetails.gameplays.length === 1 ? 'session' : 'sessions'}
                    </span>
                  </h3>

                  {selectedUserDetails.gameplays.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <UserX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium text-lg">No gameplay history yet</p>
                      <p className="text-slate-400 text-sm mt-2">This user hasn't started any games</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Case ID</th>
                              <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                              <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Started</th>
                              <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Completed</th>
                              <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Duration</th>
                              <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedUserDetails.gameplays.map((game, idx) => (
                              <tr key={game._id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/50 transition-colors`}>
                                <td className="py-4 px-6">
                                  <span className="text-xs font-mono text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg font-semibold">
                                    {game.caseId ? game.caseId.substring(0, 8) : 'N/A'}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${game.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {game.status === 'completed' ? '✓ Completed' : '⏳ In Progress'}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-700">
                                      {new Date(game.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">
                                      {new Date(game.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  {game.completedAt ? (
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-slate-700">
                                        {new Date(game.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                      <span className="text-xs text-slate-400 font-medium">
                                        {new Date(game.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-400 font-medium">-</span>
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <span className="text-sm font-bold text-indigo-600">
                                    {game.duration || '-'}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="text-lg font-bold text-slate-800">
                                    {game.score}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl text-center shadow-sm border border-slate-100">
                <div className="text-rose-500 text-6xl mb-4">⚠️</div>
                <p className="text-slate-500 text-lg font-medium">Failed to load user details</p>
                <button
                  onClick={handleBackToUserList}
                  className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-semibold"
                >
                  Back to User List
                </button>
              </div>
            )}
          </div>
        )}

        {/* Case Details Modal */}
        {showCaseModal && selectedCase && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={handleCloseModal}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5" />
                    Case Details
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">

                {/* Case ID */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Case ID</h3>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors group">
                    <span className="flex-1 font-mono text-sm font-bold text-slate-800">
                      {selectedCase.caseId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedCase.caseId, 'Case ID')}
                      className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      title="Copy Case ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Title</h3>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors group">
                    <span className="flex-1 text-sm font-semibold text-slate-800 leading-relaxed">
                      {selectedCase.title}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedCase.title, 'Title')}
                      className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      title="Copy Title"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Chief Complaint</h3>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors group">
                    <span className="flex-1 text-sm font-semibold text-slate-800 leading-relaxed">
                      {selectedCase.chiefComplaint}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedCase.chiefComplaint, 'Chief Complaint')}
                      className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      title="Copy Chief Complaint"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Image URL */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Image URL</h3>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors group">
                    <span className="flex-1 text-sm font-mono text-slate-600 break-all">
                      {selectedCase.imageUrl || 'No image URL available'}
                    </span>
                    {selectedCase.imageUrl && (
                      <button
                        onClick={() => copyToClipboard(selectedCase.imageUrl || '', 'Image URL')}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex-shrink-0"
                        title="Copy Image URL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Category</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block bg-indigo-100 text-indigo-700 font-semibold px-4 py-2 rounded-lg">
                      {selectedCase.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-slate-50 p-6 rounded-b-3xl border-t border-slate-200">
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-2.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Notification by Topic Modal */}
        {showSendByTopicModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={() => setShowSendByTopicModal(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Send by FCM Topic
                  </h2>
                  <button
                    onClick={() => setShowSendByTopicModal(false)}
                    className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    FCM Topic <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={targetTopic}
                    onChange={(e) => setTargetTopic(e.target.value)}
                    placeholder="e.g., all_users, premium_users"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Notification Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="e.g., New Case Available!"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Notification Body <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={notificationBody}
                    onChange={(e) => setNotificationBody(e.target.value)}
                    placeholder="Describe the notification content..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={notificationImageUrl}
                    onChange={(e) => setNotificationImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Custom Data (JSON) (Optional)
                  </label>
                  <textarea
                    value={notificationData}
                    onChange={(e) => setNotificationData(e.target.value)}
                    placeholder='{"key": "value", "screen": "home"}'
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Must be a valid JSON object. All values should be strings.</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-slate-50 p-6 rounded-b-3xl border-t border-slate-200">
                <button
                  onClick={handleNotifyByTopic}
                  disabled={sendingNotification || !targetTopic.trim() || !notificationTitle.trim() || !notificationBody.trim()}
                  className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingNotification ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Notification
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Users by Date Modal */}
        {showActiveUsersModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={handleCloseActiveUsersModal}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`sticky top-0 bg-gradient-to-r ${activeUsersModalType === 'simulation' ? 'from-emerald-600 to-teal-600' : 'from-indigo-600 to-purple-600'} p-6 rounded-t-3xl`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {activeUsersModalType === 'simulation' ? <Users className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
                      {activeUsersModalType === 'simulation' ? 'Active Users (Simulation)' : 'Active Users (Quiz)'}
                    </h2>
                    <p className="text-sm text-white/80 mt-1">
                      {activeUsersDate && new Date(activeUsersDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseActiveUsersModal}
                    className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeUsersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  </div>
                ) : activeUsersData && activeUsersData.users.length > 0 ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        <span className={`font-bold ${activeUsersModalType === 'simulation' ? 'text-emerald-600' : 'text-indigo-600'}`}>{activeUsersData.count}</span> unique users {activeUsersModalType === 'simulation' ? 'played simulations' : 'attempted quizzes'} on this day
                      </p>
                    </div>
                    <div className="space-y-3">
                      {activeUsersData.users.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer"
                          onClick={() => {
                            handleCloseActiveUsersModal();
                            handleUserClick(user._id);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                              {user.name?.[0] || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-lg font-bold ${activeUsersModalType === 'simulation' ? 'text-emerald-600' : 'text-indigo-600'}`}>{user.gamesPlayedOnDate}</p>
                              <p className="text-xs text-slate-500">{activeUsersModalType === 'simulation' ? 'sessions' : 'attempts'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${user.platform === 'android'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-blue-50 text-blue-600'
                                }`}>
                                {user.platform === 'android' ? 'Android' : 'iOS'}
                              </span>
                              {user.isPremium && (
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                  <Crown className="w-3 h-3" /> Premium
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <UserX className="w-12 h-12 mb-4" />
                    <p className="text-lg font-semibold">No active users</p>
                    <p className="text-sm">No users played games on this day</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-slate-50 p-6 rounded-b-3xl border-t border-slate-200">
                <button
                  onClick={handleCloseActiveUsersModal}
                  className={`w-full bg-gradient-to-r ${activeUsersModalType === 'simulation' ? 'from-emerald-600 to-teal-600' : 'from-indigo-600 to-purple-600'} text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
