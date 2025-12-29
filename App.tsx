import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  List, 
  History, 
  BarChart2, 
  BrainCircuit, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Target,
  ArrowRight,
  Download,
  Moon,
  Sun
} from 'lucide-react';
import { Decision, DecisionStatus, ViewState, Insight } from './types';
import { generateInsights, getConfidenceColor, formatDate, daysUntil, exportToCSV } from './utils';
import StatCard from './components/StatCard';
import { CalibrationChart, OutcomeChart, TimelineChart } from './components/Charts';
import { useTheme } from './contexts/ThemeContext';

// --- MAIN COMPONENT ---

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [view, setView] = useState<ViewState>('dashboard');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [form, setForm] = useState({
    title: '',
    prediction: '',
    confidence: 50,
    assumptions: '',
    preMortem: '',
    targetDate: '',
  });

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('decision_receipts_data');
    if (saved) {
      setDecisions(JSON.parse(saved));
    }
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    localStorage.setItem('decision_receipts_data', JSON.stringify(decisions));
    setInsights(generateInsights(decisions));
  }, [decisions]);

  const handleCreate = (newDecision: Decision) => {
    setDecisions(prev => [newDecision, ...prev]);
    setView('active');
  };

  const handleResolve = (id: string, outcome: Decision['outcome'], notes: string) => {
    setDecisions(prev => prev.map(d => 
      d.id === id 
        ? { ...d, status: 'completed', outcome, outcomeNotes: notes, resolvedAt: Date.now() } 
        : d
    ));
  };

  const handleEdit = (decision: Decision) => {
    setEditingDecision(decision);
    setForm({
      title: decision.title,
      prediction: decision.prediction,
      confidence: decision.confidence,
      assumptions: decision.assumptions,
      preMortem: decision.preMortem,
      targetDate: new Date(decision.targetDate).toISOString().split('T')[0],
    });
  };

  const handleUpdate = (updatedData: Partial<Decision>) => {
    if (!editingDecision) return;
    
    setDecisions(prev => prev.map(d => 
      d.id === editingDecision.id 
        ? { ...d, ...updatedData } 
        : d
    ));
    setEditingDecision(null);
    // Reset form
    setForm({
      title: '',
      prediction: '',
      confidence: 50,
      assumptions: '',
      preMortem: '',
      targetDate: '',
    });
  };

  const handleCancelEdit = () => {
    setEditingDecision(null);
    setForm({
      title: '',
      prediction: '',
      confidence: 50,
      assumptions: '',
      preMortem: '',
      targetDate: '',
    });
  };

  // --- SUB-VIEWS ---

  const SidebarItem = ({ id, icon, label }: { id: ViewState, icon: React.ReactNode, label: string }) => (
    <button 
      onClick={() => setView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors text-sm font-medium
        ${view === id 
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
    >
      {icon}
      {label}
    </button>
  );

  const renderDashboard = () => {
    const activeCount = decisions.filter(d => d.status === 'active').length;
    const completedCount = decisions.filter(d => d.status === 'completed').length;
    const successRate = completedCount > 0 
      ? Math.round((decisions.filter(d => d.outcome === 'success').length / completedCount) * 100) 
      : 0;

    return (
      <div className="space-y-8">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track your prediction calibration and decision outcomes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Active Decisions" 
            value={activeCount} 
            icon={<Target size={20} />}
            color="blue"
            trend="Pending outcomes"
          />
          <StatCard 
            title="Decision History" 
            value={completedCount} 
            icon={<History size={20} />}
            color="purple"
            trend="Completed receipts"
          />
          <StatCard 
            title="Prediction Accuracy" 
            value={`${successRate}%`} 
            icon={<TrendingUp size={20} />}
            color="green"
            trend="Overall success rate"
          />
        </div>

        {/* Insights Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {decisions.length === 0 ? (
            /* Empty State - 3-Step Onboarding */
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 text-center">
                Start Tracking Your Calibration
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 text-center max-w-2xl mx-auto">
                Build better judgment by tracking how well your confidence matches reality.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Step 1 */}
                <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl mb-3">📝</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    1. Record a Decision
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Log what you're deciding and set your confidence level (50-99%)
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl mb-3">🎯</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    2. Make Your Prediction
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Specify what outcome you expect and when you'll know the result
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl mb-3">📊</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    3. Track Your Accuracy
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Update outcomes and see if you're overconfident, underconfident, or well-calibrated
                  </p>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setView('new')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Add Your First Decision
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2">
               <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BrainCircuit size={20} className="text-blue-600 dark:text-blue-400"/>
                      Cognitive Insights
                    </h3>
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full font-medium">Beta</span>
                  </div>

                  <div className="space-y-4">
                    {insights.length > 0 ? insights.map((insight, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                        insight.type === 'positive' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-400' :
                        insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 dark:border-amber-400' :
                        'bg-slate-50 dark:bg-slate-700/50 border-slate-400 dark:border-slate-500'
                      }`}>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{insight.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{insight.message}</p>
                      </div>
                    )) : (
                       <p className="text-slate-500 dark:text-slate-400 text-sm italic">Log more decisions to generate behavioral insights.</p>
                    )}
                  </div>
               </div>
            </div>
          )}

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 h-full">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {decisions.slice(0, 4).map(d => (
                  <div key={d.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                    <div className={`w-2 h-2 mt-2 rounded-full ${d.status === 'active' ? 'bg-blue-500 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{d.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(d.createdAt)} • {d.status}</p>
                    </div>
                  </div>
                ))}
                {decisions.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNewDecision = () => {
    const isEditMode = !!editingDecision;
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isEditMode) {
        // Update existing decision
        handleUpdate({
          title: form.title,
          prediction: form.prediction,
          confidence: form.confidence,
          assumptions: form.assumptions,
          preMortem: form.preMortem,
          targetDate: new Date(form.targetDate).getTime(),
        });
      } else {
        // Create new decision
        const newDecision: Decision = {
          id: crypto.randomUUID(),
          title: form.title,
          context: '', // Simplified for this demo
          prediction: form.prediction,
          confidence: form.confidence,
          assumptions: form.assumptions,
          preMortem: form.preMortem,
          tags: [],
          createdAt: Date.now(),
          targetDate: new Date(form.targetDate).getTime(),
          status: 'active',
          outcome: null,
          outcomeNotes: '',
          resolvedAt: null,
        };
        handleCreate(newDecision);
        // Reset form
        setForm({
          title: '',
          prediction: '',
          confidence: 50,
          assumptions: '',
          preMortem: '',
          targetDate: '',
        });
      }
    };

    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditMode ? 'Edit Decision Receipt' : 'New Decision Receipt'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {isEditMode ? 'Update your decision details.' : 'Capture your mental state before the die is cast.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Decision Title</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g., Should we migrate to Next.js?"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prediction</label>
              <textarea 
                required
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="What specifically do you expect to happen?"
                value={form.prediction}
                onChange={e => setForm({...form, prediction: e.target.value})}
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-600">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confidence Level</label>
                <span className={`text-sm font-bold px-2 py-1 rounded ${getConfidenceColor(form.confidence)}`}>
                  {form.confidence}%
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                value={form.confidence}
                onChange={e => setForm({...form, confidence: Number(e.target.value)})}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                0% = Impossible, 50% = Coin Flip, 100% = Certainty
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Key Assumptions</label>
            <textarea 
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="What must be true for this to work?"
              value={form.assumptions}
              onChange={e => setForm({...form, assumptions: e.target.value})}
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
            <label className="block text-sm font-medium text-amber-900 dark:text-amber-400 mb-1 flex items-center gap-2">
              <AlertCircle size={16}/> Pre-Mortem
            </label>
            <textarea 
              rows={2}
              className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Imagine it's 6 months later and this decision failed. Why did it happen?"
              value={form.preMortem}
              onChange={e => setForm({...form, preMortem: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Review Date</label>
            <input 
              required
              type="date" 
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.targetDate}
              onChange={e => setForm({...form, targetDate: e.target.value})}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={isEditMode ? handleCancelEdit : () => setView('dashboard')} 
              className="px-6 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium shadow-sm transition-all transform active:scale-95"
            >
              {isEditMode ? 'Update Decision' : 'Create Receipt'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderList = (status: DecisionStatus) => {
    const items = decisions.filter(d => d.status === status).sort((a, b) => b.createdAt - a.createdAt);
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {status === 'active' ? 'Active Decisions' : 'Decision History'}
          </h2>
          {status === 'active' && (
            <button onClick={() => setView('new')} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              + Add New
            </button>
          )}
        </div>

        <div className="grid gap-4">
          {items.length === 0 ? (
             <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
               <p className="text-slate-400">No {status} decisions found.</p>
               {status === 'active' && <button onClick={() => setView('new')} className="mt-2 text-blue-600 dark:text-blue-400 font-medium">Create one now</button>}
             </div>
          ) : (
            items.map(d => (
              <div key={d.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{d.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Created {formatDate(d.createdAt)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getConfidenceColor(d.confidence)}`}>
                    {d.confidence}% Confident
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Prediction</p>
                    <p className="text-slate-800 dark:text-slate-200 text-sm">{d.prediction}</p>
                  </div>
                  {d.outcomeNotes && (
                     <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-1">Outcome Notes</p>
                      <p className="text-slate-800 dark:text-slate-200 text-sm">{d.outcomeNotes}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <History size={14} />
                    {status === 'active' ? daysUntil(d.targetDate) : `Resolved ${formatDate(d.resolvedAt || 0)}`}
                  </div>
                  
                  {status === 'active' ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          handleEdit(d);
                          setView('new');
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-xs font-bold transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleResolve(d.id, 'success', prompt('What actually happened?') || 'Success')}
                        className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md text-xs font-bold transition-colors"
                      >
                        It Happened
                      </button>
                      <button 
                        onClick={() => handleResolve(d.id, 'failure', prompt('What actually happened?') || 'Failed')}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md text-xs font-bold transition-colors"
                      >
                        Failed
                      </button>
                    </div>
                  ) : (
                    <span className={`text-sm font-bold ${
                      d.outcome === 'success' ? 'text-green-600 dark:text-green-400' : 
                      d.outcome === 'failure' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {d.outcome?.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    return (
      <div className="space-y-8">
         <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calibration Analysis</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Are you as good as you think you are?</p>
            </div>
            <button 
              onClick={() => exportToCSV(decisions)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium shadow-sm transition-all"
              disabled={decisions.length === 0}
            >
              <Download size={18} />
              Export CSV
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-6">Confidence vs. Reality Curve</h3>
            <CalibrationChart decisions={decisions} />
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-6">Outcome Distribution</h3>
             <OutcomeChart decisions={decisions} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-6">Decision Timeline & Calibration Trend</h3>
          <TimelineChart decisions={decisions} />
          <p className="text-xs text-slate-400 mt-4 text-center">
            Track how your prediction accuracy evolves over time. Rising trend = improving calibration.
          </p>
        </div>

        <div className="bg-blue-900 dark:bg-blue-950 text-white p-8 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold mb-2">Improve your judgment</h3>
            <p className="text-blue-200 dark:text-blue-300 max-w-md">Reviewing past decisions is the single most effective way to reduce bias and improve future outcomes.</p>
          </div>
          <button onClick={() => setView('history')} className="bg-white dark:bg-slate-200 text-blue-900 dark:text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 dark:hover:bg-slate-300 transition-colors shadow-lg">
            Review Completed Decisions
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 fixed h-full hidden md:flex flex-col z-10">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
            <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">Decision<br/>Receipts</span>
          </div>
        </div>
        
        <nav className="p-4 flex-1 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-2">Menu</p>
          <SidebarItem id="dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <SidebarItem id="new" icon={<PlusCircle size={18} />} label="New Receipt" />
          
          <p className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-6">Tracking</p>
          <SidebarItem id="active" icon={<List size={18} />} label="Active Decisions" />
          <SidebarItem id="history" icon={<CheckCircle2 size={18} />} label="Completed" />
          
          <p className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-6">Analysis</p>
          <SidebarItem id="analytics" icon={<BarChart2 size={18} />} label="Calibration" />
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </span>
            {theme === 'light' ? <Moon size={18} className="text-slate-600 dark:text-slate-400" /> : <Sun size={18} className="text-slate-400" />}
          </button>
          
          <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-xs font-medium text-slate-600 dark:text-slate-300">System Status</span>
            </div>
            <p className="text-xs text-slate-400">Local storage active.<br/>Data persists in browser.</p>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 z-20 flex justify-between items-center">
         <span className="font-bold text-slate-900 dark:text-white">Decision Receipts</span>
         <button onClick={() => setView('dashboard')} className="p-2 bg-slate-100 dark:bg-slate-700 rounded">
           <LayoutDashboard size={20} className="text-slate-900 dark:text-white" />
         </button>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-5xl mx-auto">
          {view === 'dashboard' && renderDashboard()}
          {view === 'new' && renderNewDecision()}
          {view === 'active' && renderList('active')}
          {view === 'history' && renderList('completed')}
          {view === 'analytics' && renderAnalytics()}
        </div>
      </main>
    </div>
  );
};

export default App;
