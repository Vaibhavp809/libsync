import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const newsTypes = [
  'job_opening',
  'campus_drive', 
  'company_visit',
  'placement_stats',
  'success_story',
  'announcement',
  'interview_tips',
  'other'
];

const departments = [
  { value: 'CSE', label: 'Computer Science Engineering' },
  { value: 'ECE', label: 'Electronics & Communication' },
  { value: 'ME', label: 'Mechanical Engineering' },
  { value: 'CE', label: 'Civil Engineering' },
  { value: 'EEE', label: 'Electrical & Electronics' },
  { value: 'IT', label: 'Information Technology' }
];

const priorityLevels = [
  'low',
  'medium',
  'high',
  'urgent'
];

const getTypeIcon = (type) => {
  switch (type) {
    case 'job_opening': return '💼';
    case 'campus_drive': return '🎓';
    case 'company_visit': return '🏢';
    case 'announcement': return '📢';
    case 'success_story': return '🏆';
    case 'interview_tips': return '💡';
    case 'placement_stats': return '📊';
    default: return '📰';
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent': return '#ef4444';
    case 'high': return '#f59e0b';
    case 'medium': return '#3b82f6';
    case 'low': return '#10b981';
    default: return '#6b7280';
  }
};

export default function PlacementNewsPage() {
  // State management
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'announcement',
    summary: '',
    priority: 'medium',
    targetDepartments: [],
    targetBatches: [],
    company: {
      name: '',
      industry: '',
      location: '',
      website: ''
    },
    jobDetails: {
      position: '',
      salary: '',
      experience: '',
      skills: [],
      location: '',
      applicationDeadline: ''
    },
    tags: [],
    eventDate: '',
    registrationDeadline: '',
    expiresAt: '',
    isPinned: false
  });
  
  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  // Fetch news from API
  const fetchNews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE_URL}/placement-news/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: page + 1,
          limit: rowsPerPage
        }
      });
      
      setNewsItems(response.data.news || []);
      setTotalCount(response.data.pagination?.totalNews || 0);
    } catch (error) {
      console.error('Error fetching placement news:', error);
      showNotification('Failed to fetch placement news', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create or update news
  const saveNews = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const isEditing = editingNews !== null;
      
      const newsData = {
        ...formData,
        // Ensure arrays are properly formatted
        targetDepartments: Array.isArray(formData.targetDepartments) ? formData.targetDepartments : [],
        targetBatches: Array.isArray(formData.targetBatches) ? formData.targetBatches : [],
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        // Convert date strings to Date objects if provided
        eventDate: formData.eventDate ? new Date(formData.eventDate) : undefined,
        registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
        // Format job details properly
        jobDetails: {
          ...formData.jobDetails,
          applicationDeadline: formData.jobDetails.applicationDeadline ? new Date(formData.jobDetails.applicationDeadline) : undefined,
          skills: Array.isArray(formData.jobDetails.skills) ? formData.jobDetails.skills : []
        }
      };
      
      // Remove undefined fields
      Object.keys(newsData).forEach(key => {
        if (newsData[key] === undefined) {
          delete newsData[key];
        }
      });
      
      console.log('Sending news data:', newsData);

      if (isEditing) {
        await axios.put(`${API_BASE_URL}/placement-news/admin/${editingNews._id}`, newsData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Placement news updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/placement-news/admin/create`, newsData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Placement news created successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchNews();
    } catch (error) {
      console.error('Error saving placement news:', error);
      showNotification(error.response?.data?.message || 'Failed to save placement news', 'error');
    }
  };

  // Delete news
  const deleteNews = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE_URL}/placement-news/admin/${newsToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification('Placement news deleted successfully');
      setDeleteDialogOpen(false);
      setNewsToDelete(null);
      fetchNews();
    } catch (error) {
      console.error('Error deleting placement news:', error);
      showNotification('Failed to delete placement news', 'error');
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'announcement',
      summary: '',
      priority: 'medium',
      targetDepartments: [],
      targetBatches: [],
      company: {
        name: '',
        industry: '',
        location: '',
        website: ''
      },
      jobDetails: {
        position: '',
        salary: '',
        experience: '',
        skills: [],
        location: '',
        applicationDeadline: ''
      },
      tags: [],
      eventDate: '',
      registrationDeadline: '',
      expiresAt: '',
      isPinned: false
    });
    setEditingNews(null);
  };

  // Open edit dialog
  const handleEdit = (news) => {
    setEditingNews(news);
    setFormData({
      title: news.title || '',
      content: news.content || '',
      type: news.type || 'announcement',
      summary: news.summary || '',
      priority: news.priority || 'medium',
      targetDepartments: news.targetDepartments || [],
      targetBatches: news.targetBatches || [],
      company: news.company || { name: '', industry: '', location: '', website: '' },
      jobDetails: {
        position: news.jobDetails?.position || '',
        salary: news.jobDetails?.salary || '',
        experience: news.jobDetails?.experience || '',
        skills: news.jobDetails?.skills || [],
        location: news.jobDetails?.location || '',
        applicationDeadline: news.jobDetails?.applicationDeadline ? news.jobDetails.applicationDeadline.split('T')[0] : ''
      },
      tags: news.tags || [],
      eventDate: news.eventDate ? news.eventDate.split('T')[0] : '',
      registrationDeadline: news.registrationDeadline ? news.registrationDeadline.split('T')[0] : '',
      expiresAt: news.expiresAt ? news.expiresAt.split('T')[0] : '',
      isPinned: news.isPinned || false
    });
    setDialogOpen(true);
  };

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({
      show: true,
      message,
      type
    });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 5000);
  };

  // Load data on component mount and when pagination changes
  useEffect(() => {
    fetchNews();
  }, [page, rowsPerPage]);

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading placement news...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="Placement News Management"
        subtitle="Manage placement announcements, job postings, and career news"
      />

      {/* Notification */}
      {notification.show && (
        <div style={{
          ...styles.notification,
          backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: notification.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`
        }}>
          {notification.message}
        </div>
      )}

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <Card
          icon="📰"
          title="Total News"
          subtitle="All news items"
          color="#3b82f6"
        >
          <div style={styles.statNumber}>{totalCount}</div>
        </Card>

        <Card
          icon="✅"
          title="Published"
          subtitle="Active articles"
          color="#10b981"
        >
          <div style={styles.statNumber}>{newsItems.filter(n => n.isActive && n.publishedAt <= new Date()).length}</div>
        </Card>

        <Card
          icon="💼"
          title="Job Openings"
          subtitle="Available positions"
          color="#8b5cf6"
        >
          <div style={styles.statNumber}>{newsItems.filter(n => n.type === 'job_opening').length}</div>
        </Card>

        <Card
          icon="🚨"
          title="Urgent"
          subtitle="High priority items"
          color="#ef4444"
        >
          <div style={styles.statNumber}>{newsItems.filter(n => n.priority === 'urgent' || n.isPinned).length}</div>
        </Card>
      </div>

      {/* Add News Button */}
      <div style={styles.actionBar}>
        <button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          style={styles.addButton}
        >
          ➕ Add Placement News
        </button>
      </div>

      {/* News List */}
      <Card title="Placement News" subtitle="All placement and career-related news" icon="📋" color="#6366f1">
        <div style={styles.newsList}>
          {newsItems.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📰</div>
              <div style={styles.emptyTitle}>No news found</div>
              <div style={styles.emptyDescription}>Start by adding your first placement news</div>
            </div>
          ) : (
            newsItems.map((news) => (
              <div key={news._id} style={styles.newsCard}>
                <div style={styles.newsHeader}>
                  <div style={styles.newsIcon}>
                    {getTypeIcon(news.type)}
                  </div>
                  <div style={styles.newsInfo}>
                    <div style={styles.newsTitle}>
                      {news.isPinned && <span style={styles.urgentBadge}>📌</span>}
                      {news.title}
                    </div>
                    <div style={styles.newsMeta}>
                      {news.isActive ? (
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: '#10b981'
                        }}>
                          Published
                        </span>
                      ) : (
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: '#6b7280'
                        }}>
                          Inactive
                        </span>
                      )}
                      <span style={{
                        ...styles.priorityBadge,
                        backgroundColor: getPriorityColor(news.priority)
                      }}>
                        {news.priority}
                      </span>
                      <span style={styles.type}>{news.type?.replace('_', ' ')}</span>
                      <span style={styles.views}>👁️ {news.viewCount || 0}</span>
                    </div>
                  </div>
                  <div style={styles.newsActions}>
                    <button
                      onClick={() => handleEdit(news)}
                      style={styles.actionButton}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        setNewsToDelete(news);
                        setDeleteDialogOpen(true);
                      }}
                      style={styles.actionButton}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div style={styles.newsDescription}>
                  {news.summary || news.content?.substring(0, 150)}...
                </div>
                <div style={styles.newsFooter}>
                  <span style={styles.createdDate}>
                    {news.createdAt ? new Date(news.createdAt).toLocaleDateString() : 'Unknown date'}
                  </span>
                  {news.company?.name && (
                    <span style={styles.companyName}>
                      🏢 {news.company.name}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Simple Pagination */}
        {totalCount > rowsPerPage && (
          <div style={styles.pagination}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{
                ...styles.pageButton,
                ...(page === 0 ? styles.disabledButton : {})
              }}
            >
              ← Previous
            </button>
            <span style={styles.pageInfo}>
              Page {page + 1} of {Math.ceil(totalCount / rowsPerPage)}
            </span>
            <button
              onClick={() => setPage(Math.min(Math.ceil(totalCount / rowsPerPage) - 1, page + 1))}
              disabled={page >= Math.ceil(totalCount / rowsPerPage) - 1}
              style={{
                ...styles.pageButton,
                ...(page >= Math.ceil(totalCount / rowsPerPage) - 1 ? styles.disabledButton : {})
              }}
            >
              Next →
            </button>
          </div>
        )}
      </Card>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div style={styles.overlay}>
          <div style={styles.dialog}>
            <div style={styles.dialogHeader}>
              <h3 style={styles.dialogTitle}>
                {editingNews ? 'Edit Placement News' : 'Add New Placement News'}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.dialogContent}>
              <div style={styles.formGrid}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      style={styles.input}
                      placeholder="Enter news title"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      style={styles.input}
                    >
                      {newsTypes.map(type => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Summary</label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                    style={{...styles.input, minHeight: '60px'}}
                    placeholder="Brief summary of the news..."
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    style={{...styles.input, minHeight: '120px'}}
                    placeholder="Full content of the news article..."
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    style={styles.input}
                  >
                    {priorityLevels.map(priority => (
                      <option key={priority} value={priority}>
                        {priority.replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => handleInputChange('isPinned', e.target.checked)}
                      style={styles.checkbox}
                    />
                    Pin this News
                  </label>
                </div>

                {/* Company Details (for job postings and company visits) */}
                {(formData.type === 'job_opening' || formData.type === 'company_visit') && (
                  <>
                    <div style={styles.sectionTitle}>Company Details</div>
                    <div style={styles.formRow}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Company Name</label>
                        <input
                          type="text"
                          value={formData.company?.name || ''}
                          onChange={(e) => handleInputChange('company.name', e.target.value)}
                          style={styles.input}
                          placeholder="Company name"
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Industry</label>
                        <input
                          type="text"
                          value={formData.company?.industry || ''}
                          onChange={(e) => handleInputChange('company.industry', e.target.value)}
                          style={styles.input}
                          placeholder="Industry"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Job Details (for job postings) */}
                {formData.type === 'job_opening' && (
                  <>
                    <div style={styles.sectionTitle}>Job Details</div>
                    <div style={styles.formRow}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Position</label>
                        <input
                          type="text"
                          value={formData.jobDetails?.position || ''}
                          onChange={(e) => handleInputChange('jobDetails.position', e.target.value)}
                          style={styles.input}
                          placeholder="Job position"
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Salary Range</label>
                        <input
                          type="text"
                          value={formData.jobDetails?.salary || ''}
                          onChange={(e) => handleInputChange('jobDetails.salary', e.target.value)}
                          style={styles.input}
                          placeholder="5-8 LPA"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Target Departments</label>
                    <div style={styles.multiSelectContainer}>
                      {departments.map(dept => (
                        <label key={dept.value} style={styles.checkboxOption}>
                          <input
                            type="checkbox"
                            checked={formData.targetDepartments.includes(dept.value)}
                            onChange={(e) => {
                              const newDepartments = e.target.checked
                                ? [...formData.targetDepartments, dept.value]
                                : formData.targetDepartments.filter(d => d !== dept.value);
                              handleInputChange('targetDepartments', newDepartments);
                            }}
                            style={styles.checkbox}
                          />
                          <span style={styles.checkboxText}>{dept.label}</span>
                        </label>
                      ))}
                      {formData.targetDepartments.length === 0 && (
                        <span style={styles.noSelection}>Select departments (leave empty for all)</span>
                      )}
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags}
                    onChange={(e) => {
                      const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                      handleInputChange('tags', tagsArray);
                    }}
                    style={styles.input}
                    placeholder="placement, job, internship"
                  />
                </div>
              </div>
            </div>
            
            <div style={styles.dialogActions}>
              <button
                onClick={() => setDialogOpen(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={saveNews}
                disabled={!formData.title || !formData.content}
                style={{
                  ...styles.saveButton,
                  ...((!formData.title || !formData.content) ? styles.disabledButton : {})
                }}
              >
                {editingNews ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div style={styles.overlay}>
          <div style={styles.confirmDialog}>
            <div style={styles.confirmHeader}>
              <h3 style={styles.confirmTitle}>Confirm Delete</h3>
            </div>
            <div style={styles.confirmContent}>
              <p>Are you sure you want to delete "{newsToDelete?.title}"?</p>
              <p style={styles.confirmWarning}>This action cannot be undone.</p>
            </div>
            <div style={styles.confirmActions}>
              <button
                onClick={() => setDeleteDialogOpen(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={deleteNews}
                style={styles.deleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0'
  },
  notification: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '24px'
  },
  addButton: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  newsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  emptyDescription: {
    fontSize: '14px',
    color: '#6b7280'
  },
  newsCard: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb'
  },
  newsHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px'
  },
  newsIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  newsInfo: {
    flex: 1
  },
  newsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  urgentBadge: {
    fontSize: '12px'
  },
  newsMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },
  priorityBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },
  type: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  views: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  newsActions: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  newsDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.4'
  },
  newsFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontSize: '12px',
    color: '#9ca3af'
  },
  createdDate: {
    fontStyle: 'italic'
  },
  companyName: {
    fontWeight: '500'
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  pageButton: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280'
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  dialogHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  dialogTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px'
  },
  dialogContent: {
    padding: '24px',
    maxHeight: 'calc(90vh - 140px)',
    overflowY: 'auto'
  },
  formGrid: {
    display: 'grid',
    gap: '16px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s ease'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginTop: '8px',
    marginBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '8px'
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    color: '#374151',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  saveButton: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    color: 'white',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  confirmDialog: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  confirmHeader: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #e5e7eb'
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  confirmContent: {
    padding: '20px 24px'
  },
  confirmWarning: {
    fontSize: '14px',
    color: '#dc2626',
    marginTop: '8px'
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb'
  },
  deleteButton: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: 'none',
    color: 'white',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  multiSelectContainer: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px',
    backgroundColor: '#f9fafb',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  checkboxOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
    cursor: 'pointer',
    fontSize: '14px'
  },
  checkboxText: {
    fontSize: '14px',
    color: '#374151'
  },
  noSelection: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
    padding: '8px'
  }
};
