import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                <header className="top-bar">
                    <div className="search-bar">
                        {/* Search placeholder */}
                        <input type="text" placeholder="Search insights..." className="glass-input" />
                    </div>
                    <div className="user-profile-brief">
                        <div className="status-indicator">
                            <span className="dot online"></span>
                            AI Core Online
                        </div>
                        <div className="avatar">JD</div>
                    </div>
                </header>
                <div className="content-inner animate-fade-in">
                    {children}
                </div>
            </main>

            <style jsx>{`
        .layout {
          display: flex;
          min-height: 100vh;
        }

        .main-content {
          flex: 1;
          margin-left: 260px;
          background: var(--bg-color);
          min-height: 100vh;
        }

        .top-bar {
          height: 80px;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          background: rgba(5, 5, 5, 0.4);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 90;
        }

        .glass-input {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 12px 20px;
          border-radius: 12px;
          color: white;
          width: 300px;
          outline: none;
          transition: border-color 0.3s ease;
        }

        .glass-input:focus {
          border-color: var(--accent-primary);
        }

        .user-profile-brief {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .status-indicator {
          font-size: 13px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(58, 134, 255, 0.05);
          border-radius: 20px;
          border: 1px solid rgba(58, 134, 255, 0.2);
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .dot.online {
          background: #00ff88;
          box-shadow: 0 0 10px #00ff88;
        }

        .avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }

        .content-inner {
          padding: 40px;
          max-width: 1400px;
          margin: 0 auto;
        }
      `}</style>
        </div>
    );
};

export default Layout;
