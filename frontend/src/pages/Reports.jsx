import React, { useEffect, useState } from 'react';
import { getReports, uploadReport, explainReport, getTrends, getLabValues } from '../services/api';
import { Upload, FileText, CheckCircle, Search, AlertCircle, Loader, TrendingUp, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import LabValuesDisplay from '../components/LabValuesDisplay';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [viewMode, setViewMode] = useState('list'); // 'list' or 'trends'
  const [trends, setTrends] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  // New state for lab values
  const [labValues, setLabValues] = useState([]);
  const [loadingLabValues, setLoadingLabValues] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data);
      if (res.data.length > 0 && !selectedReport) {
        setSelectedReport(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    }
  };

  // Fetch lab values when report is selected
  useEffect(() => {
    if (selectedReport && viewMode === 'list') {
      fetchLabValues(selectedReport.id);
    }
  }, [selectedReport, viewMode]);

  const fetchLabValues = async (reportId) => {
    setLoadingLabValues(true);
    try {
      const res = await getLabValues(reportId);
      setLabValues(res.data.lab_values || []);
    } catch (err) {
      console.error("Failed to fetch lab values", err);
      setLabValues([]);
    } finally {
      setLoadingLabValues(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await uploadReport(formData);
      await fetchReports();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      alert("Upload failed. Make sure Tesseract is installed on backend.");
    } finally {
      setUploading(false);
    }
  };

  const handleExplain = async (reportId) => {
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await explainReport(reportId);
      setAnalysis(res.data);
    } catch (err) {
      console.error("Explanation failed", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setViewMode('trends');
    setLoadingTrends(true);
    try {
      const res = await getTrends();
      setTrends(res.data);
    } catch (err) {
      console.error("Failed to fetch trends", err);
    } finally {
      setLoadingTrends(false);
    }
  };

  return (
    <div className="reports-page">
      <header className="page-header">
        <div className="title-area">
          <h1>Medical Intelligence</h1>
          <p>Scan, extract, and understand clinical documentation instantly.</p>
        </div>
        <div className="action-btns">
          <button
            className={`btn-secondary ${viewMode === 'trends' ? 'active' : ''}`}
            onClick={fetchAnalytics}
          >
            <TrendingUp size={18} />
            Longitudinal Analysis
          </button>
          <label className="upload-btn btn-primary">
            <Upload size={18} />
            {uploading ? 'Analyzing...' : 'Upload New Report'}
            <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </header>

      <div className="reports-layout">
        <aside className="reports-sidebar glass-panel">
          <div className="sidebar-header">
            <h3>Archived Reports</h3>
            {viewMode === 'trends' && (
              <button className="btn-text" onClick={() => setViewMode('list')}>Back to List</button>
            )}
          </div>
          <div className="search-reports">
            <Search size={16} />
            <input type="text" placeholder="Search files..." />
          </div>
          <div className="reports-list">
            {reports.map((r) => (
              <div
                key={r.id}
                className={`report-nav-item ${selectedReport?.id === r.id && viewMode === 'list' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedReport(r);
                  setAnalysis(null);
                  setViewMode('list');
                }}
              >
                <FileText size={18} />
                <div className="r-meta">
                  <span className="r-name">{r.filename}</span>
                  <span className="r-date">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="report-viewer card">
          {viewMode === 'trends' ? (
            <div className="trends-view animate-fade-in">
              <div className="viewer-header">
                <h2>Health Progress & Trends</h2>
                <p>Comparing {reports.length} reports across {reports.length > 0 ? (new Date(reports[reports.length - 1].created_at).getFullYear() - new Date(reports[0].created_at).getFullYear() + 1) : 0} year(s)</p>
              </div>

              {loadingTrends ? (
                <div className="loading-state">
                  <Loader className="spin" size={48} />
                  <p>Analyzing clinical history...</p>
                </div>
              ) : trends ? (
                <div className="trends-content">
                  <section className="overall-summary-card">
                    <h3>Overall Clinical Progress</h3>
                    <p>{trends.overall_summary}</p>
                  </section>

                  <div className="trends-grid">
                    {trends.trends?.map((trend, i) => (
                      <div key={i} className="trend-item card">
                        <div className="trend-header">
                          <h4>{trend.metric}</h4>
                          <TrendingUp size={16} color="var(--accent-primary)" />
                        </div>
                        <div className="trend-data">
                          {trend.entries?.map((entry, j) => (
                            <div key={j} className="data-point">
                              <span className="dp-date">{entry.date}</span>
                              <span className="dp-val">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                        <p className="trend-obs">{trend.observation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-viewer">
                  <AlertCircle size={48} />
                  <p>Could not load trend data. Ensure you have analyzed at least two reports.</p>
                </div>
              )}
            </div>
          ) : selectedReport ? (
            <div className="viewer-content">
              <div className="viewer-header">
                <div>
                  <h2>{selectedReport.filename}</h2>
                  <span className="r-type">{selectedReport.file_type} Document</span>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => handleExplain(selectedReport.id)}
                  disabled={loading}
                >
                  {loading ? <Loader className="spin" size={18} /> : 'Generate Medical Explanation'}
                </button>
              </div>

              <div className="analysis-panels">
                {/* Structured Lab Values Section - NEW */}
                <LabValuesDisplay labValues={labValues} />

                {analysis && (
                  <div className="medical-insight animate-fade-in">
                    <div className="insight-header">
                      <CheckCircle color="#00ff88" size={24} />
                      <h3>AI Clinical Assessment</h3>
                      <span className={`confidence-tag ${analysis.confidence}`}>
                        {analysis.confidence} confidence
                      </span>
                    </div>

                    <div className="explanation-text">
                      <p>{analysis.explanation}</p>
                    </div>

                    <div className="findings-grid">
                      <h4>Core Findings</h4>
                      <ul>
                        {analysis.findings?.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedReport.summary_text && !analysis && (
                  <div className="basic-summary animate-fade-in">
                    <h3>Auto-Generated Summary</h3>
                    <p>{selectedReport.summary_text}</p>
                  </div>
                )}

                {!analysis && !loading && (
                  <div className="empty-viewer">
                    <AlertCircle size={48} color="var(--text-secondary)" />
                    <p>Click "Generate Medical Explanation" to start AI reasoning.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-report-selected">
              <FileText size={64} color="var(--border-color)" />
              <h2>Select a report to view analysis</h2>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .reports-page {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .action-btns {
          display: flex;
          gap: 12px;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: white;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-secondary.active {
          border-color: var(--accent-primary);
          background: rgba(58, 134, 255, 0.1);
          color: var(--accent-primary);
        }

        .reports-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
          height: calc(100vh - 250px);
        }

        .reports-sidebar {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
        }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .search-reports {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          padding: 10px 14px;
          border-radius: 12px;
          color: var(--text-secondary);
        }

        .search-reports input {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          outline: none;
          font-size: 14px;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .report-nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .report-nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .report-nav-item.active {
          background: rgba(58, 134, 255, 0.1);
          border-color: rgba(58, 134, 255, 0.3);
          color: var(--accent-primary);
        }

        .r-name {
          display: block;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .r-date {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .report-viewer {
          padding: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .viewer-header {
          padding: 30px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .trends-view .viewer-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .r-type {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .analysis-panels {
          padding: 30px;
        }

        .overall-summary-card {
          margin: 30px;
          padding: 24px;
          background: var(--surface-lighter);
          border-radius: 20px;
          border-left: 4px solid var(--accent-primary);
        }

        .overall-summary-card h3 {
          font-size: 18px;
          margin-bottom: 12px;
          color: var(--accent-primary);
        }

        .trends-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
          padding: 0 30px 30px;
        }

        .trend-item {
          padding: 20px;
        }

        .trend-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .trend-data {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .data-point {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .dp-date {
          color: var(--text-secondary);
        }

        .dp-val {
          font-weight: 700;
        }

        .trend-obs {
          font-size: 14px;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 20px;
          color: var(--text-secondary);
        }

        .medical-insight {
          background: rgba(0, 255, 136, 0.03);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 20px;
          padding: 24px;
        }

        .insight-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .confidence-tag {
          margin-left: auto;
          font-size: 12px;
          text-transform: uppercase;
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
        }

        .findings-grid {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .findings-grid ul {
          margin-top: 12px;
          padding-left: 20px;
          columns: 2;
        }

        .findings-grid li {
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .no-report-selected, .empty-viewer {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default Reports;
