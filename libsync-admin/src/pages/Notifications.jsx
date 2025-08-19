import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '', audienceType: 'all', department: '', studentID: '', type: 'app' });

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/notifications', auth());
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/notifications', form, auth());
      alert('Notification sent');
      setForm({ title: '', message: '', audienceType: 'all', department: '', studentID: '', type: 'app' });
      fetchList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send');
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Notifications</h1>
          <p style={styles.subtitle}>Send messages to students</p>
        </div>
      </div>

      <div style={styles.formContainer}>
        <h3 style={styles.formTitle}>Compose Notification</h3>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={styles.input} />
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Message *</label>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required style={styles.textarea} rows={4} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={styles.select}>
                <option value="app">In-app</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Audience</label>
              <select value={form.audienceType} onChange={(e) => setForm({ ...form, audienceType: e.target.value })} style={styles.select}>
                <option value="all">All students</option>
                <option value="department">Department</option>
                <option value="student">Specific Student</option>
              </select>
            </div>
            {form.audienceType === 'department' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={styles.input} />
              </div>
            )}
            {form.audienceType === 'student' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Student ID</label>
                <input value={form.studentID} onChange={(e) => setForm({ ...form, studentID: e.target.value })} style={styles.input} />
              </div>
            )}
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.primaryBtn}>📣 Send</button>
          </div>
        </form>
      </div>

      <div style={styles.tableWrapper}>
        <h3 style={styles.sectionTitle}>Recent Notifications</h3>
        {loading ? (
          <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Loading...</p></div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Recipient</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Message</th>
              </tr>
            </thead>
            <tbody>
              {list.map(n => (
                <tr key={n._id}>
                  <td style={styles.td}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : '-'}</td>
                  <td style={styles.td}>{n.user?.name || n.user?.email || n.user?.studentID || '—'}</td>
                  <td style={styles.td}>{n.type}</td>
                  <td style={styles.td}>{n.message}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td style={styles.emptyTd} colSpan="4">No notifications yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  header: { marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' },
  title: { fontSize: '28px', fontWeight: '700', margin: 0, color: '#1e293b' },
  subtitle: { margin: 0, color: '#64748b' },
  formContainer: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  formTitle: { margin: '0 0 12px 0', color: '#1e293b' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#475569' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#f9fafb' },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#f9fafb', width: '100%', resize: 'vertical' },
  select: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' },
  formActions: { display: 'flex', justifyContent: 'flex-end' },
  primaryBtn: { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 },
  sectionTitle: { margin: '0 0 12px 0', color: '#1e293b' },
  tableWrapper: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  emptyTd: { padding: '16px', textAlign: 'center', color: '#94a3b8' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#64748b' },
  spinner: { width: '30px', height: '30px', border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '10px' },
};


