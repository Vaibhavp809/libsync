import React from 'react';
import Layout from '../components/Layout';

export default function Reports() {
  const download = async (path, filename) => {
    try {
      const res = await fetch(`http://localhost:5000${path}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed');
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reports & Exports</h1>
          <p style={styles.subtitle}>Export attendance and loan history as CSV</p>
        </div>
      </div>
      <div style={styles.cards}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>🗓️</div>
          <div style={styles.cardBody}>
            <h3 style={styles.cardTitle}>Attendance CSV</h3>
            <p style={styles.cardText}>Download all attendance records</p>
            <button style={styles.primaryBtn} onClick={() => download('/api/reports/attendance', 'attendance.csv')}>⬇️ Download</button>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>📚</div>
          <div style={styles.cardBody}>
            <h3 style={styles.cardTitle}>Loans CSV</h3>
            <p style={styles.cardText}>Download full loan history</p>
            <button style={styles.primaryBtn} onClick={() => download('/api/reports/loans', 'loans.csv')}>⬇️ Download</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  header: { marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' },
  title: { fontSize: '28px', fontWeight: '700', margin: 0, color: '#1e293b' },
  subtitle: { margin: 0, color: '#64748b' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' },
  cardIcon: { fontSize: '24px' },
  cardBody: { flex: 1 },
  cardTitle: { margin: '0 0 6px 0', color: '#1e293b' },
  cardText: { margin: '0 0 12px 0', color: '#64748b' },
  primaryBtn: { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 },
};


