import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import { Users, GraduationCap, Percent, Trophy, Search, Filter, Moon, Sun, Loader2, AlertCircle } from 'lucide-react';

interface StudentData {
  enrollment: string;
  name: string;
  branch: string;
  semester: string;
  sgpa: number;
  cgpa: number;
  status: string;
}

const Dashboard = () => {
  // State for Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // State for data
  const [rawData, setRawData] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters
  const [branchFilter, setBranchFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for chart type
  const [chartType, setChartType] = useState('histogram');

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return next;
    });
  };

  // Fetch Data from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/results');
        
        if (response.data.error) {
           setError(response.data.error);
           setLoading(false);
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
        console.error("Error fetching data:", err);
        setError(err.message || 'Failed to connect to the backend API.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const branches = ['All', ...new Set(rawData.map(d => d.branch))].filter(Boolean);
  const semesters = ['All', ...new Set(rawData.map(d => d.semester))].filter(Boolean);

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
  const avgSgpa = totalStudents > 0 
    ? (filteredData.reduce((acc, curr) => acc + curr.sgpa, 0) / totalStudents).toFixed(2) 
    : '0.00';
  const passedStudents = filteredData.filter(d => d.status.toLowerCase() === 'pass').length;
  const passRate = totalStudents > 0 
    ? ((passedStudents / totalStudents) * 100).toFixed(1) 
    : '0.0';
  const highestSgpa = totalStudents > 0 
    ? Math.max(...filteredData.map(d => d.sgpa)).toFixed(2) 
    : '0.00';

  // ApexCharts Render
  const renderChart = () => {
    const textColor = isDarkMode ? '#f8fafc' : '#334155';
    
    if (chartType === 'histogram') {
      const bins: Record<string, number> = { '<6': 0, '6-7': 0, '7-8': 0, '8-9': 0, '9-10': 0 };
      filteredData.forEach(student => {
        if (student.sgpa < 6) bins['<6']++;
        else if (student.sgpa < 7) bins['6-7']++;
        else if (student.sgpa < 8) bins['7-8']++;
        else if (student.sgpa < 9) bins['8-9']++;
        else bins['9-10']++;
      });
      
      const options = {
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        xaxis: { categories: Object.keys(bins), labels: { style: { colors: textColor } } },
        yaxis: { labels: { style: { colors: textColor } } },
        colors: ['#6366f1'],
        theme: { mode: isDarkMode ? 'dark' : 'light' }
      };
      
      return <ReactApexChart options={options as any} series={[{ name: 'Students', data: Object.values(bins) }]} type="bar" height={400} />;
    } 
    else if (chartType === 'scatter') {
      const seriesData = filteredData.map(d => [d.cgpa, d.sgpa]);
      const options = {
        chart: { type: 'scatter', zoom: { enabled: true }, background: 'transparent' },
        xaxis: { title: { text: 'CGPA', style: { color: textColor } }, labels: { style: { colors: textColor } } },
        yaxis: { title: { text: 'SGPA', style: { color: textColor } }, labels: { style: { colors: textColor } } },
        colors: ['#10b981'],
        theme: { mode: isDarkMode ? 'dark' : 'light' }
      };
      
      return <ReactApexChart options={options as any} series={[{ name: 'Students', data: seriesData }]} type="scatter" height={400} />;
    } 
    else if (chartType === 'boxplot') {
      const plotData = branches.filter(b => b !== 'All').map(branch => {
        const branchData = filteredData.filter(d => d.branch === branch).map(d => d.sgpa).sort((a, b) => a - b);
        if (branchData.length === 0) return null;
        
        const q1 = branchData[Math.floor(branchData.length * 0.25)];
        const median = branchData[Math.floor(branchData.length * 0.5)];
        const q3 = branchData[Math.floor(branchData.length * 0.75)];
        
        return {
          x: branch,
          y: [Math.min(...branchData), q1, median, q3, Math.max(...branchData)]
        };
      }).filter(Boolean) as { x: string; y: number[] }[];

      const options = {
        chart: { type: 'boxPlot', background: 'transparent' },
        plotOptions: { boxPlot: { colors: { upper: '#3b82f6', lower: '#8b5cf6' } } },
        xaxis: { labels: { style: { colors: textColor } } },
        yaxis: { labels: { style: { colors: textColor } } },
        theme: { mode: isDarkMode ? 'dark' : 'light' }
      };

      return <ReactApexChart options={options as any} series={[{ type: 'boxPlot', data: plotData }]} type="boxPlot" height={400} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 p-6 font-sans text-slate-800 dark:text-slate-100">
      
      {/* Header & Navigation */}
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">MITS Gwalior Result Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Live interactive dashboard synchronized with Google Sheets.</p>
        </div>
        
        {/* Global Filters & Theme Toggle */}
        <div className="flex flex-wrap items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2">
            <Search size={18} className="text-slate-400 dark:text-slate-300 mr-2" />
            <input 
              type="text" 
              placeholder="Search Name or Enrollment..." 
              className="bg-transparent border-none outline-none text-sm w-48 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2">
            <Filter size={18} className="text-slate-400 dark:text-slate-300 mr-2" />
            <select 
              className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer text-slate-900 dark:text-white"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              {branches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>)}
            </select>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2">
            <GraduationCap size={18} className="text-slate-400 dark:text-slate-300 mr-2" />
            <select 
              className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer text-slate-900 dark:text-white"
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
            >
              {semesters.map(s => <option key={s} value={s}>{s === 'All' ? 'All Semesters' : `Sem ${s}`}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary dark:text-blue-400 mb-4" size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Syncing with FastAPI Backend...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
          <AlertCircle className="text-red-500 mb-4" size={48} />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Backend Connection Error</p>
          <p className="text-red-500 dark:text-red-500/80 text-sm">{error}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-4">Make sure FastAPI is running on port 8000.</p>
        </div>
      ) : (
        <>
          {/* Section A: KPI Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard title="Total Students" value={totalStudents} icon={<Users size={24} />} color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-900/50" />
            <MetricCard title="Average SGPA" value={avgSgpa} icon={<GraduationCap size={24} />} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-100 dark:bg-indigo-900/50" />
            <MetricCard title="Overall Pass Rate" value={`${passRate}%`} icon={<Percent size={24} />} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-900/50" />
            <MetricCard title="Highest SGPA" value={highestSgpa} icon={<Trophy size={24} />} color="text-amber-500 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-900/50" />
          </div>

          {/* Section B: Interactive Plotly Visualizations */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-lg font-semibold dark:text-white">Statistical Analytics</h2>
              
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button 
                  onClick={() => setChartType('histogram')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'histogram' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Histogram
                </button>
                <button 
                  onClick={() => setChartType('boxplot')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'boxplot' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Box Plot
                </button>
                <button 
                  onClick={() => setChartType('scatter')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'scatter' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Scatter Plot
                </button>
              </div>
            </div>
            
            <div className="h-[400px]">
              {renderChart()}
            </div>
          </div>

          {/* Section C: Leaderboard */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">Student Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm font-medium border-b border-slate-200 dark:border-slate-700">
                    <th className="py-4 px-6">Enrollment</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Branch</th>
                    <th className="py-4 px-6">SGPA</th>
                    <th className="py-4 px-6">CGPA</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <td className="py-4 px-6 font-medium text-slate-700 dark:text-slate-300">{student.enrollment}</td>
                        <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">{student.name}</td>
                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-600">
                            {student.branch}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-indigo-600 dark:text-indigo-400">{student.sgpa.toFixed(2)}</td>
                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{student.cgpa.toFixed(2)}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            student.status.toLowerCase() === 'pass' 
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                          }`}>
                            {student.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No students match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Helper component for KPI Cards
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  bg: string;
}

const MetricCard = ({ title, value, icon, color, bg }: MetricCardProps) => (
  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
    </div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bg} ${color}`}>
      {icon}
    </div>
  </div>
);

export default Dashboard;
