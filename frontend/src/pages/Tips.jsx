import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const EN_TIPS = [
    { cat: 'Nutrition', icon: '🥗', color: '#10B981', bg: 'rgba(16,185,129,.1)', title: 'Drink enough water daily', body: 'In hot climates like Andhra Pradesh, adults need 3–4 litres of water daily. Add lemon or coconut water for electrolytes.' },
    { cat: 'Nutrition', icon: '🥗', color: '#10B981', bg: 'rgba(16,185,129,.1)', title: 'Include local superfoods', body: 'Foods like drumstick (moringa), curry leaves, turmeric, and ridge gourd are packed with nutrients and easily available in Telugu cuisine.' },
    { cat: 'Fitness', icon: '🏃', color: '#2563EB', bg: 'rgba(37,99,235,.1)', title: 'Walk 30 minutes every day', body: 'A brisk 30-minute walk each morning improves heart health, controls blood sugar, and boosts energy throughout the day.' },
    { cat: 'Fitness', icon: '🏃', color: '#2563EB', bg: 'rgba(37,99,235,.1)', title: 'Take stairs over elevator', body: 'Small changes matter. Taking stairs adds hundreds of steps to your daily activity without needing gym time.' },
    { cat: 'Sleep', icon: '😴', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', title: 'Sleep 7–8 hours nightly', body: 'Quality sleep reduces stress hormones, improves memory, and supports immune function. Avoid screens 30 min before bed.' },
    { cat: 'Sleep', icon: '😴', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', title: 'Keep a consistent sleep schedule', body: 'Going to bed and waking at the same time every day — even weekends — regulates your body clock and improves sleep quality.' },
    { cat: 'Mental Health', icon: '🧘', color: '#F59E0B', bg: 'rgba(245,158,11,.1)', title: 'Practice 5-minute breathing', body: 'Box breathing (4-4-4-4) for just 5 minutes reduces anxiety and lowers blood pressure. Do it before stressful situations.' },
    { cat: 'Mental Health', icon: '🧘', color: '#F59E0B', bg: 'rgba(245,158,11,.1)', title: 'Limit social media scrolling', body: 'Excessive scrolling raises cortisol levels. Set screen time limits and replace 30 min with reading or a hobby.' },
    { cat: 'Medicine', icon: '💊', color: '#EF4444', bg: 'rgba(239,68,68,.1)', title: 'Never skip prescribed doses', body: 'Completing your medication course is critical. Stopping early can cause antibiotic resistance and treatment failure.' },
    { cat: 'Medicine', icon: '💊', color: '#EF4444', bg: 'rgba(239,68,68,.1)', title: 'Check drug interactions', body: 'Always tell your doctor ALL medications and supplements you take. Even common remedies like ginger can interact with blood thinners.' },
    { cat: 'Lifestyle', icon: '🌿', color: '#06b6d4', bg: 'rgba(6,182,212,.1)', title: 'Avoid eating after 9 PM', body: 'Late night eating disrupts digestion and sleep. If hungry, opt for light foods like curd, banana, or warm milk.' },
    { cat: 'Lifestyle', icon: '🌿', color: '#06b6d4', bg: 'rgba(6,182,212,.1)', title: 'Regular health checkups', body: 'Annual blood tests (CBC, sugar, cholesterol) catch problems early. Prevention is always cheaper and better than cure.' },
    { cat: 'Nutrition', icon: '🥗', color: '#10B981', bg: 'rgba(16,185,129,.1)', title: 'Reduce processed foods', body: 'Packaged chips, instant noodles, and sugary drinks spike blood sugar and increase inflammation. Cook fresh food at home when possible.' },
    { cat: 'Fitness', icon: '🏃', color: '#2563EB', bg: 'rgba(37,99,235,.1)', title: 'Stretch for 5 min after waking', body: 'Morning stretches improve blood flow, reduce muscle stiffness, and prepare your body for the day ahead.' },
];

const TE_TIPS = [
    { cat: 'పోషణ', icon: '🥗', color: '#10B981', bg: 'rgba(16,185,129,.1)', title: 'రోజూ తగినంత నీరు తాగండి', body: 'ఆంధ్ర ప్రదేశ్ వంటి వేడి వాతావరణంలో పెద్దలు రోజుకు 3–4 లీటర్ల నీరు తాగాలి. విద్యుద్విద్యుత్ కొరకు నిమ్మకాయ లేదా కొబ్బరి నీరు కలపండి.' },
    { cat: 'వ్యాయామం', icon: '🏃', color: '#2563EB', bg: 'rgba(37,99,235,.1)', title: 'రోజూ 30 నిమిషాలు నడవండి', body: 'ఉదయాన్నే 30 నిమిషాలు నడవడం గుండె ఆరోగ్యాన్ని మెరుగుపరుస్తుంది, చక్కెరను నియంత్రిస్తుంది మరియు శక్తిని పెంచుతుంది.' },
    { cat: 'నిద్ర', icon: '😴', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', title: 'రాత్రి 7–8 గంటలు నిద్రపోండి', body: 'నాణ్యమైన నిద్ర ఒత్తిడి హార్మోన్లను తగ్గిస్తుంది, జ్ఞాపకశక్తిని మెరుగుపరుస్తుంది. నిద్రపోయే ముందు 30 నిమిషాలు స్క్రీన్ చూడకండి.' },
    { cat: 'మానసిక ఆరోగ్యం', icon: '🧘', color: '#F59E0B', bg: 'rgba(245,158,11,.1)', title: '5 నిమిషాలు శ్వాస వ్యాయామం', body: 'బాక్స్ బ్రీతింగ్ (4-4-4-4) కేవలం 5 నిమిషాలలో ఆందోళన తగ్గిస్తుంది మరియు రక్తపోటు తగ్గిస్తుంది.' },
    { cat: 'పోషణ', icon: '🥗', color: '#10B981', bg: 'rgba(16,185,129,.1)', title: 'స్థానిక సూపర్‌ఫుడ్స్ తినండి', body: 'మునగాకు, కరివేపాకు, పసుపు లాంటివి పోషకాలతో నిండి ఉంటాయి. తెలుగు వంటకాల్లో వీటిని ఎక్కువగా వాడండి.' },
    { cat: 'జీవనశైలి', icon: '🌿', color: '#06b6d4', bg: 'rgba(6,182,212,.1)', title: 'రాత్రి 9 తర్వాత తినకండి', body: 'రాత్రి పొద్దుగా తినడం జీర్ణక్రియ మరియు నిద్రను దెబ్బతీస్తుంది. ఆకలి అనిపిస్తే పెరుగు, అరటిపండు లేదా వెచ్చని పాలు తాగండి.' },
];

const Tips = () => {
    const { language, toggleLanguage } = useLanguage();
    const tips = language === 'telugu' ? TE_TIPS : EN_TIPS;
    const [activeCat, setActiveCat] = useState('All');

    const cats = ['All', ...new Set(tips.map(t => t.cat))];
    const shown = activeCat === 'All' ? tips : tips.filter(t => t.cat === activeCat);
    const todayTip = tips[new Date().getDate() % tips.length];

    return (
        <div style={{ minHeight: '100vh', background: '#0F1117' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1>{language === 'telugu' ? 'ఆరోగ్య చిట్కాలు' : 'Daily Health Tips'}</h1>
                        <p>{language === 'telugu' ? 'మీ ఆరోగ్యం కోసం ప్రతిరోజూ నూతన చిట్కాలు' : 'Fresh tips for your health every day'}</p>
                    </div>
                    <div className="lang-toggle">
                        <button className={language === 'english' ? 'active' : ''} onClick={() => language !== 'english' && toggleLanguage()}>EN</button>
                        <button className={language === 'telugu' ? 'active' : ''} onClick={() => language !== 'telugu' && toggleLanguage()}>తె</button>
                    </div>
                </div>

                {/* Tip of the Day */}
                <div style={{
                    background: `linear-gradient(135deg, rgba(37,99,235,.15), rgba(139,92,246,.1))`,
                    border: '1px solid rgba(37,99,235,.3)', borderRadius: 16, padding: '28px',
                    marginBottom: 28,
                }}>
                    <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        ✨ {language === 'telugu' ? 'ఈ రోజు చిట్కా' : 'Tip of the Day'}
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 36 }}>{todayTip.icon}</span>
                        <div>
                            <h2 style={{ marginBottom: 8 }}>{todayTip.title}</h2>
                            <p style={{ lineHeight: 1.7 }}>{todayTip.body}</p>
                            <span style={{ display: 'inline-block', marginTop: 12 }} className={`badge badge-blue`}>{todayTip.cat}</span>
                        </div>
                    </div>
                </div>

                {/* Category Filter */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                    {cats.map(c => (
                        <button
                            key={c}
                            className={`btn btn-sm ${activeCat === c ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveCat(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* Tips Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14 }}>
                    {shown.map((tip, i) => (
                        <div key={i} className="card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: tip.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                    {tip.icon}
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: tip.color, textTransform: 'uppercase', letterSpacing: .5 }}>{tip.cat}</span>
                            </div>
                            <h3 style={{ color: '#F8F9FA', fontWeight: 700 }}>{tip.title}</h3>
                            <p style={{ fontSize: '0.85rem', lineHeight: 1.65 }}>{tip.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Tips;
