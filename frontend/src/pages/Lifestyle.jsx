import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startDietConsultation, startWorkoutConsultation } from '../services/api';
import { Utensils, Dumbbell, MessageCircle, Loader } from 'lucide-react';

const Lifestyle = () => {
    const navigate = useNavigate();
    const [loadingType, setLoadingType] = useState(null);

    const startConsultation = async (type) => {
        setLoadingType(type);
        try {
            const res = type === 'diet' 
                ? await startDietConsultation("General Health")
                : await startWorkoutConsultation("General Fitness");
            
            navigate(`/chat?session=${res.data.session_id}`);
        } catch (err) {
            console.error("Consultation failed", err);
            alert(err.response?.data?.detail || "Failed to start consultation");
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
                            onClick={() => startConsultation('diet')}
                            disabled={loadingType === 'diet'}
                        >
                            {loadingType === 'diet' ? <Loader className="spin" size={18} /> : (
                                <><MessageCircle size={18} /> Start Consultation</>
                            )}
                        </button>
                    </div>

                    <div className="plan-body">
                        <div className="plan-info">
                            <MessageCircle size={48} color="var(--accent-primary)" />
                            <h3>Interactive Consultation</h3>
                            <p>I'll ask you questions about your eating habits, preferences, and lifestyle to create a truly personalized nutrition plan.</p>
                            <ul>
                                <li>✓ Review your lab results and health profile</li>
                                <li>✓ Understand your dietary preferences and restrictions</li>
                                <li>✓ Learn about your daily routine and goals</li>
                                <li>✓ Create a customized 7-day meal plan</li>
                            </ul>
                        </div>
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
                            onClick={() => startConsultation('workout')}
                            disabled={loadingType === 'workout'}
                        >
                            {loadingType === 'workout' ? <Loader className="spin" size={18} /> : (
                                <><MessageCircle size={18} /> Start Consultation</>
                            )}
                        </button>
                    </div>

                    <div className="plan-body">
                        <div className="plan-info">
                            <MessageCircle size={48} color="var(--accent-primary)" />
                            <h3>Interactive Consultation</h3>
                            <p>I'll ask about your fitness level, any injuries or limitations, and your goals to design a safe and effective workout plan.</p>
                            <ul>
                                <li>✓ Assess your current fitness level</li>
                                <li>✓ Identify any physical limitations or injuries</li>
                                <li>✓ Understand your schedule and preferences</li>
                                <li>✓ Create a personalized weekly workout routine</li>
                            </ul>
                        </div>
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

        .plan-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
          padding: 40px;
        }

        .plan-info h3 {
          font-size: 24px;
          color: var(--text-primary);
          margin: 0;
        }

        .plan-info p {
          font-size: 16px;
          color: var(--text-secondary);
          max-width: 500px;
          line-height: 1.6;
        }

        .plan-info ul {
          list-style: none;
          padding: 0;
          text-align: left;
          color: var(--text-primary);
        }

        .plan-info li {
          padding: 8px 0;
          font-size: 15px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
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
