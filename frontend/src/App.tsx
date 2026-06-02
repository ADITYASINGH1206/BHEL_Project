import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicAnalytics from './components/PublicAnalytics';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
        <Routes>
          <Route path="/" element={<PublicAnalytics />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
