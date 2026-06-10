import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [targetSemester, setTargetSemester] = useState<number>(5);
  const [selectedPrefixes, setSelectedPrefixes] = useState<string[]>(['BTAD24O']);
  const [prefixInput, setPrefixInput] = useState('');
  
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
      ws.onmessage = (event) => {
        const message = event.data;
        setTerminalLogs(prev => [...prev, message]);
        if (message.includes('[SYSTEM] Scraper finished') || message.includes('[SYSTEM] Scraper terminated') || message.includes('[ERROR] Fatal background task error')) {
          setIsRunning(false);
        }
      };
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

  const addPrefix = () => {
    const cleanPrefix = prefixInput.trim().toUpperCase();
    if (!cleanPrefix) return;
    if (selectedPrefixes.includes(cleanPrefix)) return;
    
    setSelectedPrefixes(prev => [...prev, cleanPrefix]);
    setPrefixInput('');
  };

  const removePrefix = (prefix: string) => {
    setSelectedPrefixes(prev => prev.filter(p => p !== prefix));
  };

  const startScraper = async () => {
    try {
      setIsRunning(true);
      await axios.post('http://localhost:8000/api/run-scraper', { 
        semester: targetSemester,
        prefixes: selectedPrefixes,
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
      setIsRunning(false);
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[API ERROR] Failed to stop: ${err.response?.data?.detail || err.message}`]);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-6 font-body-md">
        <div className="bg-surface border border-outline-variant rounded-xl p-8 max-w-[448px] w-full shadow-xl">
          <div className="text-center mb-8 flex flex-col items-center">
            <span className="material-symbols-outlined text-primary text-[48px] mb-4">admin_panel_settings</span>
            <h1 className="font-headline-md text-[24px] font-bold text-on-surface mb-2">Admin Control Center</h1>
            <p className="font-body-sm text-[14px] text-on-surface-variant">Please authenticate to access the pipeline controls.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Admin Password"
                className="w-full bg-background border border-outline-variant text-on-surface px-4 py-3 rounded focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {loginError && <p className="text-error font-body-sm text-[14px]">{loginError}</p>}
            <button type="submit" className="w-full bg-primary text-on-primary font-label-caps text-[12px] uppercase py-3 rounded hover:opacity-90 transition-opacity tracking-widest font-bold shadow-md">
              Access Pipeline
            </button>
            <button type="button" onClick={() => navigate('/')} className="w-full bg-transparent hover:bg-surface-variant text-on-surface-variant font-label-caps text-[12px] uppercase py-2 rounded transition-colors mt-2 tracking-widest font-bold">
              &larr; Return to Analytics
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col pb-[80px] md:pb-0 font-body-md">
      {/* TopAppBar */}
      <header className="bg-surface w-full top-0 sticky border-b border-outline-variant shadow-sm flex justify-between items-center px-sm py-xs max-w-full z-40">
        <div className="flex items-center gap-sm">
          <img src="/mits.png" className="w-8 h-8 object-contain" alt="MITS Logo" />
          <span className="font-headline-md text-[24px] font-bold text-primary">MITS Gwalior</span>
        </div>
        <div className="flex items-center gap-sm hidden md:flex">
          <nav className="flex gap-md mr-md">
            <a className="flex items-center gap-xs text-on-surface-variant font-label-caps text-[12px] hover:bg-surface-container-high transition-colors px-sm py-xs rounded-md" href="/">
              <span className="material-symbols-outlined text-[16px]">public</span> Public
            </a>
            <a className="flex items-center gap-xs text-primary bg-primary/10 font-label-caps text-[12px] px-sm py-xs rounded-md font-bold" href="/admin">
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span> Admin Login
            </a>
            <a className="flex items-center gap-xs text-on-surface-variant font-label-caps text-[12px] hover:bg-surface-container-high transition-colors px-sm py-xs rounded-md" href="/profile">
              <span className="material-symbols-outlined text-[16px]">developer_mode</span> Developer
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-[896px] mx-auto px-container-margin py-lg mt-4">
        {/* Dashboard Header */}
        <div className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant pb-md">
          <div>
            <h1 className="font-headline-xl text-[40px] font-bold text-on-surface tracking-tight">Scraper Control Center</h1>
            <p className="font-body-md text-[16px] text-on-surface-variant mt-xs">System Status: 
               {isRunning ? (
                  <span className="text-secondary font-semibold flex items-center inline-flex gap-xs ml-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> Operational</span>
               ) : (
                  <span className="text-on-surface-variant font-semibold flex items-center inline-flex gap-xs ml-1"><span className="material-symbols-outlined text-[16px]">stop_circle</span> Idle</span>
               )}
            </p>
          </div>
          <div className="flex items-center gap-md">
            <div className="text-right hidden md:block">
              <p className="font-label-caps text-[12px] text-on-surface-variant uppercase">Terminal Status</p>
              <p className="font-terminal-code text-[13px] text-on-surface">Connected</p>
            </div>
          </div>
        </div>

        {/* Stacked Layout */}
        <div className="flex flex-col gap-lg">
          {/* Control Panel Panel (Parameters) */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md lg:p-lg shadow-sm">
            <h2 className="font-headline-md text-[24px] font-bold text-on-surface mb-md flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">settings_applications</span>
              Execution Parameters
            </h2>
            
            <div className="space-y-md">
              {/* Row 1: Semester and Enrollment Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                {/* Semester Dropdown */}
                <div>
                  <label className="block font-label-caps text-[12px] text-on-surface-variant uppercase mb-xs font-bold">Semester Context</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-surface border border-outline-variant rounded px-md py-sm font-body-sm text-[14px] text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-colors appearance-none pr-lg"
                      value={targetSemester}
                      onChange={(e) => setTargetSemester(Number(e.target.value))}
                      disabled={isRunning}
                    >
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
                  </div>
                </div>

                {/* Enrollment Range */}
                <div className="md:col-span-2 grid grid-cols-2 gap-sm">
                  <div>
                    <label className="block font-label-caps text-[12px] text-on-surface-variant uppercase mb-xs font-bold">Start Enrl.</label>
                    <input 
                      type="number"
                      className="w-full bg-surface border border-outline-variant rounded px-md py-sm font-terminal-code text-[13px] text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-colors" 
                      placeholder="Start Idx"
                      value={startIndex}
                      onChange={(e) => setStartIndex(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="block font-label-caps text-[12px] text-on-surface-variant uppercase mb-xs font-bold">End Enrl.</label>
                    <input 
                      type="number"
                      className="w-full bg-surface border border-outline-variant rounded px-md py-sm font-terminal-code text-[13px] text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-colors" 
                      placeholder="End Idx"
                      value={endIndex}
                      onChange={(e) => setEndIndex(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Prefix Tags */}
              <div>
                <label className="block font-label-caps text-[12px] text-on-surface-variant uppercase mb-xs font-bold">Enrollment Prefixes</label>
                <div className="flex gap-sm mb-sm">
                  <input 
                    type="text"
                    className="flex-1 bg-surface border border-outline-variant rounded px-md py-sm font-body-sm text-[14px] text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-colors" 
                    placeholder="e.g., BTAD24O, BTAM24O..." 
                    value={prefixInput}
                    onChange={(e) => setPrefixInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPrefix()}
                    disabled={isRunning}
                  />
                  <button 
                    onClick={addPrefix}
                    disabled={isRunning || !prefixInput.trim()}
                    className="bg-surface-variant text-on-surface rounded px-md py-sm font-label-caps text-[12px] hover:bg-surface-container-highest transition-colors flex items-center gap-xs font-bold" 
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> Add
                  </button>
                </div>
                {/* Chips */}
                <div className="flex flex-wrap gap-sm mt-xs">
                  {selectedPrefixes.map(prefix => (
                    <div key={prefix} className="bg-secondary/10 text-secondary border border-secondary/20 rounded-full pl-md pr-xs py-[2px] flex items-center gap-xs font-label-caps text-[12px] font-bold">
                      {prefix}
                      <button onClick={() => removePrefix(prefix)} disabled={isRunning} className="hover:bg-secondary/20 rounded-full p-[2px] transition-colors" type="button">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Actions */}
              <div className="border-t border-outline-variant pt-md mt-md flex gap-md">
                {!isRunning ? (
                  <button onClick={startScraper} className="flex-1 bg-secondary text-on-secondary rounded-lg px-md py-[10px] font-label-caps text-[12px] uppercase flex justify-center items-center gap-sm hover:opacity-90 transition-opacity shadow-sm font-bold" type="button">
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    Launch Scraper
                  </button>
                ) : (
                  <button onClick={stopScraper} className="w-full bg-error text-on-error rounded-lg px-md py-[10px] font-label-caps text-[12px] uppercase flex justify-center items-center gap-sm hover:opacity-90 transition-opacity shadow-sm font-bold" type="button">
                    <span className="material-symbols-outlined text-[18px]">stop</span>
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Live Terminal Panel */}
          <div className="bg-[#0b1c30] rounded-xl border border-outline-variant shadow-sm h-96 flex flex-col overflow-hidden relative scanline-overlay terminal-glow">
            {/* Terminal Header */}
            <div className="bg-inverse-surface border-b border-surface-tint/30 px-md py-sm flex justify-between items-center z-20">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary-fixed text-[16px]">terminal</span>
                <span className="font-label-caps text-[12px] text-inverse-primary uppercase tracking-widest font-bold">stdout_stream</span>
              </div>
              <div className="flex gap-xs">
                <div className="w-2 h-2 rounded-full bg-surface-tint"></div>
                <div className="w-2 h-2 rounded-full bg-surface-tint"></div>
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-secondary-fixed animate-pulse' : 'bg-surface-tint'}`}></div>
              </div>
            </div>
            
            {/* Terminal Output */}
            <div className="p-md font-terminal-code text-[13px] text-secondary-fixed flex-1 overflow-y-auto no-scrollbar z-20 leading-relaxed space-y-1">
              {terminalLogs.length === 0 ? (
                <div><span className="text-surface-tint">[INFO]</span> Awaiting connection...</div>
              ) : (
                terminalLogs.map((log, idx) => {
                  let logType = "[INFO]";
                  let textColor = "text-secondary-fixed";
                  if (log.includes("[ERROR]")) {
                    logType = "[ERROR]";
                    textColor = "text-[#da586c]"; // on-tertiary-container / red
                  } else if (log.includes("[SYSTEM]")) {
                    logType = "[SYSTEM]";
                    textColor = "text-surface-tint";
                  }
                  const message = log.replace(/\[ERROR\]|\[SYSTEM\]/, '').trim();
                  return (
                    <div key={idx} className={textColor}>
                      <span className="text-surface-tint">{logType}</span> {message}
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden bg-surface-container fixed bottom-0 left-0 w-full flex justify-around items-center px-md pb-md pt-xs z-50 rounded-t-xl border-t border-outline-variant/30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <a className="flex flex-col items-center justify-center text-on-surface-variant p-xs hover:bg-surface-bright transition-all duration-200 ease-in-out" href="/">
          <span className="material-symbols-outlined mb-xs text-[24px]">public</span>
          <span className="font-label-md text-[14px]">Public</span>
        </a>
        <a className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-lg py-xs transition-all duration-200 ease-in-out" href="/admin">
          <span className="material-symbols-outlined mb-xs text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          <span className="font-label-md text-[14px] font-semibold">Admin</span>
        </a>
      </nav>
    </div>
  );
};

export default AdminDashboard;
