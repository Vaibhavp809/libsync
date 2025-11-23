import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function Settings() {
  const [settings, setSettings] = useState({ loanDurationDays: 14, attendanceQrExpiryHours: 1, emailTemplates: { overdueReminder: '', reservationReady: '' } });
  const [loading, setLoading] = useState(true);


  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      setSettings(res.data || settings);
    } catch (err) {
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings', settings);
      alert('Settings saved');
    } catch (err) {
      alert('Save failed');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Loading settings...</p></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>Configure application defaults</p>
        </div>
      </div>

      <form onSubmit={save} style={styles.formContainer}>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Default Loan Duration (days)</label>
            <input type="number" min="1" value={settings.loanDurationDays}
              onChange={(e) => setSettings({ ...settings, loanDurationDays: Number(e.target.value) })}
              style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Attendance QR Expiry (hours)</label>
            <input type="number" min="1" step="0.5" value={settings.attendanceQrExpiryHours}
              onChange={(e) => setSettings({ ...settings, attendanceQrExpiryHours: Number(e.target.value) })}
              style={styles.input} />
            <small style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Duration for which the QR code remains valid (e.g., 1 = 1 hour, 2.5 = 2.5 hours)
            </small>
          </div>
          <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Overdue Email Template</label>
            <textarea value={settings.emailTemplates?.overdueReminder || ''}
              onChange={(e) => setSettings({ ...settings, emailTemplates: { ...settings.emailTemplates, overdueReminder: e.target.value } })}
              rows={4} style={styles.textarea} />
          </div>
          <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Reservation Ready Email Template</label>
            <textarea value={settings.emailTemplates?.reservationReady || ''}
              onChange={(e) => setSettings({ ...settings, emailTemplates: { ...settings.emailTemplates, reservationReady: e.target.value } })}
              rows={4} style={styles.textarea} />
          </div>
        </div>
        <div style={styles.formActions}>
          <button type="submit" style={styles.primaryBtn}>💾 Save Settings</button>
        </div>
      </form>
    </Layout>
  );
}

const styles = {
  header: { marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' },
  title: { fontSize: '28px', fontWeight: '700', margin: 0, color: '#1e293b' },
  subtitle: { margin: 0, color: '#64748b' },
  formContainer: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#475569' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#f9fafb' },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#f9fafb', width: '100%', resize: 'vertical' },
  formActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '12px' },
  primaryBtn: { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748b' },
  spinner: { width: '34px', height: '34px', border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '10px' },
};


