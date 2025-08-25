import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function OverdueBooks() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ finePerDay: 10 });


  const fetchOverdue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/loans/overdue');
      setLoans(Array.isArray(res.data) ? res.data : []);
      const s = await api.get('/settings');
      setSettings(s.data || { finePerDay: 10 });
    } catch (err) {
      alert('Failed to load overdue loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOverdue(); }, []);

  /* Debug: log loans array after fetch
  useEffect(() => {
    if (loans && loans.length > 0) {
      console.log('DEBUG OverdueBooks loans:', loans);
      loans.forEach((l, idx) => {
        console.log(`Loan[${idx}] _id:`, l._id);
      });
    }
  }, [loans]);*/

  const daysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const ms = Date.now() - new Date(dueDate).getTime();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  };

  const fineFor = (dueDate) => daysOverdue(dueDate) * (settings.finePerDay || 10);

  const sendReminder = async (_id) => {
    if (!_id) {
      alert('Error: Loan ID is missing! Cannot send reminder.');
      return;
    }
    try {
      await api.post(`/loans/${_id}/reminder`);
      alert('Reminder sent');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to send reminder');
    }
  };

  const sendAllReminders = async () => {
    if (!window.confirm('Send reminders to all overdue loans?')) return;
    for (const l of loans) {
      try { // best-effort
        await api.post(`/loans/${l._id}/reminder`);
      } catch (e) { }
    }
    alert('Reminder job triggered for all');
  };

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Overdue Books</h1>
          <p style={styles.subtitle}>Loans past their due date</p>
        </div>
        <button onClick={fetchOverdue} style={styles.refreshButton}>⟳ Refresh</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={sendAllReminders} style={{ border: '1px solid #e2e8f0', background: 'white', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>📧 Send All Reminders</button>
      </div>
      {loading ? (
        <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Loading...</p></div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Book Title</th>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Issue Date</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Days Overdue</th>
                <th style={styles.th}>Fine</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map(l => (
                <tr key={l._id}>
                  <td style={styles.td}>{l.book?.title || 'Unknown'}</td>
                  <td style={styles.td}>{l.student?.name || l.student?.email || l.student?.studentID || 'Unknown'}</td>
                  <td style={styles.td}>{l.student?.email || '-'}</td>
                  <td style={styles.td}>{l.issueDate ? new Date(l.issueDate).toLocaleDateString() : '-'}</td>
                  <td style={styles.td}>{l.dueDate ? new Date(l.dueDate).toLocaleDateString() : '-'}</td>
                  <td style={styles.td}>{daysOverdue(l.dueDate)}</td>
                  <td style={styles.td}>₹{fineFor(l.dueDate)}</td>
                  <td style={styles.td}>
                    <button onClick={() => sendReminder(l._id)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer' }}>Send Reminder</button>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr><td style={styles.emptyTd} colSpan="8">No overdue books 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' },
  title: { fontSize: '28px', fontWeight: '700', margin: 0, color: '#1e293b' },
  subtitle: { margin: 0, color: '#64748b' },
  refreshButton: { border: '1px solid #e2e8f0', background: 'white', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' },
  tableWrapper: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  emptyTd: { padding: '20px', textAlign: 'center', color: '#94a3b8' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748b' },
  spinner: { width: '34px', height: '34px', border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '10px' },
};


