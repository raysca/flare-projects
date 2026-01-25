import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const API_BASE = '/api/v1/dev';

interface Stats {
  users: number;
  projects: number;
  cycles: number;
  issues: number;
  comments: number;
  labels: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  stats?: Stats;
}

function DevTools() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data: ApiResponse = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSeed = async (clean: boolean) => {
    const action = clean ? 'seed-clean' : 'seed-append';
    setActionLoading(action);
    try {
      const res = await fetch(`${API_BASE}/seed?clean=${clean}`, { method: 'POST' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        showMessage('success', data.message || 'Database seeded successfully');
        fetchStats();
      } else {
        showMessage('error', data.error || 'Seed failed');
      }
    } catch (err) {
      showMessage('error', 'Failed to seed database');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      return;
    }
    setActionLoading('reset');
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      const data: ApiResponse = await res.json();
      if (data.success) {
        showMessage('success', data.message || 'Database reset successfully');
        fetchStats();
      } else {
        showMessage('error', data.error || 'Reset failed');
      }
    } catch (err) {
      showMessage('error', 'Failed to reset database');
    } finally {
      setActionLoading(null);
    }
  };

  const statItems = stats
    ? [
        { label: 'Users', value: stats.users, icon: '👤' },
        { label: 'Projects', value: stats.projects, icon: '📁' },
        { label: 'Cycles', value: stats.cycles, icon: '🔄' },
        { label: 'Issues', value: stats.issues, icon: '🎫' },
        { label: 'Comments', value: stats.comments, icon: '💬' },
        { label: 'Labels', value: stats.labels, icon: '🏷️' },
      ]
    : [];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.logo}>⚡</span> LinearFlow Dev Tools
        </h1>
        <span style={styles.badge}>Development</span>
      </header>

      {message && (
        <div
          style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#065f46' : '#7f1d1d',
            borderColor: message.type === 'success' ? '#10b981' : '#ef4444',
          }}
        >
          {message.type === 'success' ? '✓' : '✕'} {message.text}
        </div>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Database Statistics</h2>
        {loading ? (
          <div style={styles.loading}>Loading stats...</div>
        ) : (
          <div style={styles.statsGrid}>
            {statItems.map((item) => (
              <div key={item.label} style={styles.statCard}>
                <span style={styles.statIcon}>{item.icon}</span>
                <span style={styles.statValue}>{item.value}</span>
                <span style={styles.statLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={fetchStats}
          disabled={loading}
          style={{ ...styles.button, ...styles.secondaryButton, marginTop: '1rem' }}
        >
          🔄 Refresh Stats
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Database Actions</h2>
        <div style={styles.actionsGrid}>
          <div style={styles.actionCard}>
            <h3 style={styles.actionTitle}>Seed Database</h3>
            <p style={styles.actionDesc}>
              Populate the database with sample data including users, projects, issues, and more.
            </p>
            <div style={styles.buttonGroup}>
              <button
                onClick={() => handleSeed(true)}
                disabled={actionLoading !== null}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                {actionLoading === 'seed-clean' ? '⏳ Seeding...' : '🌱 Seed (Clean)'}
              </button>
              <button
                onClick={() => handleSeed(false)}
                disabled={actionLoading !== null}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                {actionLoading === 'seed-append' ? '⏳ Seeding...' : '➕ Seed (Append)'}
              </button>
            </div>
          </div>

          <div style={styles.actionCard}>
            <h3 style={styles.actionTitle}>Reset Database</h3>
            <p style={styles.actionDesc}>
              Delete ALL data from the database. This action cannot be undone.
            </p>
            <button
              onClick={handleReset}
              disabled={actionLoading !== null}
              style={{ ...styles.button, ...styles.dangerButton }}
            >
              {actionLoading === 'reset' ? '⏳ Resetting...' : '🗑️ Reset Database'}
            </button>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>API Endpoints</h2>
        <div style={styles.endpointList}>
          <div style={styles.endpoint}>
            <code style={styles.method}>GET</code>
            <code style={styles.path}>/api/v1/dev/stats</code>
            <span style={styles.endpointDesc}>Get database statistics</span>
          </div>
          <div style={styles.endpoint}>
            <code style={styles.method}>POST</code>
            <code style={styles.path}>/api/v1/dev/seed</code>
            <span style={styles.endpointDesc}>Seed database with sample data</span>
          </div>
          <div style={styles.endpoint}>
            <code style={styles.method}>POST</code>
            <code style={styles.path}>/api/v1/dev/reset</code>
            <span style={styles.endpointDesc}>Delete all data</span>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <p>LinearFlow Server • Bun + Hono + SQLite</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #262626',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logo: {
    fontSize: '1.75rem',
  },
  badge: {
    backgroundColor: '#7c3aed',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  message: {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    marginBottom: '1.5rem',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  section: {
    backgroundColor: '#171717',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    border: '1px solid #262626',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: '#f5f5f5',
  },
  loading: {
    color: '#a3a3a3',
    padding: '2rem',
    textAlign: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '1rem',
  },
  statCard: {
    backgroundColor: '#262626',
    borderRadius: '0.5rem',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  statIcon: {
    fontSize: '1.5rem',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#f5f5f5',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#a3a3a3',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },
  actionCard: {
    backgroundColor: '#262626',
    borderRadius: '0.5rem',
    padding: '1.25rem',
  },
  actionTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  actionDesc: {
    fontSize: '0.8rem',
    color: '#a3a3a3',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  button: {
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#404040',
    color: '#e5e5e5',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
    color: 'white',
  },
  endpointList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  endpoint: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem',
    backgroundColor: '#262626',
    borderRadius: '0.375rem',
    flexWrap: 'wrap',
  },
  method: {
    backgroundColor: '#065f46',
    color: '#6ee7b7',
    padding: '0.125rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  path: {
    color: '#a78bfa',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
  },
  endpointDesc: {
    color: '#a3a3a3',
    fontSize: '0.8rem',
    marginLeft: 'auto',
  },
  footer: {
    textAlign: 'center',
    color: '#525252',
    fontSize: '0.75rem',
    marginTop: '2rem',
  },
};

const root = createRoot(document.getElementById('root')!);
root.render(<DevTools />);
