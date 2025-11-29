import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '', audienceType: 'all', department: '', studentID: '', type: 'app' });
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);


  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      // Admin endpoint returns { notifications: [...], pagination: {...} }
      if (res.data && res.data.notifications && Array.isArray(res.data.notifications)) {
        setList(res.data.notifications);
      } else if (Array.isArray(res.data)) {
        // Fallback for legacy format
        setList(res.data);
      } else {
        setList([]);
      }
    } catch (err) {
      alert('Failed to load notifications');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const res = await api.get('/departments');
      if (res.data.success && res.data.departments) {
        setDepartments(res.data.departments);
      }
    } catch (err) {
      // Fallback to hardcoded list if API fails
      setDepartments([
        { id: 'CSE', name: 'Computer Science Engineering' },
        { id: 'ECE', name: 'Electronics & Communication' },
        { id: 'ME', name: 'Mechanical Engineering' },
        { id: 'CE', name: 'Civil Engineering' },
        { id: 'EEE', name: 'Electrical & Electronics' },
        { id: 'IT', name: 'Information Technology' },
      ]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => { 
    fetchList();
    fetchDepartments();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.title || !form.message) {
      alert('Title and message are required');
      return;
    }
    
    if (form.audienceType === 'department' && !form.department) {
      alert('Department is required when targeting a department');
      return;
    }
    
    if (form.audienceType === 'student' && !form.studentID) {
      alert('Student ID is required when targeting a specific student');
      return;
    }
    
    try {
      // Map audienceType to new target format
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type || 'app',
        target: form.audienceType === 'all' ? 'all' : 
                form.audienceType === 'department' ? 'department' : 'user'
      };
      
      if (form.audienceType === 'department') {
        payload.department = form.department;
      } else if (form.audienceType === 'student') {
        payload.userId = form.studentID; // Backend will resolve studentID to userId
      }
      
      await api.post('/notifications', payload);
      alert('Notification sent');
      setForm({ title: '', message: '', audienceType: 'all', department: '', studentID: '', type: 'app' });
      fetchList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send');
    }
  };

  const handleDelete = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/notifications/${notificationId}`);
      alert('Notification deleted successfully');
      fetchList(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const handleDeleteAll = async () => {
    const confirmMessage = `Are you sure you want to delete ALL notifications? This action cannot be undone.\n\nThis will delete ${list.length} notification(s).`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete('/notifications/all');
      alert('All notifications deleted successfully');
      fetchList(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete all notifications');
    } finally {
      setLoading(false);
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
                <label style={styles.label}>Department *</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  required={form.audienceType === 'department'}
                  style={styles.select}
                  disabled={loadingDepartments}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.audienceType === 'student' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Student ID *</label>
                <input 
                  value={form.studentID} 
                  onChange={(e) => setForm({ ...form, studentID: e.target.value.toUpperCase() })} 
                  required={form.audienceType === 'student'}
                  style={styles.input} 
                  placeholder="Student USN or ID"
                />
              </div>
            )}
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.primaryBtn}>📣 Send</button>
          </div>
        </form>
      </div>

      <div style={styles.tableWrapper}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Recent Notifications</h3>
          <button
            onClick={handleDeleteAll}
            style={loading || list.length === 0 ? { ...styles.deleteAllBtn, ...styles.deleteAllBtnDisabled } : styles.deleteAllBtn}
            disabled={loading || list.length === 0}
            title="Delete all notifications"
          >
            🗑️ Delete All
          </button>
        </div>
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
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(n => {
                // Determine recipient display
                let recipientDisplay = '—';
                if (n.broadcast) {
                  recipientDisplay = 'All students';
                } else if (n.recipient || n.targetUsers?.length > 0) {
                  const targetUser = n.targetUsers?.[0] || n.recipient;
                  recipientDisplay = targetUser?.name || targetUser?.email || targetUser?.studentID || 'Specific user';
                } else if (n.department) {
                  recipientDisplay = `${n.department} department`;
                } else if (n.user) {
                  recipientDisplay = n.user?.name || n.user?.email || n.user?.studentID || '—';
                }
                
                return (
                  <tr key={n._id}>
                    <td style={styles.td}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : '-'}</td>
                    <td style={styles.td}>{recipientDisplay}</td>
                    <td style={styles.td}>{n.type}</td>
                    <td style={styles.td}>{n.message}</td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => handleDelete(n._id)}
                        style={styles.deleteBtn}
                        title="Delete notification"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td style={styles.emptyTd} colSpan="5">No notifications yet</td></tr>
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
  sectionTitle: { margin: 0, color: '#1e293b' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  tableWrapper: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  emptyTd: { padding: '16px', textAlign: 'center', color: '#94a3b8' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#64748b' },
  spinner: { width: '30px', height: '30px', border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '10px' },
  deleteBtn: { 
    background: '#ef4444', 
    color: 'white', 
    border: 'none', 
    borderRadius: '6px', 
    padding: '6px 12px', 
    cursor: 'pointer', 
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background 0.2s',
  },
  deleteAllBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  deleteAllBtnDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
};


