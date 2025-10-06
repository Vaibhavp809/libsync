import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import Table from '../components/Table';
import api from '../utils/api';

export default function ViewLoans() {
  const [loans, setLoans] = useState([]);
  const [filter, setFilter] = useState('active'); // active | returned | all
  const [settings, setSettings] = useState({ finePerDay: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [loansRes, settingsRes] = await Promise.all([
          api.get('/loans'),
          api.get('/settings')
        ]);
        
        setLoans(Array.isArray(loansRes.data) ? loansRes.data : []);
        setSettings(settingsRes.data || { finePerDay: 10 });
      } catch (error) {
        console.error('Error loading loans:', error);
        alert("Error loading loans. Please check your authentication.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStudentLabel = (student) => {
    if (!student) return 'Unknown';
    if (typeof student === 'string') return student;
    return student.name || student.email || student.studentID || student._id || 'Unknown';
  };

  const isOverdue = (loan) => loan.status === 'Issued' && loan.dueDate && new Date(loan.dueDate) < new Date();
  
  const computeFine = (loan) => {
    if (!loan.dueDate) return 0;
    const days = Math.ceil((Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days * (settings.finePerDay || 10));
  };

  const markReturned = async (loanId) => {
    if (!window.confirm('Mark this loan as returned?')) return;
    try {
      await api.put(`/loans/return/${loanId}`);
      const res = await api.get('/loans');
      setLoans(Array.isArray(res.data) ? res.data : []);
      alert('Loan marked as returned');
    } catch (e) {
      alert('Failed to mark as returned');
    }
  };

  const filtered = loans.filter(l => {
    if (filter === 'active') return l.status === 'Issued';
    if (filter === 'returned') return l.status === 'Returned';
    return true;
  });

  const columns = [
    {
      header: 'Book',
      key: 'book',
      render: (loan) => (
        <div>
          <div style={{ fontWeight: '600', color: '#1f2937' }}>
            {loan.book?.title || "Deleted Book"}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Accession No.: {loan.book?.accessionNumber || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Student',
      key: 'student',
      render: (loan) => (
        <div>
          <div style={{ fontWeight: '500' }}>
            {getStudentLabel(loan.student)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {loan.student?.email || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (loan) => (
        <span style={{
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          background: loan.status === 'Issued' ? '#dbeafe' : '#dcfce7',
          color: loan.status === 'Issued' ? '#1d4ed8' : '#166534'
        }}>
          {loan.status}
        </span>
      )
    },
    {
      header: 'Issue Date',
      key: 'issueDate',
      render: (loan) => loan.issueDate ? new Date(loan.issueDate).toLocaleDateString() : '-'
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      render: (loan) => loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '-'
    },
    {
      header: 'Return Date',
      key: 'returnDate',
      render: (loan) => {
        try {
          return loan?.returnDate ? new Date(loan.returnDate).toLocaleDateString() : '-';
        } catch (err) {
          return '-';
        }
      }
    },
    {
      header: 'Fine',
      key: 'fine',
      render: (loan) => {
        if (loan.status === 'Returned' && loan.fine > 0) {
          return <span style={{ color: '#dc2626', fontWeight: '600' }}>₹{loan.fine}</span>;
        }
        if (isOverdue(loan)) {
          return <span style={{ color: '#dc2626', fontWeight: '600' }}>₹{computeFine(loan)}</span>;
        }
        return '-';
      }
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (loan) => (
        <div>
          {loan.status === 'Issued' && (
            <button 
              onClick={() => markReturned(loan._id)}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Return Book
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <Layout>
      <Header 
        title="View Loans" 
        subtitle="Manage all book loans and returns"
        actions={
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: 'white',
              fontSize: '14px'
            }}
          >
            <option value="active">Active Loans</option>
            <option value="returned">Returned Loans</option>
            <option value="all">All Loans</option>
          </select>
        }
      />
      
      <Card title="Loan Records" subtitle={`Showing ${filtered.length} loans`} icon="📚" color="#3b82f6">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading loans...</div>
          </div>
        ) : (
          <Table 
            columns={columns} 
            data={filtered}
            emptyMessage="No loans found"
          />
        )}
      </Card>
    </Layout>
  );
}
