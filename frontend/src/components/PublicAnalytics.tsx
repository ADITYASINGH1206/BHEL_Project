import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import { Users, GraduationCap, Percent, Trophy, Search, Filter, Loader2, AlertCircle } from 'lucide-react';

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

  const [branchFilter, setBranchFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartType, setChartType] = useState('histogram');

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
  const avgSgpa = totalStudents > 0 ? (filteredData.reduce((acc, curr) => acc + curr.sgpa, 0) / totalStudents).toFixed(2) : '0.00';
  const passedStudents = filteredData.filter(d => d.status.toLowerCase() === 'pass').length;
  const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : '0.0';
  const highestSgpa = totalStudents > 0 ? Math.max(...filteredData.map(d => d.sgpa)).toFixed(2) : '0.00';

  const renderChart = () => {
    const textColor = '#f8fafc';
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
        theme: { mode: 'dark' }
      };
      return <ReactApexChart options={options as any} series={[{ name: 'Students', data: Object.values(bins) }]} type="bar" height={400} />;
    } else if (chartType === 'scatter') {
      const seriesData = filteredData.map(d => [d.cgpa, d.sgpa]);
      const options = {
        chart: { type: 'scatter', zoom: { enabled: true }, background: 'transparent' },
        xaxis: { title: { text: 'CGPA', style: { color: textColor } }, labels: { style: { colors: textColor } } },
        yaxis: { title: { text: 'SGPA', style: { color: textColor } }, labels: { style: { colors: textColor } } },
        colors: ['#10b981'],
        theme: { mode: 'dark' }
      };
      return <ReactApexChart options={options as any} series={[{ name: 'Students', data: seriesData }]} type="scatter" height={400} />;
    } else if (chartType === 'boxplot') {
      const plotData = branches.filter(b => b !== 'All').map(branch => {
        const branchData = filteredData.filter(d => d.branch === branch).map(d => d.sgpa).sort((a, b) => a - b);
        if (branchData.length === 0) return null;
        const q1 = branchData[Math.floor(branchData.length * 0.25)];
        const median = branchData[Math.floor(branchData.length * 0.5)];
        const q3 = branchData[Math.floor(branchData.length * 0.75)];
        return { x: branch, y: [Math.min(...branchData), q1, median, q3, Math.max(...branchData)] };
      }).filter(Boolean) as { x: string; y: number[] }[];
      const options = {
        chart: { type: 'boxPlot', background: 'transparent' },
        plotOptions: { boxPlot: { colors: { upper: '#3b82f6', lower: '#8b5cf6' } } },
        xaxis: { labels: { style: { colors: textColor } } },
        yaxis: { labels: { style: { colors: textColor } } },
        theme: { mode: 'dark' }
      };
      return <ReactApexChart options={options as any} series={[{ type: 'boxPlot', data: plotData }]} type="boxPlot" height={400} />;
    }
    return null;
  };

  return (
    <div className="dark min-h-screen bg-slate-900 transition-colors duration-300 p-6 font-sans text-slate-100">
      <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Public Analytics
            <a href="/admin" className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-md transition-colors">Admin Access</a>
          </h1>
          <p className="text-slate-400 mt-1">University Performance Insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 backdrop-blur-md p-3 rounded-xl shadow-sm border border-slate-700">
          <div className="flex items-center bg-slate-700 rounded-lg px-3 py-2">
            <Search size={18} className="text-slate-300 mr-2" />
            <input 
              type="text" placeholder="Search Name or Enrollment..." 
              className="bg-transparent border-none outline-none text-sm w-48 text-white placeholder-slate-500"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-slate-700 rounded-lg px-3 py-2">
            <Filter size={18} className="text-slate-300 mr-2" />
            <select className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer text-white bg-slate-800" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              {branches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>)}
            </select>
          </div>
          <div className="flex items-center bg-slate-700 rounded-lg px-3 py-2">
            <GraduationCap size={18} className="text-slate-300 mr-2" />
            <select className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer text-white bg-slate-800" value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
              {semesters.map(s => <option key={s} value={s}>{s === 'All' ? 'All Semesters' : `Sem ${s}`}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
          <p className="text-slate-400 font-medium">Syncing with Live Database...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 bg-red-900/20 rounded-2xl border border-red-800">
          <AlertCircle className="text-red-500 mb-4" size={48} />
          <p className="text-red-400 font-semibold mb-2">Database Connection Error</p>
          <p className="text-red-500/80 text-sm">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard title="Total Students" value={totalStudents} icon={<Users size={24} />} color="text-blue-400" bg="bg-blue-900/50" />
            <MetricCard title="Average SGPA" value={avgSgpa} icon={<GraduationCap size={24} />} color="text-indigo-400" bg="bg-indigo-900/50" />
            <MetricCard title="Overall Pass Rate" value={`${passRate}%`} icon={<Percent size={24} />} color="text-emerald-400" bg="bg-emerald-900/50" />
            <MetricCard title="Highest SGPA" value={highestSgpa} icon={<Trophy size={24} />} color="text-amber-400" bg="bg-amber-900/50" />
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-700 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-lg font-semibold text-white">Statistical Analytics</h2>
              <div className="flex bg-slate-700 rounded-lg p-1">
                <button onClick={() => setChartType('histogram')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'histogram' ? 'bg-slate-600 shadow text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>Histogram</button>
                <button onClick={() => setChartType('boxplot')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'boxplot' ? 'bg-slate-600 shadow text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>Box Plot</button>
                <button onClick={() => setChartType('scatter')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'scatter' ? 'bg-slate-600 shadow text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>Scatter Plot</button>
              </div>
            </div>
            <div className="h-[400px]">
              {renderChart()}
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Student Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 text-sm font-medium border-b border-slate-700">
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
                      <tr key={idx} className="hover:bg-slate-700/50 transition-colors border-b border-slate-700 last:border-0">
                        <td className="py-4 px-6 font-medium text-slate-300">{student.enrollment}</td>
                        <td className="py-4 px-6 font-semibold text-white">{student.name}</td>
                        <td className="py-4 px-6 text-slate-400">
                          <span className="px-2.5 py-1 bg-slate-700 rounded-md text-xs font-medium border border-slate-600">
                            {student.branch}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-indigo-400">{student.sgpa.toFixed(2)}</td>
                        <td className="py-4 px-6 text-slate-400">{student.cgpa.toFixed(2)}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            student.status.toLowerCase() === 'pass' 
                              ? 'bg-emerald-900/40 text-emerald-400' 
                              : 'bg-red-900/40 text-red-400'
                          }`}>
                            {student.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
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

interface MetricCardProps { title: string; value: string | number; icon: ReactNode; color: string; bg: string; }
const MetricCard = ({ title, value, icon, color, bg }: MetricCardProps) => (
  <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-700 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
    </div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bg} ${color}`}>{icon}</div>
  </div>
);

export default PublicAnalytics;
