import React, { useEffect, useState, useRef } from 'react';
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
  const [form, setForm] = useState({ name: '', email: '', password: '', studentID: '', department: '' });
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ id: '', name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [limit] = useState(50); // Students per page

  const fetchStudents = async (page = currentPage, searchQuery = searchTerm) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit
      };
      
      // Add search query if provided
      if (searchQuery && searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      
      const res = await api.get('/users', { params });
      
      // Handle both paginated and non-paginated responses
      let studentData = [];
      let paginationData = {};
      
      if (res.data && res.data.students && Array.isArray(res.data.students)) {
        // Paginated response
        studentData = res.data.students.filter(user => user && typeof user === 'object' && user.role === 'student' && user._id);
        paginationData = res.data.pagination || {};
        setTotalPages(paginationData.totalPages || 1);
        setTotalStudents(paginationData.totalStudents || 0);
        setCurrentPage(paginationData.currentPage || page);
      } else if (Array.isArray(res.data)) {
        // Legacy non-paginated response
        studentData = res.data.filter(user => user && typeof user === 'object' && user.role === 'student' && user._id);
        setTotalPages(1);
        setTotalStudents(studentData.length);
        setCurrentPage(1);
      }
      
      setStudents(studentData);
      setFilteredStudents(studentData);
    } catch (err) {
      console.error('Failed to load students:', err);
      alert('Failed to load students');
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
      console.error('Failed to load departments:', err);
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
    fetchStudents(1);
    fetchDepartments();
  }, []);
  
  // Track initial mount to avoid unnecessary API calls
  const isInitialMount = useRef(true);
  const searchTimerRef = useRef(null);
  
  // Fetch students when page changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentPage > 0) {
      fetchStudents(currentPage, searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Handle search - fetch from server when search term changes
  useEffect(() => {
    // Clear any existing timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    // Skip on initial mount
    if (isInitialMount.current) {
      return;
    }
    
    // Debounce search to avoid too many API calls
    searchTimerRef.current = setTimeout(() => {
      // Reset to page 1 when searching
      setCurrentPage(1);
      fetchStudents(1, searchTerm);
    }, 500); // 500ms debounce
    
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);
  
  // Update filtered students when students data changes (server already filters, but we show all on current page)
  useEffect(() => {
    setFilteredStudents(students.filter(s => s && typeof s === 'object' && s._id));
  }, [students]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', studentID: '', department: '' });
    setShowForm(true);
  };

  const openEdit = (stu) => {
    if (!stu || !stu._id) {
      console.warn('Tried to edit invalid student:', stu);
      alert('Invalid student data');
      return;
    }

    // Validate required student fields
    if (!stu.name || !stu.email || !stu.studentID) {
      console.warn('Student missing required fields:', stu);
      alert('Student data is incomplete');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(stu.email)) {
      console.warn('Invalid email format:', stu.email);
      alert('Invalid email format');
      return;
    }

    console.log('Opening edit for student:', stu);
    setEditing(stu);
    setForm({
      name: stu.name.trim(),
      email: stu.email.trim(),
      password: '',  // Password field starts empty when editing
      studentID: stu.studentID.trim(),
      department: stu.department ? stu.department.trim() : ''
    });
    setShowForm(true);
  };

  const saveStudent = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!form.name.trim() || !form.email.trim() || !form.studentID.trim()) {
        alert('Name, Email, and Student ID are required');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        alert('Please enter a valid email address');
        return;
      }

      // Validate student ID format (assuming it should be alphanumeric)
      if (!/^[A-Za-z0-9]+$/.test(form.studentID.trim())) {
        alert('Student ID should only contain letters and numbers');
        return;
      }

      if (editing) {
        // For editing: only include password if it's not empty
        const updateData = {
          name: form.name.trim(),
          email: form.email.trim(),
          studentID: form.studentID.trim(),
          department: form.department.trim()
        };

        // Include password only if it was provided
        if (form.password && form.password.trim()) {
          if (form.password.trim().length < 6) {
            alert('Password must be at least 6 characters long');
            return;
          }
          updateData.password = form.password.trim();
        }

        console.log('Updating student with data:', { ...updateData, password: updateData.password ? '***' : 'not changed' });
        await api.put(`/users/${editing._id}`, updateData);
        alert(`Student "${form.name.trim()}" updated successfully!${form.password && form.password.trim() ? ' Password has been reset.' : ''}`);
      } else {
        // For new students: require password
        if (!form.password || !form.password.trim()) {
          alert('Password is required for new students');
          return;
        }

        const newStudent = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          studentID: form.studentID,
          department: form.department,
          role: 'student'
        };

        console.log('Creating student with data:', { ...newStudent, password: '***' });
        const response = await api.post('/users', newStudent);
        alert('Student created successfully!');
      }
      setShowForm(false);
      setEditing(null);
      fetchStudents(currentPage, searchTerm);
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    }
  };

  const deleteStudent = async (id) => {
    if (!id) {
      console.warn('Tried to delete student with invalid ID:', id);
      return;
    }
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      console.log('Deleting student with ID:', id);
      await api.delete(`/users/${id}`);
      alert('Student deleted successfully!');
      await fetchStudents(currentPage, searchTerm);
    } catch (err) {
      console.error('Failed to delete student:', err);
      alert('Delete failed: ' + (err.response?.data?.message || err.message || 'Unknown error'));
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
      render: (student) => {
        // Validate student object
        if (!student || !student._id) {
          console.warn('Invalid student object in table row:', student);
          return <div>Invalid data</div>;
        }

        return (
          <div style={styles.actionButtons}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (student && student._id) {
                  openEdit(student);
                } else {
                  console.warn('Cannot edit: Invalid student data', student);
                }
              }}
              style={styles.editButton}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (student && student._id) {
                  deleteStudent(student._id);
                } else {
                  console.warn('Cannot delete: Invalid student data', student);
                }
              }}
              style={styles.deleteButton}
            >
              Delete
            </button>
          </div>
        );
      }
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
            Add Student
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
        title={`Students (${totalStudents})`}
        subtitle={`Showing ${filteredStudents.length} of ${totalStudents} students (Page ${currentPage} of ${totalPages})`}
        icon="👩‍🎓"
        color="#0ea5e9"
        style={styles.tableCard}
      >
        <Table
          columns={tableColumns}
          data={filteredStudents.filter(s => s && typeof s === 'object' && s._id)}
          emptyMessage="No students found"
        />
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={styles.paginationContainer}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              style={{
                ...styles.paginationButton,
                ...(currentPage === 1 || loading ? styles.paginationButtonDisabled : {})
              }}
            >
              ← Previous
            </button>
            
            <div style={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              style={{
                ...styles.paginationButton,
                ...(currentPage === totalPages || loading ? styles.paginationButtonDisabled : {})
              }}
            >
              Next →
            </button>
          </div>
        )}
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
                      onChange={(e) => setForm({ ...form, studentID: e.target.value.toUpperCase() })}
                      required
                      style={styles.input}
                      placeholder="e.g., 2MM22CS002"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Password {editing ? '(Leave empty to keep unchanged)' : '*'}
                      {editing && (
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>
                          Or use "Reset Password" button below
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required={!editing}
                      minLength={6}
                      style={styles.input}
                      placeholder={editing ? "Enter new password (optional, min. 6 chars)" : "Enter password (min. 6 characters)"}
                    />
                  </div>
                  {editing && (
                    <div style={styles.formGroup}>
                      <button
                        type="button"
                        onClick={async () => {
                          const newPassword = prompt('Enter new password (min. 6 characters):');
                          if (newPassword && newPassword.trim()) {
                            if (newPassword.trim().length < 6) {
                              alert('Password must be at least 6 characters long');
                              return;
                            }
                            try {
                              await api.put(`/users/${editing._id}/reset-password`, {
                                password: newPassword.trim()
                              });
                              alert(`Password reset successfully for "${form.name.trim()}"!`);
                              // Clear password field in form
                              setForm({ ...form, password: '' });
                            } catch (err) {
                              alert(err.response?.data?.message || 'Failed to reset password');
                            }
                          }
                        }}
                        style={styles.resetPasswordButton}
                      >
                        🔐 Reset Password
                      </button>
                    </div>
                  )}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Department</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        style={{ ...styles.select, flex: 1 }}
                        disabled={loadingDepartments}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowDepartmentModal(true)}
                        style={styles.manageDeptButton}
                        title="Manage Departments"
                      >
                        ⚙️
                      </button>
                    </div>
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

      {/* Department Management Modal */}
      {showDepartmentModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDepartmentModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Manage Departments</h2>
              <button 
                onClick={() => setShowDepartmentModal(false)}
                style={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.addDeptSection}>
                <h3 style={styles.sectionTitle}>Add New Department</h3>
                <div style={styles.addDeptForm}>
                  <input
                    type="text"
                    placeholder="Department ID (e.g., CSE)"
                    value={newDepartment.id}
                    onChange={(e) => setNewDepartment({ ...newDepartment, id: e.target.value.toUpperCase() })}
                    style={styles.modalInput}
                    maxLength={10}
                  />
                  <input
                    type="text"
                    placeholder="Department Name (e.g., Computer Science Engineering)"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    style={styles.modalInput}
                  />
                  <button
                    onClick={async () => {
                      if (!newDepartment.id || !newDepartment.name) {
                        alert('Please enter both ID and name');
                        return;
                      }
                      try {
                        await api.post('/departments', newDepartment);
                        alert('Department created successfully!');
                        setNewDepartment({ id: '', name: '' });
                        await fetchDepartments();
                      } catch (err) {
                        alert(err.response?.data?.message || 'Failed to create department');
                      }
                    }}
                    style={styles.addDeptButton}
                  >
                    Add Department
                  </button>
                </div>
              </div>

              <div style={styles.deptListSection}>
                <h3 style={styles.sectionTitle}>Existing Departments</h3>
                <div style={styles.deptList}>
                  {departments.map((dept) => (
                    <div key={dept.id} style={styles.deptItem}>
                      <div style={styles.deptInfo}>
                        <strong>{dept.id}</strong> - {dept.name}
                      </div>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to delete department "${dept.name}"? This action cannot be undone.`)) return;
                          try {
                            await api.delete(`/departments/${dept.id}`);
                            alert('Department deleted successfully!');
                            await fetchDepartments();
                          } catch (err) {
                            alert(err.response?.data?.message || 'Failed to delete department');
                          }
                        }}
                        style={styles.deleteDeptButton}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
  resetPasswordButton: {
    padding: '10px 20px',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    background: 'white',
    color: '#f59e0b',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    ':hover': {
      background: '#fef3c7',
      borderColor: '#d97706'
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
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0'
  },
  paginationButton: {
    padding: '10px 20px',
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
      borderColor: '#3b82f6',
      color: '#3b82f6'
    }
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    ':hover': {
      background: 'white',
      borderColor: '#d1d5db',
      color: '#374151'
    }
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  manageDeptButton: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937'
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '20px'
  },
  addDeptSection: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px'
  },
  addDeptForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  modalInput: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px'
  },
  addDeptButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    background: '#3b82f6',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  deptListSection: {
    marginTop: '20px'
  },
  deptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  deptItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#f9fafb'
  },
  deptInfo: {
    fontSize: '14px',
    color: '#374151'
  },
  deleteDeptButton: {
    padding: '6px 12px',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    background: 'white',
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};


