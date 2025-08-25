import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import Table from '../components/Table';
import SearchInput from '../components/SearchInput';
import api from '../utils/api';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', studentID: '', department: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      // Only keep valid student objects
      const studentData = Array.isArray(res.data)
        ? res.data.filter(user => user && typeof user === 'object' && user.role === 'student' && user._id)
        : [];
      setStudents(studentData);
      setFilteredStudents(studentData);
    } catch (err) {
      alert('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter students based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students.filter(s => s && typeof s === 'object' && s._id));
      return;
    }

    const filtered = students.filter(student =>
      student && typeof student === 'object' && student._id && (
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.department?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', studentID: '', department: '' });
    setShowForm(true);
  };

  const openEdit = (stu) => {
    if (!stu) {
      console.warn('Tried to edit undefined student');
      return;
    }
    setEditing(stu);
    setForm({
      name: stu.name || '',
      email: stu.email || '',
      studentID: stu.studentID || '',
      department: stu.department || ''
    });
    setShowForm(true);
  };

  const saveStudent = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/users/${editing._id}`, form);
        alert('Student updated successfully!');
      } else {
        await api.post('/users', { ...form, role: 'student' });
        alert('Student created successfully!');
      }
      setShowForm(false);
      setEditing(null);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/users/${id}`);
      alert('Student deleted successfully!');
      fetchStudents();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const tableColumns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'studentID', header: 'Student ID (USN)' },
    { key: 'department', header: 'Department' },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, student) => (
        <div style={styles.actionButtons}>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(student); }}
            style={styles.editButton}
          >
            ✏️ Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteStudent(student._id); }}
            style={styles.deleteButton}
          >
            🗑️ Delete
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading students...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="Manage Students"
        subtitle="Create, edit, and manage student records with USN"
        actions={
          <button onClick={openCreate} style={styles.addButton}>
            ➕ Add Student
          </button>
        }
      />

      <Card
        title="Student Search"
        subtitle="Search students by name, email, USN, or department"
        icon="🔍"
        color="#3b82f6"
        style={styles.searchCard}
      >
        <SearchInput
          placeholder="Search students by name, email, USN, or department..."
          value={searchTerm}
          onChange={setSearchTerm}
          style={styles.searchInput}
        />
      </Card>

      <Card
        title={`Students (${filteredStudents.length})`}
        subtitle={`Showing ${filteredStudents.length} of ${students.length} students`}
        icon="👩‍🎓"
        color="#0ea5e9"
        style={styles.tableCard}
      >
        <Table
          columns={tableColumns}
          data={filteredStudents}
          emptyMessage="No students found"
        />
      </Card>

      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <Card
              title={editing ? 'Edit Student' : 'Add New Student'}
              subtitle={editing ? 'Update student information' : 'Create a new student record'}
              icon="👩‍🎓"
              color={editing ? "#f59e0b" : "#10b981"}
              style={styles.formCard}
            >
              <form onSubmit={saveStudent} style={styles.form}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      style={styles.input}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email Address *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      style={styles.input}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Student ID (USN) *</label>
                    <input
                      value={form.studentID}
                      onChange={(e) => setForm({ ...form, studentID: e.target.value })}
                      required
                      style={styles.input}
                      placeholder="e.g., 2MM22CS002"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Department</label>
                    <select
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      style={styles.select}
                    >
                      <option value="">Select Department</option>
                      <option value="CSE">Computer Science Engineering</option>
                      <option value="ECE">Electronics & Communication</option>
                      <option value="ME">Mechanical Engineering</option>
                      <option value="CE">Civil Engineering</option>
                      <option value="EEE">Electrical & Electronics</option>
                      <option value="IT">Information Technology</option>
                    </select>
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditing(null); }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    {editing ? 'Update Student' : 'Create Student'}
                  </button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  searchCard: {
    marginBottom: '24px'
  },
  searchInput: {
    maxWidth: '600px'
  },
  tableCard: {
    marginBottom: '24px'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  editButton: {
    padding: '6px 12px',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    background: 'white',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#3b82f6',
      color: 'white'
    }
  },
  deleteButton: {
    padding: '6px 12px',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    background: 'white',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#ef4444',
      color: 'white'
    }
  },
  addButton: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
    }
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  formCard: {
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    ':focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    cursor: 'pointer',
    ':focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  formActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0'
  },
  cancelButton: {
    padding: '12px 24px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    background: 'white',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#f9fafb',
      borderColor: '#9ca3af'
    }
  },
  submitButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  }
};


