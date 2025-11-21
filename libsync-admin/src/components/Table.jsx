import React from 'react';
import './Table.css';

const Table = ({ columns, data, onRowClick, emptyMessage = "No data available" }) => {
  const actionsColumnIndex = columns.findIndex(col => col.key === 'actions');
  
  return (
    <div style={styles.tableContainer} className="table-container">
      <table style={styles.table} className="table">
        <thead>
          <tr style={styles.headerRow}>
            {columns.map((column, index) => (
              <th 
                key={index} 
                style={{
                  ...styles.headerCell,
                  ...(column.key === 'actions' && styles.actionsHeaderCell),
                  ...(column.key === 'status' && styles.statusHeaderCell),
                  ...(column.key === 'edition' && styles.editionHeaderCell),
                  ...(column.key === 'title' && styles.titleHeaderCell),
                  ...(column.key === 'accessionNumber' && styles.accessionHeaderCell),
                  ...(column.key === 'author' && styles.authorHeaderCell),
                  ...(column.key === 'price' && styles.priceHeaderCell),
                  ...(column.key === 'yearOfPublishing' && styles.yearHeaderCell)
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
                      ...(column.key === 'actions' && styles.actionsCell),
                      ...(column.key === 'status' && styles.statusCell),
                      ...(column.key === 'edition' && styles.editionCell),
                      ...(column.key === 'title' && styles.titleCell),
                      ...(column.key === 'accessionNumber' && styles.accessionCell),
                      ...(column.key === 'author' && styles.authorCell),
                      ...(column.key === 'price' && styles.priceCell),
                      ...(column.key === 'yearOfPublishing' && styles.yearCell)
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
    overflowX: 'hidden',
    overflowY: 'visible',
    maxWidth: '100%',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    position: 'relative'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    tableLayout: 'fixed'
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
    textOverflow: 'ellipsis',
    wordWrap: 'break-word'
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
    overflow: 'hidden',
    wordWrap: 'break-word',
    lineHeight: '1.6',
    minHeight: '50px',
    maxWidth: '100%'
  },
  actionsCell: {
    position: 'sticky',
    right: 0,
    backgroundColor: 'white',
    zIndex: 10,
    whiteSpace: 'nowrap',
    minWidth: '125px',
    width: '125px',
    maxWidth: '125px',
    textAlign: 'center',
    boxShadow: '-2px 0 4px rgba(0, 0, 0, 0.05)',
    padding: '14px 8px'
  },
  accessionHeaderCell: {
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px'
  },
  accessionCell: {
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px',
    padding: '14px 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  titleHeaderCell: {
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px'
  },
  titleCell: {
    width: '150px',
    minWidth: '150px',
    maxWidth: '150px',
    padding: '14px 10px'
  },
  authorHeaderCell: {
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px'
  },
  authorCell: {
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px',
    padding: '14px 10px',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  yearHeaderCell: {
    width: '67px',
    minWidth: '67px',
    maxWidth: '67px',
    textAlign: 'center'
  },
  yearCell: {
    width: '67px',
    minWidth: '67px',
    maxWidth: '67px',
    textAlign: 'center',
    padding: '14px 6px'
  },
  editionHeaderCell: {
    width: '60px',
    minWidth: '60px',
    maxWidth: '60px',
    textAlign: 'center'
  },
  editionCell: {
    width: '60px',
    minWidth: '60px',
    maxWidth: '60px',
    textAlign: 'center',
    padding: '14px 6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '12px'
  },
  priceHeaderCell: {
    width: '75px',
    minWidth: '75px',
    maxWidth: '75px',
    textAlign: 'center'
  },
  priceCell: {
    width: '75px',
    minWidth: '75px',
    maxWidth: '75px',
    textAlign: 'center',
    padding: '14px 8px'
  },
  statusHeaderCell: {
    width: '110px',
    minWidth: '110px',
    maxWidth: '110px',
    textAlign: 'center'
  },
  statusCell: {
    width: '110px',
    minWidth: '110px',
    maxWidth: '110px',
    textAlign: 'center',
    padding: '14px 8px'
  },
  actionsHeaderCell: {
    position: 'sticky',
    right: 0,
    backgroundColor: '#f8fafc',
    zIndex: 20,
    whiteSpace: 'nowrap',
    minWidth: '125px',
    width: '125px',
    maxWidth: '125px',
    textAlign: 'center',
    boxShadow: '-2px 0 4px rgba(0, 0, 0, 0.05)',
    padding: '12px 8px'
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
