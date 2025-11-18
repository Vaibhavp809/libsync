const Department = require('../models/Department');
const DeletedDepartment = require('../models/DeletedDepartment');
const { getAllDepartments } = require('../utils/departments');

/**
 * GET /api/departments
 * Returns list of all available departments
 * Public endpoint (can be accessed without authentication)
 */
exports.getDepartments = async (req, res) => {
  try {
    // Get all departments from database (not deleted)
    const dbDepartments = await Department.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
    
    // Get list of deleted hardcoded department IDs
    const deletedHardcoded = await DeletedDepartment.find().select('id');
    const deletedIds = new Set(deletedHardcoded.map(d => d.id));
    
    // Get hardcoded departments and filter out deleted ones
    const hardcodedDepartments = getAllDepartments().filter(dept => !deletedIds.has(dept.id));
    
    // Combine database departments with non-deleted hardcoded departments
    // Convert database departments to same format
    const dbDeptsFormatted = dbDepartments.map(dept => ({
      _id: dept._id,
      id: dept.id,
      name: dept.name
    }));
    
    // Combine and remove duplicates (database takes precedence)
    const allDepartments = [...dbDeptsFormatted];
    const dbIds = new Set(dbDeptsFormatted.map(d => d.id));
    
    // Add hardcoded departments that aren't in database
    hardcodedDepartments.forEach(dept => {
      if (!dbIds.has(dept.id)) {
        allDepartments.push(dept);
      }
    });
    
    // Sort by name
    allDepartments.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      departments: allDepartments
    });
  } catch (err) {
    console.error('Error fetching departments:', err);
    // Fallback to hardcoded list on error
    const departments = getAllDepartments();
    res.json({
      success: true,
      departments: departments
    });
  }
};

/**
 * POST /api/departments
 * Create a new department (Admin only)
 */
exports.createDepartment = async (req, res) => {
  try {
    const { id, name } = req.body;
    const deptId = id.toUpperCase();

    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Department ID and name are required'
      });
    }

    // Check if department already exists (not deleted)
    const existing = await Department.findOne({ id: deptId, isDeleted: { $ne: true } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Department with this ID already exists'
      });
    }

    // Check if it was previously deleted (soft delete)
    const previouslyDeleted = await Department.findOne({ id: deptId, isDeleted: true });
    if (previouslyDeleted) {
      // Restore it
      previouslyDeleted.isDeleted = false;
      previouslyDeleted.name = name.trim();
      await previouslyDeleted.save();
      
      // Also remove from DeletedDepartment if it exists there
      await DeletedDepartment.findOneAndDelete({ id: deptId });
      
      return res.json({
        success: true,
        department: {
          _id: previouslyDeleted._id,
          id: previouslyDeleted.id,
          name: previouslyDeleted.name
        }
      });
    }

    // Remove from DeletedDepartment if it was a hardcoded deleted department
    await DeletedDepartment.findOneAndDelete({ id: deptId });

    // Create new department
    const department = new Department({
      id: deptId,
      name: name.trim()
    });

    await department.save();

    res.json({
      success: true,
      department: {
        _id: department._id,
        id: department.id,
        name: department.name
      }
    });
  } catch (err) {
    console.error('Error creating department:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to create department'
    });
  }
};

/**
 * DELETE /api/departments/:id
 * Delete a department (Admin only)
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const deptId = id.toUpperCase();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Department ID is required'
      });
    }

    // First, try to find and delete from database
    let department = await Department.findOne({ id: deptId, isDeleted: { $ne: true } });
    
    if (department) {
      // Mark as deleted instead of actually deleting (soft delete)
      department.isDeleted = true;
      await department.save();
      
      return res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    }

    // If not in database, check if it's a hardcoded department
    const hardcodedDepartments = getAllDepartments();
    const isHardcoded = hardcodedDepartments.some(dept => dept.id === deptId);
    
    if (isHardcoded) {
      // Mark this hardcoded department as deleted
      try {
        await DeletedDepartment.findOneAndUpdate(
          { id: deptId },
          { 
            id: deptId,
            name: hardcodedDepartments.find(d => d.id === deptId)?.name || deptId
          },
          { upsert: true, new: true }
        );
        
        return res.json({
          success: true,
          message: 'Department deleted successfully'
        });
      } catch (err) {
        // If it already exists in deleted list, that's fine
        if (err.code === 11000) {
          return res.json({
            success: true,
            message: 'Department deleted successfully'
          });
        }
        throw err;
      }
    }

    // Department not found in database or hardcoded list
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete department'
    });
  }
};

