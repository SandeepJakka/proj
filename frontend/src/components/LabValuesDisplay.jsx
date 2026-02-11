import React from 'react';
import { Activity, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * LabValuesDisplay - Shows structured lab values with clinical benchmarking
 * 
 * Displays each lab test with:
 * - Color-coded status badge (critical/high/normal/low)
 * - Actual value vs reference range
 * - Clinical interpretation
 */
const LabValuesDisplay = ({ labValues }) => {
    if (!labValues || labValues.length === 0) {
        return (
            <div className="no-lab-values">
                <Activity size={40} strokeWidth={1.5} style={{ opacity: 0.3 }} />
                <p>No structured lab values found in this report.</p>
                <small>Upload a report with lab results (CBC, metabolic panel, etc.)</small>
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'normal': return '#10b981';  // Green
            case 'low': return '#f59e0b';  // Orange
            case 'high': return '#f59e0b';  // Orange
            case 'critical_low': return '#ef4444';  // Red
            case 'critical_high': return '#ef4444';  // Red
            default: return '#6b7280';  // Gray
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'normal': return <CheckCircle size={16} />;
            case 'low':
            case 'high': return <AlertCircle size={16} />;
            case 'critical_low':
            case 'critical_high': return <AlertTriangle size={16} />;
            default: return <Activity size={16} />;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'normal': return 'NORMAL';
            case 'low': return 'LOW';
            case 'high': return 'HIGH';
            case 'critical_low': return '⚠️ CRITICAL LOW';
            case 'critical_high': return '⚠️ CRITICAL HIGH';
            default: return 'UNKNOWN';
        }
    };

    return (
        <div className="lab-values-container">
            <div className="lab-values-header">
                <h3>📊 Structured Lab Values</h3>
                <span className="lab-count">{labValues.length} tests analyzed</span>
            </div>

            <div className="lab-values-grid">
                {labValues.map((lab, index) => (
                    <div key={index} className="lab-value-card">
                        <div className="lab-header">
                            <span className="lab-test-name">{lab.test_name}</span>
                            <span
                                className="lab-status-badge"
                                style={{
                                    backgroundColor: `${getStatusColor(lab.status)}22`,
                                    color: getStatusColor(lab.status),
                                    border: `1px solid ${getStatusColor(lab.status)}55`
                                }}
                            >
                                {getStatusIcon(lab.status)}
                                {getStatusLabel(lab.status)}
                            </span>
                        </div>

                        <div className="lab-value">
                            <span className="value-number">{lab.value}</span>
                            <span className="value-unit">{lab.unit}</span>
                        </div>

                        {lab.normal_range && (
                            <div className="lab-range">
                                <small>Normal Range: {lab.normal_range.min} - {lab.normal_range.max} {lab.unit}</small>
                            </div>
                        )}

                        {lab.interpretation && (
                            <div className="lab-interpretation">
                                <p>{lab.interpretation}</p>
                            </div>
                        )}

                        {lab.severity && (
                            <div className="lab-severity">
                                <small style={{ color: lab.severity === 'severe' ? '#ef4444' : '#f59e0b' }}>
                                    Severity: {lab.severity}
                                </small>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .lab-values-container {
                    margin: 30px 0;
                }

                .lab-values-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid var(--border-color);
                }

                .lab-values-header h3 {
                    margin: 0;
                    font-size: 20px;
                }

                .lab-count {
                    font-size: 13px;
                    color: var(--text-secondary);
                    background: var(--surface-lighter);
                    padding: 6px 12px;
                    border-radius: 20px;
                }

                .lab-values-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }

                .lab-value-card {
                    background: var(--surface-lighter);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 20px;
                    transition: all 0.2s;
                }

                .lab-value-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--accent-primary);
                    box-shadow: 0 4px 12px rgba(58, 134, 255, 0.15);
                }

                .lab-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                    gap: 10px;
                }

                .lab-test-name {
                    font-weight: 600;
                    font-size: 15px;
                    color: white;
                    flex: 1;
                }

                .lab-status-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                }

                .lab-value {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                    margin-bottom: 10px;
                }

                .value-number {
                    font-size: 32px;
                    font-weight: 700;
                    color: var(--accent-primary);
                }

                .value-unit {
                    font-size: 16px;
                    color: var(--text-secondary);
                }

                .lab-range {
                    margin-bottom: 12px;
                }

                .lab-range small {
                    color: var(--text-secondary);
                    background: rgba(255, 255, 255, 0.03);
                    padding: 4px 8px;
                    border-radius: 6px;
                    display: inline-block;
                }

                .lab-interpretation {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-color);
                }

                .lab-interpretation p {
                    margin: 0;
                    font-size: 13px;
                    line-height: 1.6;
                    color: var(--text-secondary);
                }

                .lab-severity {
                    margin-top: 8px;
                }

                .lab-severity small {
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.5px;
                }

                .no-lab-values {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-secondary);
                }

                .no-lab-values p {
                    margin: 15px 0 5px;
                    font-size: 16px;
                }

                .no-lab-values small {
                    font-size: 13px;
                    opacity: 0.7;
                }
            `}</style>
        </div>
    );
};

export default LabValuesDisplay;
