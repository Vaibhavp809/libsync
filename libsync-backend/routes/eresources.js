const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { verifyStudentOrAdmin } = require('../middleware/studentAuth');
const EResource = require('../models/EResource');

// Get all e-resources for student (with department filtering)
router.get('/', verifyStudentOrAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      category,
      featured = false,
      search 
    } = req.query;

    const userDepartment = req.user.department;
    let resources;
    let total;

    if (search) {
      // Text search
      resources = await EResource.searchResources(search, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        category,
        department: userDepartment
      });

      // Count for search results
      let searchQuery = {
        isActive: true,
        $text: { $search: search },
        $and: [{
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gt: new Date() } }
          ]
        }]
      };

      if (type) searchQuery.type = type;
      if (category) searchQuery.category = category;
      if (userDepartment) {
        searchQuery.$or = [
          { targetDepartments: { $in: [userDepartment] } },
          { targetDepartments: { $size: 0 } }
        ];
      }

      total = await EResource.countDocuments(searchQuery);
    } else {
      // Regular listing
      resources = await EResource.getForDepartment(userDepartment, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        category,
        featured: featured === 'true'
      });

      // Count for regular listing
      let countQuery = {
        isActive: true,
        $and: [{
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gt: new Date() } }
          ]
        }]
      };

      if (userDepartment) {
        countQuery.$or = [
          { targetDepartments: { $in: [userDepartment] } },
          { targetDepartments: { $size: 0 } }
        ];
      }

      if (type) countQuery.type = type;
      if (category) countQuery.category = category;
      if (featured === 'true') countQuery.isFeatured = true;

      total = await EResource.countDocuments(countQuery);
    }

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      resources,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResources: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching e-resources:', error);
    res.status(500).json({ message: 'Failed to fetch e-resources', error: error.message });
  }
});

// Get featured e-resources
router.get('/featured', verifyStudentOrAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userDepartment = req.user.department;

    const resources = await EResource.getForDepartment(userDepartment, {
      limit: parseInt(limit),
      page: 1,
      featured: true
    });

    res.json({ resources });
    
  } catch (error) {
    console.error('Error fetching featured e-resources:', error);
    res.status(500).json({ message: 'Failed to fetch featured e-resources', error: error.message });
  }
});

// Get categories
router.get('/categories', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userDepartment = req.user.department;
    
    let query = {
      isActive: true,
      $and: [{
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: null },
          { expiryDate: { $gt: new Date() } }
        ]
      }]
    };

    if (userDepartment) {
      query.$or = [
        { targetDepartments: { $in: [userDepartment] } },
        { targetDepartments: { $size: 0 } }
      ];
    }

    const categories = await EResource.distinct('category', query);
    const types = await EResource.distinct('type', query);

    res.json({ categories, types });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

// Get single e-resource by ID and increment view count
router.get('/:id', verifyStudentOrAdmin, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const resource = await EResource.findById(resourceId)
      .populate('addedBy', 'name email')
      .populate('reviews.user', 'name');

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (!resource.isActive || (resource.expiryDate && resource.expiryDate < new Date())) {
      return res.status(404).json({ message: 'Resource is no longer available' });
    }

    // Check department access
    const userDepartment = req.user.department;
    if (userDepartment && resource.targetDepartments.length > 0 && 
        !resource.targetDepartments.includes(userDepartment)) {
      return res.status(403).json({ message: 'You do not have access to this resource' });
    }

    // Increment view count
    await resource.incrementViewCount();

    res.json({ resource });
    
  } catch (error) {
    console.error('Error fetching e-resource:', error);
    res.status(500).json({ message: 'Failed to fetch e-resource', error: error.message });
  }
});

// Track download
router.post('/:id/download', verifyStudentOrAdmin, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const resource = await EResource.findById(resourceId);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (!resource.isActive || (resource.expiryDate && resource.expiryDate < new Date())) {
      return res.status(404).json({ message: 'Resource is no longer available' });
    }

    // Check department access
    const userDepartment = req.user.department;
    if (userDepartment && resource.targetDepartments.length > 0 && 
        !resource.targetDepartments.includes(userDepartment)) {
      return res.status(403).json({ message: 'You do not have access to this resource' });
    }

    // Increment download count
    await resource.incrementDownloadCount();

    res.json({ 
      message: 'Download tracked successfully',
      downloadUrl: resource.url 
    });
    
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ message: 'Failed to track download', error: error.message });
  }
});

// Add review to e-resource
router.post('/:id/review', verifyStudentOrAdmin, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const resource = await EResource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    await resource.addReview(userId, rating, comment);

    const updatedResource = await EResource.findById(resourceId)
      .populate('reviews.user', 'name');

    res.json({ 
      message: 'Review added successfully',
      resource: updatedResource 
    });
    
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Failed to add review', error: error.message });
  }
});

// Get resource statistics
router.get('/stats/overview', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userDepartment = req.user.department;
    
    let query = {
      isActive: true,
      $and: [{
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: null },
          { expiryDate: { $gt: new Date() } }
        ]
      }]
    };

    if (userDepartment) {
      query.$or = [
        { targetDepartments: { $in: [userDepartment] } },
        { targetDepartments: { $size: 0 } }
      ];
    }

    const totalResources = await EResource.countDocuments(query);
    const featuredResources = await EResource.countDocuments({...query, isFeatured: true});
    
    const typeStats = await EResource.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ 
      totalResources,
      featuredResources,
      typeStats
    });
    
  } catch (error) {
    console.error('Error fetching resource stats:', error);
    res.status(500).json({ message: 'Failed to fetch resource statistics', error: error.message });
  }
});

// Admin routes for e-resource management
// Get all e-resources for admin
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can access all e-resources' });
    }

    const { 
      page = 1, 
      limit = 20, 
      type, 
      category,
      featured,
      search,
      status = 'all' // all, active, expired
    } = req.query;

    let query = {};
    let resources;
    let total;

    // Build query based on filters
    if (status === 'active') {
      query = {
        isActive: true,
        $and: [{
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gt: new Date() } }
          ]
        }]
      };
    } else if (status === 'expired') {
      query = {
        $or: [
          { isActive: false },
          { expiryDate: { $lte: new Date() } }
        ]
      };
    }
    // For 'all', we don't add any status filters

    if (type) query.type = type;
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (featured === 'false') query.isFeatured = false;

    if (search) {
      // Add text search
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    resources = await EResource.find(query)
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    total = await EResource.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      resources,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResources: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching all e-resources:', error);
    res.status(500).json({ message: 'Failed to fetch e-resources', error: error.message });
  }
});

router.post('/admin/create', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can create e-resources' });
    }

    const resourceData = {
      ...req.body,
      addedBy: req.user.id
    };

    const resource = new EResource(resourceData);
    await resource.save();

    res.status(201).json({
      message: 'E-resource created successfully',
      resource
    });
    
  } catch (error) {
    console.error('Error creating e-resource:', error);
    res.status(500).json({ message: 'Failed to create e-resource', error: error.message });
  }
});

router.put('/admin/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can update e-resources' });
    }

    const resourceId = req.params.id;
    const updateData = { ...req.body, updatedAt: new Date() };

    const resource = await EResource.findByIdAndUpdate(
      resourceId,
      updateData,
      { new: true, runValidators: true }
    ).populate('addedBy', 'name email');

    if (!resource) {
      return res.status(404).json({ message: 'E-resource not found' });
    }

    res.json({
      message: 'E-resource updated successfully',
      resource
    });
    
  } catch (error) {
    console.error('Error updating e-resource:', error);
    res.status(500).json({ message: 'Failed to update e-resource', error: error.message });
  }
});

router.delete('/admin/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete e-resources' });
    }

    const resourceId = req.params.id;
    const resource = await EResource.findByIdAndDelete(resourceId);

    if (!resource) {
      return res.status(404).json({ message: 'E-resource not found' });
    }

    res.json({ message: 'E-resource deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting e-resource:', error);
    res.status(500).json({ message: 'Failed to delete e-resource', error: error.message });
  }
});

module.exports = router;