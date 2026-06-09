import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentData {
  enrollment: string;
  name: string;
  branch: string;
  semester: string;
  sgpa: number;
  cgpa: number;
  status: string;
}

const PublicAnalytics = () => {
  const [rawData, setRawData] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [branchFilter, setBranchFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown states for mobile UI simulation (though here we can just use normal selects if preferred, but we will adapt to design)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/data');
        if (response.data.error) {
           setError(response.data.error);
           return;
        }
        const formattedData: StudentData[] = response.data.map((item: any) => ({
          enrollment: item['Enrollment Number'] || '',
          name: item['Student Name'] || '',
          branch: item['Branch'] || 'Unknown',
          semester: (item['Semester'] || '').toString(),
          sgpa: parseFloat(item['SGPA']) || 0,
          cgpa: parseFloat(item['CGPA']) || 0,
          status: item['Result Status'] || 'Unknown'
        }));
        setRawData(formattedData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to connect to the backend API.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return rawData.filter(student => {
      const matchBranch = branchFilter === 'All' || student.branch === branchFilter;
      const matchSemester = semesterFilter === 'All' || student.semester === semesterFilter;
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = student.name.toLowerCase().includes(searchLower) || 
                          student.enrollment.toLowerCase().includes(searchLower);
      return matchBranch && matchSemester && matchSearch;
    }).sort((a, b) => b.sgpa - a.sgpa);
  }, [rawData, branchFilter, semesterFilter, searchQuery]);

  const totalStudents = filteredData.length;
  const avgSgpa = totalStudents > 0 ? (filteredData.reduce((acc, curr) => acc + curr.sgpa, 0) / totalStudents).toFixed(2) : '0.00';
  const passedStudents = filteredData.filter(d => d.status.toLowerCase() === 'pass').length;
  const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : '0.0';
  const highestSgpa = totalStudents > 0 ? Math.max(...filteredData.map(d => d.sgpa)).toFixed(2) : '0.00';

  // Compute SGPA Distribution Bins (for the Bar Chart)
  const sgpaBins = useMemo(() => {
    const bins = { '<6': 0, '6-7': 0, '7-8': 0, '8-9': 0, '9-10': 0 };
    filteredData.forEach(student => {
      if (student.sgpa < 6) bins['<6']++;
      else if (student.sgpa < 7) bins['6-7']++;
      else if (student.sgpa < 8) bins['7-8']++;
      else if (student.sgpa < 9) bins['8-9']++;
      else bins['9-10']++;
    });
    const maxVal = Math.max(...Object.values(bins), 1); // Avoid div by zero
    return {
      bins,
      percentages: {
        '<6': (bins['<6'] / maxVal) * 100,
        '6-7': (bins['6-7'] / maxVal) * 100,
        '7-8': (bins['7-8'] / maxVal) * 100,
        '8-9': (bins['8-9'] / maxVal) * 100,
        '9-10': (bins['9-10'] / maxVal) * 100,
      },
      maxVal
    };
  }, [filteredData]);

  // Compute SGPA Bar Chart Distribution
  const sgpaDistribution = useMemo(() => {
    const bins = { '< 6.0': 0, '6.0 - 6.99': 0, '7.0 - 7.99': 0, '8.0 - 8.99': 0, '9.0 - 10.0': 0 };
    filteredData.forEach(student => {
      if (student.sgpa < 6.0) bins['< 6.0']++;
      else if (student.sgpa < 7.0) bins['6.0 - 6.99']++;
      else if (student.sgpa < 8.0) bins['7.0 - 7.99']++;
      else if (student.sgpa < 9.0) bins['8.0 - 8.99']++;
      else bins['9.0 - 10.0']++;
    });
    return Object.keys(bins).map(key => ({
      range: key,
      students: bins[key as keyof typeof bins]
    }));
  }, [filteredData]);

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-0 font-body-md">
      {/* TopAppBar */}
      <header className="bg-surface dark:bg-surface-dim text-primary dark:text-primary-fixed-dim w-full top-0 sticky shadow-sm border-b border-outline-variant dark:border-secondary-container z-40">
        <div className="flex justify-between items-center px-sm py-xs w-full max-w-full lg:max-w-[1280px] mx-auto lg:px-lg">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim p-sm rounded-full hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors cursor-pointer active:scale-95 duration-150">account_balance</span>
            <h1 className="font-headline-md text-[24px] font-bold text-primary dark:text-primary-fixed">MITS Gwalior</h1>
          </div>
          <div className="flex items-center gap-sm hidden md:flex">
            <nav className="flex gap-md mr-md">
              <a className="flex items-center gap-xs text-primary dark:text-primary-fixed font-label-caps text-[12px] hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors px-sm py-xs rounded-md" href="/">
                <span className="material-symbols-outlined text-[16px]">public</span> Public
              </a>
              <a className="flex items-center gap-xs text-on-surface-variant dark:text-on-surface-variant font-label-caps text-[12px] hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors px-sm py-xs rounded-md" href="/admin">
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span> Admin Login
              </a>
            </nav>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant">
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
            </div>
          </div>
          <div className="md:hidden flex gap-2 items-center">
             <a href="/admin" className="text-xs px-2 py-1 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-md transition-colors">Admin</a>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-md md:px-lg py-lg md:py-xl grid gap-xl mt-4">
        
        {loading ? (
            <div className="flex items-center justify-center py-20 text-on-surface-variant font-headline-md">Loading Data...</div>
        ) : error ? (
            <div className="flex items-center justify-center py-20 text-error font-headline-md">{error}</div>
        ) : (
          <>
            {/* Top Section: KPI Cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-md md:gap-gutter">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
                <div className="flex justify-between items-start mb-sm">
                  <h3 className="font-label-caps text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Total Students</h3>
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 0" }}>groups</span>
                </div>
                <div className="font-headline-lg text-[30px] font-bold md:text-headline-lg text-on-surface">{totalStudents}</div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-secondary/5 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-sm relative z-10">
                  <h3 className="font-label-caps text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Avg SGPA</h3>
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                </div>
                <div className="font-headline-lg text-[30px] font-bold md:text-headline-lg text-on-surface relative z-10">{avgSgpa}</div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-secondary-container/10 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-sm relative z-10">
                  <h3 className="font-label-caps text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Pass Rate</h3>
                  <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div className="font-headline-lg text-[30px] font-bold md:text-headline-lg text-on-surface relative z-10">{passRate}%</div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-sm relative z-10">
                  <h3 className="font-label-caps text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Highest SGPA</h3>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                </div>
                <div className="font-headline-lg text-[30px] font-bold md:text-headline-lg text-on-surface relative z-10">{highestSgpa}</div>
              </div>
            </section>

            {/* Middle Section: Charts */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-md md:gap-gutter">
              {/* Bar Chart */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
                <h3 className="font-body-lg text-[18px] text-on-surface mb-lg border-b border-outline-variant/50 pb-sm">SGPA Distribution</h3>
                <div className="h-64 flex items-end justify-between gap-xs px-sm pb-md border-b border-l border-outline-variant/30 relative ml-[24px]">
                  {/* Y-Axis Labels */}
                  <div className="absolute left-[-24px] bottom-0 h-full flex flex-col justify-between text-[10px] text-on-surface-variant py-md">
                    <span>{sgpaBins.maxVal}</span>
                    <span>{Math.floor(sgpaBins.maxVal / 2)}</span>
                    <span>0</span>
                  </div>
                  {/* Bars */}
                  <div className="w-full bg-primary/10 rounded-t-sm relative group transition-all hover:bg-primary/20" style={{ height: `${Math.max(sgpaBins.percentages['<6'], 5)}%` }}>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface-variant">&lt;6</span>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface font-bold opacity-0 group-hover:opacity-100 transition-opacity">{sgpaBins.bins['<6']}</span>
                  </div>
                  <div className="w-full bg-primary/30 rounded-t-sm relative group transition-all hover:bg-primary/40" style={{ height: `${Math.max(sgpaBins.percentages['6-7'], 5)}%` }}>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface-variant">6.0</span>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface font-bold opacity-0 group-hover:opacity-100 transition-opacity">{sgpaBins.bins['6-7']}</span>
                  </div>
                  <div className="w-full bg-secondary/60 rounded-t-sm relative group transition-all hover:bg-secondary/70" style={{ height: `${Math.max(sgpaBins.percentages['7-8'], 5)}%` }}>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface-variant">7.0</span>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface font-bold opacity-0 group-hover:opacity-100 transition-opacity">{sgpaBins.bins['7-8']}</span>
                  </div>
                  <div className="w-full bg-secondary/80 rounded-t-sm relative group transition-all hover:bg-secondary" style={{ height: `${Math.max(sgpaBins.percentages['8-9'], 5)}%` }}>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface-variant">8.0</span>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface font-bold opacity-0 group-hover:opacity-100 transition-opacity">{sgpaBins.bins['8-9']}</span>
                  </div>
                  <div className="w-full bg-secondary-container rounded-t-sm relative group transition-all hover:bg-secondary-container/80" style={{ height: `${Math.max(sgpaBins.percentages['9-10'], 5)}%` }}>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface-variant">9.0</span>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-on-surface font-bold opacity-0 group-hover:opacity-100 transition-opacity">{sgpaBins.bins['9-10']}</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart (Recharts) */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-variant/20 pointer-events-none"></div>
                <h3 className="font-body-lg text-[18px] text-on-surface mb-md border-b border-outline-variant/50 pb-sm relative z-10">SGPA Frequency</h3>
                <div className="flex-1 w-full relative z-10 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sgpaDistribution} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                      <XAxis dataKey="range" stroke="var(--color-on-surface-variant)" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke="var(--color-on-surface-variant)" tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: 'var(--color-surface-container-high)' }} contentStyle={{ backgroundColor: 'var(--color-surface-bright)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }} itemStyle={{ color: 'var(--color-secondary)' }} />
                      <Bar dataKey="students" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Bottom Section: Leaderboard Table */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mt-4">
              <div className="p-md border-b border-outline-variant bg-surface-bright flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-headline-md text-[20px] text-on-surface">Student Leaderboard</h3>
                <div className="flex items-center bg-background border border-outline-variant rounded-lg px-3 py-1 w-full md:w-64">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">search</span>
                  <input
                    type="text"
                    placeholder="Search by name or enrollment..."
                    className="bg-transparent border-none outline-none text-on-surface text-[14px] w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface/50 text-on-surface-variant font-label-caps text-[12px] uppercase tracking-wider">
                      <th className="p-md cursor-pointer hover:bg-surface-variant transition-colors group">
                        <div className="flex items-center gap-xs">Enrollment <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_downward</span></div>
                      </th>
                      <th className="p-md cursor-pointer hover:bg-surface-variant transition-colors group">
                        <div className="flex items-center gap-xs">Name <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_downward</span></div>
                      </th>
                      <th className="p-md cursor-pointer hover:bg-surface-variant transition-colors group">
                        <div className="flex items-center gap-xs">Branch <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_downward</span></div>
                      </th>
                      <th className="p-md cursor-pointer hover:bg-surface-variant transition-colors group">
                        <div className="flex items-center gap-xs">SGPA <span className="material-symbols-outlined text-[14px] opacity-100">arrow_downward</span></div>
                      </th>
                      <th className="p-md cursor-pointer hover:bg-surface-variant transition-colors group">
                        <div className="flex items-center gap-xs">CGPA <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_downward</span></div>
                      </th>
                      <th className="p-md">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-[14px] text-on-surface">
                    {filteredData.length > 0 ? (
                      filteredData.map((student, idx) => (
                        <tr key={idx} className="border-b border-outline-variant/30 hover:bg-surface-bright transition-colors">
                          <td className="p-md font-terminal-code text-[13px] text-on-surface-variant">{student.enrollment}</td>
                          <td className="p-md font-semibold">{student.name}</td>
                          <td className="p-md text-on-surface-variant">{student.branch}</td>
                          <td className="p-md font-semibold">{student.sgpa.toFixed(2)}</td>
                          <td className="p-md">{student.cgpa.toFixed(2)}</td>
                          <td className="p-md">
                            {student.status.toLowerCase() === 'pass' ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-secondary/10 text-secondary">Pass</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-error/10 text-error">Fail</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-md text-center text-on-surface-variant">No students match current filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden bg-surface-container text-primary font-label-md fixed bottom-0 left-0 w-full flex justify-around items-center px-md pb-md pt-xs z-50 rounded-t-xl border-t border-outline-variant/30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <a className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-lg py-xs transition-all duration-200 ease-in-out" href="/">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
          <span className="font-label-caps text-[10px] font-semibold">Public</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant p-xs hover:bg-surface-bright transition-all duration-200 ease-in-out" href="/admin">
          <span className="material-symbols-outlined mb-1">admin_panel_settings</span>
          <span className="font-label-caps text-[10px]">Admin</span>
        </a>
      </nav>
    </div>
  );
};

export default PublicAnalytics;
