import React from 'react';

const Card = ({ children, title, subtitle, icon, color = '#3b82f6', onClick, style = {} }) => {
  return (
    <div 
      style={{
        ...styles.card,
        ...(onClick && styles.clickableCard),
        ...style
      }}
      onClick={onClick}
    >
      {title && (
        <div style={styles.cardHeader}>
          {icon && (
            <div style={{
              ...styles.cardIcon,
              backgroundColor: color
            }}>
              {icon}
            </div>
          )}
          <div style={styles.cardTitleSection}>
            <h3 style={styles.cardTitle}>{title}</h3>
            {subtitle && <p style={styles.cardSubtitle}>{subtitle}</p>}
          </div>
        </div>
      )}
      <div style={styles.cardContent}>
        {children}
      </div>
    </div>
  );
};

const styles = {
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden'
  },
  clickableCard: {
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px'
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: 'white',
    flexShrink: 0
  },
  cardTitleSection: {
    flex: 1
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0'
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    fontWeight: '400'
  },
  cardContent: {
    color: '#475569'
  }
};

export default Card;
