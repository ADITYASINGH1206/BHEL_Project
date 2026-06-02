import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Square, Terminal, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [targetSemester, setTargetSemester] = useState<number>(4);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['All']);
  const [branchInput, setBranchInput] = useState('');
  
  const [startIndex, setStartIndex] = useState<number | ''>('');
  const [endIndex, setEndIndex] = useState<number | ''>('');
  const [isRunning, setIsRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkStatus = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/status');
        setIsRunning(res.data.is_running);
      } catch (e) {
        // Ignored
      }
    };
    checkStatus();

    const connectWs = () => {
      const ws = new WebSocket('ws://localhost:8000/ws/logs');
      ws.onopen = () => setTerminalLogs(prev => [...prev, '[WS] Connected to Server WebSocket']);
      ws.onmessage = (event) => setTerminalLogs(prev => [...prev, event.data]);
      ws.onclose = () => {
        setTerminalLogs(prev => [...prev, '[WS] Connection closed. Reconnecting in 5s...']);
        setTimeout(connectWs, 5000);
      };
      wsRef.current = ws;
    };
    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/login', { password });
      setIsAuthenticated(true);
      setLoginError('');
    } catch (err: any) {
      setLoginError('Invalid password. Please try again.');
    }
  };

  const addBranch = () => {
    const cleanBranch = branchInput.trim().toUpperCase();
    if (!cleanBranch) return;
    if (selectedBranches.includes(cleanBranch)) return;
    
    if (cleanBranch === 'ALL') {
      setSelectedBranches(['All']);
    } else {
      setSelectedBranches(prev => {
        const withoutAll = prev.filter(b => b !== 'All');
        return [...withoutAll, cleanBranch];
      });
    }
    setBranchInput('');
  };

  const removeBranch = (branch: string) => {
    setSelectedBranches(prev => {
      const updated = prev.filter(b => b !== branch);
      return updated.length === 0 ? ['All'] : updated;
    });
  };

  const startScraper = async () => {
    try {
      setIsRunning(true);
      await axios.post('http://localhost:8000/api/run-scraper', { 
        semester: targetSemester,
        branches: selectedBranches,
        start_index: startIndex !== '' ? Number(startIndex) : null,
        end_index: endIndex !== '' ? Number(endIndex) : null
      });
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[API ERROR] Failed to start: ${err.response?.data?.detail || err.message}`]);
      setIsRunning(false);
    }
  };

  const stopScraper = async () => {
    try {
      await axios.post('http://localhost:8000/api/stop-scraper');
      setTerminalLogs(prev => [...prev, `[SYSTEM] Stop request sent to API.`]);
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[API ERROR] Failed to stop: ${err.response?.data?.detail || err.message}`]);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="dark min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Admin Control Center</h1>
            <p className="text-slate-400 text-sm">Please authenticate to access the pipeline controls.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Admin Password"
                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors">
              Access Pipeline
            </button>
            <button type="button" onClick={() => navigate('/')} className="w-full bg-transparent hover:bg-slate-700/50 text-slate-400 font-medium py-2 rounded-lg transition-colors mt-2 text-sm">
              &larr; Return to Analytics
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-slate-900 p-6 font-sans text-slate-100">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Command Center</h1>
          <p className="text-slate-400 mt-1">Pipeline Orchestrator & Remote Terminal</p>
        </div>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium border border-slate-700">
          View Analytics
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        <div className="xl:col-span-1 bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center mb-6">
            <Terminal size={20} className="mr-2 text-indigo-400" />
            Launch Configuration
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Target Semester</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={targetSemester}
                onChange={(e) => setTargetSemester(Number(e.target.value))}
                disabled={isRunning}
              >
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Target Branches</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text"
                  placeholder="e.g. BTAD"
                  className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-600 uppercase"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addBranch()}
                  disabled={isRunning}
                />
                <button onClick={addBranch} disabled={isRunning || !branchInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors">
                  <Plus size={20} />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedBranches.map(branch => (
                  <div key={branch} className="flex items-center gap-1 bg-slate-700 text-white px-3 py-1.5 rounded-full text-xs font-medium border border-slate-600 shadow-sm">
                    {branch}
                    <button 
                      onClick={() => removeBranch(branch)} 
                      disabled={isRunning}
                      className="text-slate-400 hover:text-white hover:bg-slate-600 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Scrape Range (Optional)</label>
              <div className="flex gap-3">
                <input 
                  type="number"
                  placeholder="Start Idx"
                  className="w-1/2 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-600"
                  value={startIndex}
                  onChange={(e) => setStartIndex(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isRunning}
                />
                <input 
                  type="number"
                  placeholder="End Idx"
                  className="w-1/2 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-600"
                  value={endIndex}
                  onChange={(e) => setEndIndex(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            {!isRunning ? (
              <button onClick={startScraper} className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
                <Play size={18} className="mr-2" /> Launch Scraper
              </button>
            ) : (
              <button onClick={stopScraper} className="w-full flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98]">
                <Square size={18} className="mr-2" /> Terminate Pipeline
              </button>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 bg-slate-950 rounded-2xl p-4 shadow-inner border border-slate-800 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <div className="text-xs font-mono text-slate-500 flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              {isRunning ? 'PIPELINE ACTIVE' : 'IDLE'}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto font-mono text-xs sm:text-sm space-y-1 pr-2 custom-scrollbar">
            {terminalLogs.length === 0 ? (
              <p className="text-slate-600 italic">Awaiting connection...</p>
            ) : (
              terminalLogs.map((log, idx) => (
                <div key={idx} className={`${log.includes('[ERROR]') ? 'text-red-400' : log.includes('[SYSTEM]') ? 'text-blue-400' : 'text-green-400'} break-all`}>
                  <span className="text-slate-600 mr-2">›_</span>{log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
