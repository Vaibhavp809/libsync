import React, { useState } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function StockImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  
  // Single import form state
  const [singleAccession, setSingleAccession] = useState('');
  const [singleStatus, setSingleStatus] = useState('Verified');
  const [singleImporting, setSingleImporting] = useState(false);
  const [singleError, setSingleError] = useState('');

  /**
   * Normalize accession number to 6 digits (same logic as backend)
   */
  const normalizeAccessionNumber = (accessionNumber) => {
    if (!accessionNumber) return null;
    
    let normalized = String(accessionNumber).trim();
    normalized = normalized.replace(/[^\d]/g, '');
    
    if (!normalized) return null;
    
    normalized = normalized.padStart(6, '0');
    return normalized;
  };

  /**
   * Normalize status string
   */
  const normalizeStatus = (status) => {
    if (!status) return 'Verified';
    
    const statusStr = String(status).trim().toLowerCase();
    
    if (statusStr.includes('verified') || statusStr === 'v') {
      return 'Verified';
    } else if (statusStr.includes('damaged') || statusStr === 'd') {
      return 'Damaged';
    } else if (statusStr.includes('lost') || statusStr === 'l') {
      return 'Lost';
    }
    
    return 'Verified';
  };

  /**
   * Find column name for accession numbers
   */
  const findAccessionColumn = (row) => {
    const keys = Object.keys(row);
    const patterns = [/accession/i, /acc/i, /accessionno/i, /accession_number/i, /^a$/i];
    
    for (const key of keys) {
      for (const pattern of patterns) {
        if (pattern.test(key)) {
          return key;
        }
      }
    }
    
    return keys[0] || null;
  };

  /**
   * Find column name for status
   */
  const findStatusColumn = (row) => {
    const keys = Object.keys(row);
    const patterns = [/status/i, /condition/i, /state/i, /verification/i];
    
    for (const key of keys) {
      for (const pattern of patterns) {
        if (pattern.test(key)) {
          return key;
        }
      }
    }
    
    return null;
  };

  /**
   * Handle file selection and generate preview
   */
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please select a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    setFile(selectedFile);
    setError('');
    setResults(null);

    // Generate preview
    try {
      setLoading(true);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          let jsonData;
          
          if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            // For CSV, parse the text directly
            const csvText = event.target.result;
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
              setError('CSV file must have at least a header and one data row');
              setFile(null);
              return;
            }
            
            // Simple CSV parser
            const headers = lines[0].split(',').map(h => h.trim());
            jsonData = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.trim());
              const row = {};
              headers.forEach((header, idx) => {
                row[header] = values[idx] || '';
              });
              jsonData.push(row);
            }
          } else {
            // For Excel files, try to import xlsx dynamically
            try {
              const XLSX = await import('xlsx');
              const data = new Uint8Array(event.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            } catch (xlsxError) {
              setError('xlsx library is required for Excel file preview. Please install it: npm install xlsx. Note: You can still upload the file and the backend will process it.');
              setFile(null);
              setLoading(false);
              return;
            }
          }

          if (!jsonData || jsonData.length === 0) {
            setError('No data found in file');
            setFile(null);
            return;
          }

          // Process preview (first 20 rows)
          const firstRow = jsonData[0];
          const accessionColumn = findAccessionColumn(firstRow);
          const statusColumn = findStatusColumn(firstRow);

          if (!accessionColumn) {
            setError('Could not find accession number column in file');
            setFile(null);
            return;
          }

          const previewData = [];
          const seen = new Set();

          for (let i = 0; i < Math.min(20, jsonData.length); i++) {
            const row = jsonData[i];
            const rawAccession = row[accessionColumn];
            if (!rawAccession) continue;

            const normalized = normalizeAccessionNumber(rawAccession);
            if (!normalized) continue;

            // Skip duplicates in preview
            if (seen.has(normalized)) continue;
            seen.add(normalized);

            const rawStatus = statusColumn ? row[statusColumn] : null;
            const status = normalizeStatus(rawStatus);

            previewData.push({
              original: String(rawAccession),
              normalized: normalized,
              status: status
            });
          }

          setPreview({
            data: previewData,
            totalRows: jsonData.length,
            hasStatusColumn: !!statusColumn,
            accessionColumn: accessionColumn,
            statusColumn: statusColumn
          });
        } catch (parseError) {
          setError('Failed to parse file: ' + parseError.message);
          setFile(null);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
        setFile(null);
      };

      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        reader.readAsText(selectedFile);
      } else {
        reader.readAsArrayBuffer(selectedFile);
      }
    } catch (err) {
      setError('Error processing file: ' + err.message);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle import submission
   */
  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setImporting(true);
    setError('');
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/stock/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResults(response.data);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Import failed');
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  /**
   * Handle single item import
   */
  const handleSingleImport = async () => {
    // Validate input
    if (!singleAccession || !singleAccession.trim()) {
      setSingleError('Accession number is required');
      return;
    }

    // Validate numeric only
    const numericOnly = singleAccession.replace(/[^\d]/g, '');
    if (!numericOnly) {
      setSingleError('Accession number must contain at least one digit');
      return;
    }

    setSingleError('');
    setSingleImporting(true);

    try {
      const normalized = normalizeAccessionNumber(singleAccession);
      
      const response = await api.post('/stock/import/single', {
        accessionNumber: normalized,
        status: singleStatus
      });

      // Show success toast (simple alert for now, can be replaced with toast library)
      if (response.data.updated) {
        // Success - add to results
        const newResult = {
          summary: {
            updated: (results?.summary?.updated || 0) + 1,
            notFound: results?.summary?.notFound || 0,
            errors: results?.summary?.errors || 0,
            totalProcessed: (results?.summary?.totalProcessed || 0) + 1
          },
          results: {
            updated: [...(results?.results?.updated || []), {
              accessionNumber: normalized,
              status: singleStatus
            }],
            notFound: results?.results?.notFound || [],
            errors: results?.results?.errors || []
          }
        };
        setResults(newResult);
        setSingleAccession('');
        setSingleStatus('Verified');
        // Show success message
        alert(`Imported successfully: ${normalized}`);
      } else if (response.data.notFound) {
        // Not found - add to results
        const newResult = {
          summary: {
            updated: results?.summary?.updated || 0,
            notFound: (results?.summary?.notFound || 0) + 1,
            errors: results?.summary?.errors || 0,
            totalProcessed: (results?.summary?.totalProcessed || 0) + 1
          },
          results: {
            updated: results?.results?.updated || [],
            notFound: [...(results?.results?.notFound || []), normalized],
            errors: results?.results?.errors || []
          }
        };
        setResults(newResult);
        setSingleAccession('');
        setSingleStatus('Verified');
        // Show not found message
        alert(`Book not found: ${normalized}`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Import failed';
      setSingleError(errorMsg);
      alert(`Error: ${errorMsg}`);
    } finally {
      setSingleImporting(false);
    }
  };

  /**
   * Download results as CSV
   */
  const downloadReport = () => {
    if (!results) return;

    const csvRows = [];
    
    // Header
    csvRows.push('Accession Number,Status,Result');
    
    // Updated entries
    results.results.updated.forEach(item => {
      csvRows.push(`${item.accessionNumber},${item.status},Updated`);
    });
    
    // Not found entries
    results.results.notFound.forEach(acc => {
      csvRows.push(`${acc},,Not Found`);
    });
    
    // Errors
    results.results.errors.forEach(err => {
      csvRows.push(`${err.accessionNumber || 'N/A'},,Error: ${err.error}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-import-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Stock Import</h1>
            <p style={styles.subtitle}>
              Upload Excel/CSV files to bulk update book verification status, or import single entries
            </p>
          </div>
        </div>

        {/* Single Import Section */}
        {!results && (
          <div style={styles.singleImportSection}>
            <div style={styles.singleImportCard}>
              <h3 style={styles.sectionTitle}>➕ Singular Import</h3>
              
              <div style={styles.singleImportForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Accession Number *</label>
                  <input
                    type="text"
                    value={singleAccession}
                    onChange={(e) => {
                      setSingleAccession(e.target.value);
                      setSingleError('');
                    }}
                    placeholder="Enter accession number (e.g., 1, 123)"
                    disabled={singleImporting}
                    style={styles.input}
                  />
                  {singleAccession && (
                    <div style={styles.previewText}>
                      Preview: <strong>{normalizeAccessionNumber(singleAccession) || 'Invalid'}</strong>
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status *</label>
                  <select
                    value={singleStatus}
                    onChange={(e) => setSingleStatus(e.target.value)}
                    disabled={singleImporting}
                    style={styles.select}
                  >
                    <option value="Verified">Verified</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <button
                  onClick={handleSingleImport}
                  disabled={singleImporting || !singleAccession.trim()}
                  style={{
                    ...styles.singleImportButton,
                    opacity: (singleImporting || !singleAccession.trim()) ? 0.6 : 1,
                    cursor: (singleImporting || !singleAccession.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {singleImporting ? '⏳ Importing...' : '✅ Import Single Entry'}
                </button>

                {singleError && (
                  <div style={styles.errorAlert}>
                    ⚠️ {singleError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        {!results && (
          <div style={styles.uploadSection}>
            <div style={styles.uploadCard}>
              <h3 style={styles.sectionTitle}>📤 Upload File</h3>
              
              <div style={styles.fileInputContainer}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={loading || importing}
                  style={styles.fileInput}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={styles.fileLabel}>
                  {file ? file.name : 'Choose Excel or CSV file'}
                </label>
              </div>

              {error && (
                <div style={styles.errorAlert}>
                  ⚠️ {error}
                </div>
              )}

              {loading && (
                <div style={styles.loadingText}>
                  <div style={styles.spinner}></div>
                  Processing file...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Section */}
        {preview && !results && (
          <div style={styles.previewSection}>
            <div style={styles.previewCard}>
              <h3 style={styles.sectionTitle}>👁️ Preview (First 20 entries)</h3>
              <p style={styles.previewInfo}>
                Total rows in file: {preview.totalRows} | 
                Status column: {preview.hasStatusColumn ? 'Yes' : 'No (defaults to Verified)'}
              </p>

              <div style={styles.previewTable}>
                <div style={styles.tableHeader}>
                  <div style={styles.tableCell}>Original</div>
                  <div style={styles.tableCell}>Normalized (6 digits)</div>
                  <div style={styles.tableCell}>Status</div>
                </div>
                {preview.data.map((item, index) => (
                  <div key={index} style={styles.tableRow}>
                    <div style={styles.tableCell}>{item.original}</div>
                    <div style={styles.tableCell}>
                      <strong>{item.normalized}</strong>
                    </div>
                    <div style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: item.status === 'Verified' ? '#d4edda' : 
                                       item.status === 'Damaged' ? '#fff3cd' : '#f8d7da'
                      }}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {preview.totalRows > 20 && (
                <p style={styles.previewNote}>
                  Showing first 20 entries. {preview.totalRows - 20} more entries will be processed.
                </p>
              )}

              <div style={styles.actionButtons}>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setError('');
                  }}
                  disabled={importing}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !file}
                  style={styles.importButton}
                >
                  {importing ? '⏳ Importing...' : '✅ Apply Import'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div style={styles.resultsSection}>
            <div style={styles.resultsCard}>
              <h3 style={styles.sectionTitle}>📊 Import Results</h3>

              <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryNumber}>{results.summary.updated}</div>
                  <div style={styles.summaryLabel}>Updated</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryNumber}>{results.summary.notFound}</div>
                  <div style={styles.summaryLabel}>Not Found</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryNumber}>{results.summary.errors}</div>
                  <div style={styles.summaryLabel}>Errors</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryNumber}>{results.summary.totalProcessed}</div>
                  <div style={styles.summaryLabel}>Total Processed</div>
                </div>
              </div>

              {/* Not Found List */}
              {results.results.notFound.length > 0 && (
                <div style={styles.detailSection}>
                  <h4 style={styles.detailTitle}>
                    Not Found Accession Numbers ({results.results.notFound.length})
                  </h4>
                  <div style={styles.accessionList}>
                    {results.results.notFound.slice(0, 50).map((acc, index) => (
                      <span key={index} style={styles.accessionBadge}>{acc}</span>
                    ))}
                    {results.results.notFound.length > 50 && (
                      <p style={styles.moreText}>
                        ... and {results.results.notFound.length - 50} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Errors List */}
              {results.results.errors.length > 0 && (
                <div style={styles.detailSection}>
                  <h4 style={styles.detailTitle}>Errors ({results.results.errors.length})</h4>
                  <div style={styles.errorList}>
                    {results.results.errors.slice(0, 20).map((err, index) => (
                      <div key={index} style={styles.errorItem}>
                        <strong>{err.accessionNumber || 'N/A'}:</strong> {err.error}
                      </div>
                    ))}
                    {results.results.errors.length > 20 && (
                      <p style={styles.moreText}>
                        ... and {results.results.errors.length - 20} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div style={styles.actionButtons}>
                <button
                  onClick={() => {
                    setResults(null);
                    setFile(null);
                    setPreview(null);
                    setError('');
                  }}
                  style={styles.newImportButton}
                >
                  📤 New Import
                </button>
                <button
                  onClick={downloadReport}
                  style={styles.downloadButton}
                >
                  📥 Download Report
                </button>
                <button
                  disabled
                  style={styles.undoButton}
                  title="Undo feature will be available in a future release"
                >
                  ↶ Undo (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!results && (
          <div style={styles.instructionsCard}>
            <h3 style={styles.sectionTitle}>📋 File Format Instructions</h3>
            <div style={styles.instructionsGrid}>
              <div style={styles.instructionItem}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px 0' }}>
                  Single Column Format
                </h4>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 12px 0' }}>
                  Just accession numbers (one per row). Status defaults to "Verified".
                </p>
                <pre style={styles.codeBlock}>
AccessionNo{'\n'}1{'\n'}123{'\n'}000045
                </pre>
              </div>
              <div style={styles.instructionItem}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px 0' }}>
                  Two Column Format
                </h4>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 12px 0' }}>
                  Accession numbers with status (Verified/Damaged/Lost).
                </p>
                <pre style={styles.codeBlock}>
AccessionNo,Status{'\n'}1,Verified{'\n'}123,Damaged{'\n'}000045,Lost
                </pre>
              </div>
            </div>
            <div style={styles.noteBox}>
              <strong>Note:</strong> Accession numbers are automatically normalized to 6 digits by left-padding with zeros.
              Example: "1" → "000001", "123" → "000123"
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  uploadSection: {
    marginBottom: '32px'
  },
  uploadCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0'
  },
  fileInputContainer: {
    marginBottom: '20px'
  },
  fileInput: {
    display: 'none'
  },
  fileLabel: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  errorAlert: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginTop: '16px',
    fontSize: '14px'
  },
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px',
    color: '#64748b'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  previewSection: {
    marginBottom: '32px'
  },
  previewCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  previewInfo: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px'
  },
  previewTable: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '16px'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    backgroundColor: '#f8fafc',
    padding: '12px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px'
  },
  tableCell: {
    padding: '4px 8px'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  previewNote: {
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: '20px'
  },
  resultsSection: {
    marginBottom: '32px'
  },
  resultsCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  summaryCard: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  summaryNumber: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px'
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  detailSection: {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  detailTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px 0'
  },
  accessionList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  accessionBadge: {
    padding: '6px 12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  errorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  errorItem: {
    padding: '8px 12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '13px'
  },
  moreText: {
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: '8px'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    flexWrap: 'wrap'
  },
  importButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  newImportButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  downloadButton: {
    padding: '12px 24px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  undoButton: {
    padding: '12px 24px',
    backgroundColor: '#d1d5db',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  instructionsCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  instructionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  },
  instructionItem: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  codeBlock: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    margin: 0
  },
  noteBox: {
    padding: '16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#92400e'
  },
  singleImportSection: {
    marginBottom: '32px'
  },
  singleImportCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  singleImportForm: {
    display: 'flex',
    flexDirection: 'column',
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
    color: '#1e293b'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  select: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease'
  },
  previewText: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px'
  },
  singleImportButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    alignSelf: 'flex-start'
  }
};

