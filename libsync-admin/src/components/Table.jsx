import React from 'react';

const Table = ({ columns, data, onRowClick, emptyMessage = "No data available" }) => {
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            {columns.map((column, index) => (
              <th key={index} style={styles.headerCell}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                style={{
                  ...styles.dataRow,
                  ...(onRowClick && styles.clickableRow)
                }}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} style={styles.dataCell}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} style={styles.emptyCell}>
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📭</div>
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  headerRow: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    borderBottom: '2px solid #e2e8f0'
  },
  headerCell: {
    padding: '16px 20px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  dataRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s ease'
  },
  clickableRow: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#f8fafc'
    }
  },
  dataCell: {
    padding: '16px 20px',
    color: '#475569',
    verticalAlign: 'middle'
  },
  emptyCell: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    color: '#94a3b8'
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.5
  }
};

export default Table;
