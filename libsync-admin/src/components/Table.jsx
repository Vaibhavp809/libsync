import React from 'react';

const Table = ({ columns, data, onRowClick, emptyMessage = "No data available" }) => {
  const actionsColumnIndex = columns.findIndex(col => col.key === 'actions');
  
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            {columns.map((column, index) => (
              <th 
                key={index} 
                style={{
                  ...styles.headerCell,
                  ...(column.key === 'actions' && styles.actionsHeaderCell)
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.filter(row => row && typeof row === 'object').map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  ...styles.dataRow,
                  ...(onRowClick && styles.clickableRow)
                }}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex} 
                    style={{
                      ...styles.dataCell,
                      ...(column.key === 'actions' && styles.actionsCell)
                    }}
                  >
                    {column.render ? column.render(row) : (row[column.key] || '-')}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} style={styles.emptyCell}>
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>No Data</div>
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
    overflowX: 'auto',
    overflowY: 'visible',
    maxWidth: '100%',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    position: 'relative'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    tableLayout: 'auto'
  },
  headerRow: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    borderBottom: '2px solid #e2e8f0'
  },
  headerCell: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
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
    padding: '14px 16px',
    color: '#475569',
    verticalAlign: 'top',
    whiteSpace: 'normal',
    overflow: 'visible',
    wordWrap: 'break-word',
    lineHeight: '1.6',
    minHeight: '50px',
    maxWidth: 'none'
  },
  actionsCell: {
    position: 'sticky',
    right: 0,
    backgroundColor: 'white',
    zIndex: 10,
    whiteSpace: 'nowrap',
    minWidth: '160px',
    width: '160px',
    textAlign: 'center',
    boxShadow: '-2px 0 4px rgba(0, 0, 0, 0.05)',
    padding: '14px 12px'
  },
  actionsHeaderCell: {
    position: 'sticky',
    right: 0,
    backgroundColor: '#f8fafc',
    zIndex: 20,
    whiteSpace: 'nowrap',
    minWidth: '160px',
    width: '160px',
    textAlign: 'center',
    boxShadow: '-2px 0 4px rgba(0, 0, 0, 0.05)',
    padding: '12px 12px'
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
