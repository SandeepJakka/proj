import React, { useState } from 'react';
import { getDietPlan, getWorkoutPlan } from '../services/api';
import { Utensils, Dumbbell, Sparkles, Loader, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Lifestyle = () => {
    const [dietPlan, setDietPlan] = useState("");
    const [workoutPlan, setWorkoutPlan] = useState("");
    const [loadingType, setLoadingType] = useState(null); // 'diet' or 'workout'

    const fetchPlan = async (type) => {
        setLoadingType(type);
        try {
            if (type === 'diet') {
                const res = await getDietPlan("General Health");
                setDietPlan(res.data.markdown_plan);
            } else {
                const res = await getWorkoutPlan("General Fitness");
                setWorkoutPlan(res.data.markdown_plan);
            }
        } catch (err) {
            console.error("Plan generation failed", err);
        } finally {
            setLoadingType(null);
        }
    };

    return (
        <div className="lifestyle-page">
            <header className="page-header">
                <h1>Lifestyle Intelligence</h1>
                <p>AI-generated routines focused on longevity and safety.</p>
            </header>

            <div className="plans-grid">
                <section className="plan-section card">
                    <div className="p-header">
                        <div className="p-icon" style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b' }}>
                            <Utensils size={28} />
                        </div>
                        <div className="p-title">
                            <h2>Nutritional Guide</h2>
                            <p>Personalized meal plans</p>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={() => fetchPlan('diet')}
                            disabled={loadingType === 'diet'}
                        >
                            {loadingType === 'diet' ? <Loader className="spin" size={18} /> : 'Generate Plan'}
                        </button>
                    </div>

                    <div className="plan-body">
                        {dietPlan ? (
                            <div className="markdown-content">
                                <ReactMarkdown>{dietPlan}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="plan-placeholder">
                                <Sparkles size={40} color="var(--border-color)" />
                                <p>Request a diet plan tailored to your profile.</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="plan-section card">
                    <div className="p-header">
                        <div className="p-icon" style={{ background: 'rgba(77, 150, 255, 0.1)', color: '#4d96ff' }}>
                            <Dumbbell size={28} />
                        </div>
                        <div className="p-title">
                            <h2>Adaptive Fitness</h2>
                            <p>Condition-aware workouts</p>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={() => fetchPlan('workout')}
                            disabled={loadingType === 'workout'}
                        >
                            {loadingType === 'workout' ? <Loader className="spin" size={18} /> : 'Generate Plan'}
                        </button>
                    </div>

                    <div className="plan-body">
                        {workoutPlan ? (
                            <div className="markdown-content">
                                <ReactMarkdown>{workoutPlan}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="plan-placeholder">
                                <Sparkles size={40} color="var(--border-color)" />
                                <p>Request a workout plan based on your activity level.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <style jsx>{`
        .lifestyle-page {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .plan-section {
          display: flex;
          flex-direction: column;
          gap: 30px;
          min-height: 600px;
        }

        .p-header {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .p-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .p-title h2 {
          font-size: 22px;
          margin-bottom: 4px;
        }

        .p-title p {
          font-size: 14px;
        }

        .p-header .btn-primary {
          margin-left: auto;
          white-space: nowrap;
        }

        .plan-body {
          flex: 1;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 20px;
          padding: 30px;
          overflow-y: auto;
          border: 1px solid var(--border-color);
        }

        .plan-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
          color: var(--text-secondary);
        }

        .markdown-content {
          color: var(--text-primary);
        }

        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
           margin: 20px 0 10px 0;
           color: var(--accent-primary);
        }

        .markdown-content p {
          margin-bottom: 15px;
          color: var(--text-primary);
        }

        .markdown-content ul {
          margin-left: 20px;
          margin-bottom: 15px;
        }

        .markdown-content li {
          margin-bottom: 8px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default Lifestyle;
