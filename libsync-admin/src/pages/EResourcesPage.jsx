import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import api from '../utils/api';

const resourceTypes = [
  'e-book',
  'journal', 
  'database',
  'video',
  'course',
  'research_paper',
  'thesis',
  'article',
  'website',
  'other'
];

const accessTypes = [
  'free',
  'subscription',
  'institutional', 
  'restricted'
];

const getTypeIcon = (type) => {
  switch (type) {
    case 'e-book': return '📚';
    case 'journal': return '📖';
    case 'video': return '🎥';
    case 'database': return '🗄️';
    case 'course': return '🎓';
    case 'website': return '🌐';
    default: return '💾';
  }
};

const getAccessTypeColor = (accessType) => {
  switch (accessType) {
    case 'free': return '#10b981';
    case 'subscription': return '#f59e0b';
    case 'institutional': return '#3b82f6';
    case 'restricted': return '#ef4444';
    default: return '#6b7280';
  }
};

export default function EResourcesPage() {
  // State management
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'e-book',
    category: '',
    subject: '',
    author: '',
    publisher: '',
    publicationDate: '',
    language: 'English',
    url: '',
    thumbnailUrl: '',
    fileSize: '',
    format: '',
    accessType: 'free',
    accessCredentials: {
      username: '',
      password: '',
      accessCode: '',
      instructions: ''
    },
    targetDepartments: [],
    targetCourses: [],
    keywords: [],
    isFeatured: false,
    expiryDate: ''
  });
  
  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  // Fetch resources from API
  const fetchResources = async () => {
    try {
      setLoading(true);
      // Use the api instance which automatically adds authentication token
      const response = await api.get('/eresources/admin/all', {
        params: {
          page: page + 1,
          limit: rowsPerPage
        }
      });
      
      setResources(response.data.resources || []);
      setTotalCount(response.data.pagination?.totalResources || 0);
    } catch (error) {
      showNotification('Failed to fetch e-resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create or update resource
  const saveResource = async () => {
    try {
      const isEditing = editingResource !== null;
      
      const resourceData = {
        ...formData,
        keywords: Array.isArray(formData.keywords) 
          ? formData.keywords 
          : formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        targetDepartments: Array.isArray(formData.targetDepartments)
          ? formData.targetDepartments
          : formData.targetDepartments.split(',').map(d => d.trim()).filter(d => d),
        targetCourses: Array.isArray(formData.targetCourses)
          ? formData.targetCourses
          : formData.targetCourses.split(',').map(c => c.trim()).filter(c => c)
      };

      if (isEditing) {
        // Use the api instance which automatically adds authentication token
        await api.put(`/eresources/admin/${editingResource._id}`, resourceData);
        showNotification('E-resource updated successfully');
      } else {
        // Use the api instance which automatically adds authentication token
        await api.post('/eresources/admin/create', resourceData);
        showNotification('E-resource created successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchResources();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to save e-resource', 'error');
    }
  };

  // Delete resource
  const deleteResource = async () => {
    try {
      // Use the api instance which automatically adds authentication token
      await api.delete(`/eresources/admin/${resourceToDelete._id}`);
      
      showNotification('E-resource deleted successfully');
      setDeleteDialogOpen(false);
      setResourceToDelete(null);
      fetchResources();
    } catch (error) {
      showNotification('Failed to delete e-resource', 'error');
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
      description: '',
      type: 'e-book',
      category: '',
      subject: '',
      author: '',
      publisher: '',
      publicationDate: '',
      language: 'English',
      url: '',
      thumbnailUrl: '',
      fileSize: '',
      format: '',
      accessType: 'free',
      accessCredentials: {
        username: '',
        password: '',
        accessCode: '',
        instructions: ''
      },
      targetDepartments: [],
      targetCourses: [],
      keywords: [],
      isFeatured: false,
      expiryDate: ''
    });
    setEditingResource(null);
  };

  // Open edit dialog
  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      ...resource,
      keywords: resource.keywords?.join(', ') || '',
      targetDepartments: resource.targetDepartments?.join(', ') || '',
      targetCourses: resource.targetCourses?.join(', ') || '',
      publicationDate: resource.publicationDate ? resource.publicationDate.split('T')[0] : '',
      expiryDate: resource.expiryDate ? resource.expiryDate.split('T')[0] : ''
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
    fetchResources();
  }, [page, rowsPerPage]);

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading e-resources...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="E-Resources Management"
        subtitle="Manage digital resources, e-books, and educational materials"
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
          icon="💾"
          title="Total Resources"
          subtitle="Available resources"
          color="#3b82f6"
        >
          <div style={styles.statNumber}>{totalCount}</div>
        </Card>

        <Card
          icon="⭐"
          title="Featured"
          subtitle="Highlighted resources"
          color="#f59e0b"
        >
          <div style={styles.statNumber}>{resources.filter(r => r.isFeatured).length}</div>
        </Card>

        <Card
          icon="📚"
          title="E-Books"
          subtitle="Digital books"
          color="#10b981"
        >
          <div style={styles.statNumber}>{resources.filter(r => r.type === 'e-book').length}</div>
        </Card>

        <Card
          icon="🎥"
          title="Videos"
          subtitle="Video content"
          color="#8b5cf6"
        >
          <div style={styles.statNumber}>{resources.filter(r => r.type === 'video').length}</div>
        </Card>
      </div>

      {/* Add Resource Button */}
      <div style={styles.actionBar}>
        <button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          style={styles.addButton}
        >
          ➕ Add E-Resource
        </button>
      </div>

      {/* Resources List */}
      <Card title="Resources" subtitle="All e-resources in the system" icon="📋" color="#6366f1">
        <div style={styles.resourcesList}>
          {resources.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📚</div>
              <div style={styles.emptyTitle}>No resources found</div>
              <div style={styles.emptyDescription}>Start by adding your first e-resource</div>
            </div>
          ) : (
            resources.map((resource) => (
              <div key={resource._id} style={styles.resourceCard}>
                <div style={styles.resourceHeader}>
                  <div style={styles.resourceIcon}>
                    {getTypeIcon(resource.type)}
                  </div>
                  <div style={styles.resourceInfo}>
                    <div style={styles.resourceTitle}>{resource.title}</div>
                    <div style={styles.resourceMeta}>
                      <span style={{
                        ...styles.accessBadge,
                        backgroundColor: getAccessTypeColor(resource.accessType)
                      }}>
                        {resource.accessType}
                      </span>
                      <span style={styles.category}>{resource.category}</span>
                      {resource.isFeatured && <span style={styles.featured}>⭐ Featured</span>}
                    </div>
                  </div>
                  <div style={styles.resourceActions}>
                    <button
                      onClick={() => window.open(resource.url, '_blank')}
                      style={styles.actionButton}
                      title="View Resource"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleEdit(resource)}
                      style={styles.actionButton}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        setResourceToDelete(resource);
                        setDeleteDialogOpen(true);
                      }}
                      style={styles.actionButton}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div style={styles.resourceDescription}>
                  {resource.description?.substring(0, 100)}...
                </div>
                {resource.author && (
                  <div style={styles.resourceAuthor}>
                    Author: {resource.author}
                  </div>
                )}
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
                {editingResource ? 'Edit E-Resource' : 'Add New E-Resource'}
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
                <div style={styles.formGroup}>
                  <label style={styles.label}>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    style={styles.input}
                    placeholder="Enter resource title"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    style={styles.input}
                  >
                    {resourceTypes.map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    style={{...styles.input, minHeight: '80px'}}
                    placeholder="Enter resource description"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    style={styles.input}
                    placeholder="Enter category"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => handleInputChange('author', e.target.value)}
                    style={styles.input}
                    placeholder="Enter author name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Resource URL *</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    style={styles.input}
                    placeholder="https://example.com/resource"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Access Type</label>
                  <select
                    value={formData.accessType}
                    onChange={(e) => handleInputChange('accessType', e.target.value)}
                    style={styles.input}
                  >
                    {accessTypes.map(type => (
                      <option key={type} value={type}>
                        {type.replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Keywords (comma separated)</label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => handleInputChange('keywords', e.target.value)}
                    style={styles.input}
                    placeholder="programming, javascript, web development"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                      style={styles.checkbox}
                    />
                    Featured Resource
                  </label>
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
                onClick={saveResource}
                disabled={!formData.title || !formData.description || !formData.url}
                style={{
                  ...styles.saveButton,
                  ...((!formData.title || !formData.description || !formData.url) ? styles.disabledButton : {})
                }}
              >
                {editingResource ? 'Update' : 'Create'}
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
              <p>Are you sure you want to delete "{resourceToDelete?.title}"?</p>
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
                onClick={deleteResource}
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
  resourcesList: {
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
  resourceCard: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb'
  },
  resourceHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px'
  },
  resourceIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  resourceInfo: {
    flex: 1
  },
  resourceTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px'
  },
  resourceMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  accessBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },
  category: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  featured: {
    fontSize: '12px',
    color: '#f59e0b',
    fontWeight: '500'
  },
  resourceActions: {
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
  resourceDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  resourceAuthor: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic'
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
    maxWidth: '600px',
    maxHeight: '80vh',
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
    maxHeight: 'calc(80vh - 140px)',
    overflowY: 'auto'
  },
  formGrid: {
    display: 'grid',
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
  }
};