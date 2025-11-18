const LibraryUpdate = require('../models/LibraryUpdate');

// Get all library updates for admin
exports.getAllUpdatesAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      priority,
      department,
      batch,
      search
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (department) {
      query.$or = [
        { targetDepartments: { $in: [department] } },
        { targetDepartments: { $size: 0 } }
      ];
    }
    if (batch) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { targetBatches: { $in: [batch] } },
          { targetBatches: { $size: 0 } }
        ]
      });
    }
    if (search) {
      query.$text = { $search: search };
    }

    const totalUpdates = await LibraryUpdate.countDocuments(query);
    const totalPages = Math.ceil(totalUpdates / limitNum);

    const updates = await LibraryUpdate.find(query)
      .populate('createdBy', 'name email')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      updates,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUpdates,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching library updates:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get active library updates for students/public
exports.getActiveUpdates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      priority,
      department,
      batch
    } = req.query;

    const options = {
      limit: parseInt(limit),
      page: parseInt(page),
      type,
      priority,
      department,
      batch
    };

    const updates = await LibraryUpdate.getActiveUpdates(options);
    const totalUpdates = await LibraryUpdate.countDocuments({
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.json({
      updates,
      total: totalUpdates,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: (parseInt(page) * parseInt(limit)) < totalUpdates
    });
  } catch (error) {
    console.error('Error fetching active updates:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create a new library update
exports.createUpdate = async (req, res) => {
  try {
    const {
      title,
      description,
      link,
      type = 'announcement',
      priority = 'medium',
      targetDepartments = [],
      targetBatches = [],
      tags = [],
      expiresAt,
      isPinned = false
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get user ID - handle both _id and id properties
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in authentication token' });
    }

    // Handle expiresAt - if provided, parse it; otherwise use default
    let expiresAtDate;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expiresAt date format' });
      }
    } else {
      expiresAtDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 days from now
    }

    // Validate link if provided
    if (link && link.trim()) {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(link.trim())) {
        return res.status(400).json({ message: 'Link must be a valid URL starting with http:// or https://' });
      }
    }

    const newUpdate = new LibraryUpdate({
      title: title.trim(),
      description: description.trim(),
      link: link ? link.trim() : null,
      type,
      priority,
      targetDepartments: Array.isArray(targetDepartments) ? targetDepartments : [],
      targetBatches: Array.isArray(targetBatches) ? targetBatches : [],
      tags: Array.isArray(tags) ? tags : [],
      expiresAt: expiresAtDate,
      isPinned,
      createdBy: userId
    });

    await newUpdate.save();
    await newUpdate.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Library update created successfully',
      update: newUpdate
    });
  } catch (error) {
    console.error('Error creating library update:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errors: error.errors
    });
    res.status(500).json({ 
      message: error.message || 'Failed to create library update',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update a library update
exports.updateUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.viewCount;

    // Set updatedAt
    updateData.updatedAt = new Date();

    const update = await LibraryUpdate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!update) {
      return res.status(404).json({ message: 'Library update not found' });
    }

    res.json({
      message: 'Library update updated successfully',
      update
    });
  } catch (error) {
    console.error('Error updating library update:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a library update
exports.deleteUpdate = async (req, res) => {
  try {
    const { id } = req.params;

    const update = await LibraryUpdate.findByIdAndDelete(id);

    if (!update) {
      return res.status(404).json({ message: 'Library update not found' });
    }

    res.json({
      message: 'Library update deleted successfully',
      update
    });
  } catch (error) {
    console.error('Error deleting library update:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single library update by ID
exports.getUpdateById = async (req, res) => {
  try {
    const { id } = req.params;

    const update = await LibraryUpdate.findById(id)
      .populate('createdBy', 'name email');

    if (!update) {
      return res.status(404).json({ message: 'Library update not found' });
    }

    // Increment view count if it's a public request (not admin)
    if (!req.user || req.user.role !== 'admin') {
      await update.incrementViewCount();
    }

    res.json(update);
  } catch (error) {
    console.error('Error fetching library update:', error);
    res.status(500).json({ message: error.message });
  }
};

// Toggle pin status
exports.togglePin = async (req, res) => {
  try {
    const { id } = req.params;

    const update = await LibraryUpdate.findById(id);

    if (!update) {
      return res.status(404).json({ message: 'Library update not found' });
    }

    update.isPinned = !update.isPinned;
    await update.save();

    res.json({
      message: `Library update ${update.isPinned ? 'pinned' : 'unpinned'} successfully`,
      update
    });
  } catch (error) {
    console.error('Error toggling pin status:', error);
    res.status(500).json({ message: error.message });
  }
};

// Cleanup expired updates (for cron job)
exports.cleanupExpired = async (req, res) => {
  try {
    const result = await LibraryUpdate.cleanupExpired();
    
    res.json({
      message: `Cleanup completed. ${result.deletedCount} expired updates removed.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const stats = await LibraryUpdate.aggregate([
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          typeStats: [
            {
              $group: {
                _id: "$type",
                count: { $sum: 1 }
              }
            }
          ],
          priorityStats: [
            {
              $group: {
                _id: "$priority",
                count: { $sum: 1 }
              }
            }
          ],
          activeCount: [
            {
              $match: {
                isActive: true,
                $or: [
                  { expiresAt: { $exists: false } },
                  { expiresAt: null },
                  { expiresAt: { $gt: new Date() } }
                ]
              }
            },
            { $count: "count" }
          ],
          pinnedCount: [
            {
              $match: { isPinned: true }
            },
            { $count: "count" }
          ]
        }
      }
    ]);

    const result = stats[0];

    res.json({
      totalUpdates: result.totalCount[0]?.count || 0,
      activeUpdates: result.activeCount[0]?.count || 0,
      pinnedUpdates: result.pinnedCount[0]?.count || 0,
      typeStats: result.typeStats,
      priorityStats: result.priorityStats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: error.message });
  }
};