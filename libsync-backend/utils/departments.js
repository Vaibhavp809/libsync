/**
 * Department normalization and mapping utility
 * Maps various department name formats to canonical department codes
 */

// Canonical department list with id and name
const DEPARTMENTS = [
  { id: 'CSE', name: 'Computer Science Engineering' },
  { id: 'ECE', name: 'Electronics & Communication' },
  { id: 'ME', name: 'Mechanical Engineering' },
  { id: 'CE', name: 'Civil Engineering' },
  { id: 'EEE', name: 'Electrical & Electronics' },
  { id: 'IT', name: 'Information Technology' },
];

// Mapping of common department name variations to canonical IDs
const DEPARTMENT_MAPPING = {
  // Computer Science variations
  'computer science': 'CSE',
  'computer science engineering': 'CSE',
  'cse': 'CSE',
  'cs': 'CSE',
  
  // Information Technology variations
  'information technology': 'IT',
  'it': 'IT',
  
  // Electronics & Communication variations
  'electronics & communication engineering': 'ECE',
  'electronics and communication engineering': 'ECE',
  'electronics & communication': 'ECE',
  'electronics and communication': 'ECE',
  'ece': 'ECE',
  'ec': 'ECE',
  
  // Mechanical Engineering variations
  'mechanical engineering': 'ME',
  'me': 'ME',
  'mech': 'ME',
  
  // Civil Engineering variations
  'civil engineering': 'CE',
  'ce': 'CE',
  
  // Electrical & Electronics variations
  'electrical & electronics': 'EEE',
  'electrical and electronics': 'EEE',
  'electric & electronics': 'EEE',
  'electric and electronics': 'EEE',
  'eee': 'EEE',
  'ee': 'EEE',
};

/**
 * Normalize department name to canonical ID
 * @param {string} department - Department name or code
 * @returns {string|null} - Canonical department ID or null if not found
 */
function normalizeDepartment(department) {
  if (!department || typeof department !== 'string') {
    return null;
  }
  
  const normalized = department.trim();
  if (!normalized) {
    return null;
  }
  
  // Check if it's already a canonical ID
  const existingDept = DEPARTMENTS.find(d => d.id === normalized.toUpperCase());
  if (existingDept) {
    return existingDept.id;
  }
  
  // Try to find in mapping (case-insensitive)
  const lowerKey = normalized.toLowerCase();
  if (DEPARTMENT_MAPPING[lowerKey]) {
    return DEPARTMENT_MAPPING[lowerKey];
  }
  
  // Try partial matching for common patterns
  for (const [key, value] of Object.entries(DEPARTMENT_MAPPING)) {
    if (lowerKey.includes(key) || key.includes(lowerKey)) {
      return value;
    }
  }
  
  // If no match found, return the original (for backwards compatibility)
  // Or return null to enforce strict matching
  return normalized;
}

/**
 * Get department name by ID
 * @param {string} id - Department ID
 * @returns {string|null} - Department name or null
 */
function getDepartmentName(id) {
  if (!id) return null;
  const dept = DEPARTMENTS.find(d => d.id === id);
  return dept ? dept.name : null;
}

/**
 * Get all departments
 * @returns {Array} - Array of department objects with id and name
 */
function getAllDepartments() {
  return DEPARTMENTS;
}

module.exports = {
  DEPARTMENTS,
  normalizeDepartment,
  getDepartmentName,
  getAllDepartments,
};

