import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import Table from '../components/Table';
import api from '../utils/api';

export default function ViewReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        const response = await api.get('/reservations');
        setReservations(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error loading reservations:', error);
        alert("Error loading reservations. Please check your authentication.");
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const getStudentLabel = (student) => {
    if (!student) return 'Unknown';
    if (typeof student === 'string') return student;
    return student.name || student.email || student.studentID || student._id || 'Unknown';
  };

  const columns = [
    {
      header: 'Book',
      key: 'book',
      render: (reservation) => (
        <div>
          <div style={{ fontWeight: '600', color: '#1f2937' }}>
            {reservation.book?.title || "Deleted Book"}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            ISBN: {reservation.book?.isbn || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Student',
      key: 'student',
      render: (reservation) => (
        <div>
          <div style={{ fontWeight: '500' }}>
            {getStudentLabel(reservation.student)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {reservation.student?.email || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (reservation) => (
        <span style={{
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          background: reservation.status === 'Active' ? '#fef3c7' : '#dbeafe',
          color: reservation.status === 'Active' ? '#92400e' : '#1d4ed8'
        }}>
          {reservation.status}
        </span>
      )
    },
    {
      header: 'Reserved Date',
      key: 'reservedAt',
      render: (reservation) => new Date(reservation.reservedAt).toLocaleDateString()
    },
    {
      header: 'Expires',
      key: 'expiresAt',
      render: (reservation) => reservation.expiresAt ? new Date(reservation.expiresAt).toLocaleDateString() : '-'
    }
  ];

  return (
    <Layout>
      <Header 
        title="View Reservations" 
        subtitle="Manage all book reservations"
      />
      
      <Card title="Reservation Records" subtitle={`Showing ${reservations.length} reservations`} icon="📌" color="#f59e0b">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading reservations...</div>
          </div>
        ) : (
          <Table 
            columns={columns} 
            data={reservations}
            emptyMessage="No reservations found"
          />
        )}
      </Card>
    </Layout>
  );
}
