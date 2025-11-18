const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { verifyStudentOrAdmin } = require('../middleware/studentAuth');
const PlacementNews = require('../models/PlacementNews');

// Get all placement news for student (with department and batch filtering)
router.get('/', verifyStudentOrAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      priority,
      pinned = false,
      search 
    } = req.query;

    const userDepartment = req.user.department;
    const userBatch = req.user.batch || req.user.graduationYear;
    let news;
    let total;

    if (search) {
      // Text search
      news = await PlacementNews.searchNews(search, userDepartment, userBatch, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        priority
      });

      // Count for search results
      let searchQuery = {
        isActive: true,
        publishedAt: { $lte: new Date() },
        $text: { $search: search },
        $and: [{
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        }]
      };

      if (userDepartment || userBatch) {
        const filters = [];
        if (userDepartment) {
          filters.push({
            $or: [
              { targetDepartments: { $in: [userDepartment] } },
              { targetDepartments: { $size: 0 } }
            ]
          });
        }
        if (userBatch) {
          filters.push({
            $or: [
              { targetBatches: { $in: [userBatch] } },
              { targetBatches: { $size: 0 } }
            ]
          });
        }
        searchQuery.$and.push(...filters);
      }

      if (type) searchQuery.type = type;
      if (priority) searchQuery.priority = priority;

      total = await PlacementNews.countDocuments(searchQuery);
    } else {
      // Regular listing
      news = await PlacementNews.getForStudent(userDepartment, userBatch, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        priority,
        pinned: pinned === 'true'
      });

      // Count for regular listing
      let countQuery = {
        isActive: true,
        publishedAt: { $lte: new Date() },
        $and: [{
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        }]
      };

      if (userDepartment || userBatch) {
        const departmentBatchFilter = {
          $and: []
        };

        if (userDepartment) {
          departmentBatchFilter.$and.push({
            $or: [
              { targetDepartments: { $in: [userDepartment] } },
              { targetDepartments: { $size: 0 } }
            ]
          });
        }

        if (userBatch) {
          departmentBatchFilter.$and.push({
            $or: [
              { targetBatches: { $in: [userBatch] } },
              { targetBatches: { $size: 0 } }
            ]
          });
        }

        countQuery = { ...countQuery, ...departmentBatchFilter };
      }

      if (type) countQuery.type = type;
      if (priority) countQuery.priority = priority;
      if (pinned === 'true') countQuery.isPinned = true;

      total = await PlacementNews.countDocuments(countQuery);
    }

    const totalPages = Math.ceil(total / parseInt(limit));

    // Add user interest status to each news item
    const newsWithInterestStatus = news.map(item => {
      const isInterested = item.interestedStudents.some(
        interest => interest.student.toString() === req.user.id
      );
      return {
        ...item.toObject(),
        isInterested,
        interestedCount: item.interestedStudents.length
      };
    });

    res.json({
      news: newsWithInterestStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNews: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching placement news:', error);
    res.status(500).json({ message: 'Failed to fetch placement news', error: error.message });
  }
});

// Get pinned/featured placement news
router.get('/pinned', verifyStudentOrAdmin, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const userDepartment = req.user.department;
    const userBatch = req.user.batch || req.user.graduationYear;

    const news = await PlacementNews.getForStudent(userDepartment, userBatch, {
      limit: parseInt(limit),
      page: 1,
      pinned: true
    });

    const newsWithInterestStatus = news.map(item => {
      const isInterested = item.interestedStudents.some(
        interest => interest.student.toString() === req.user.id
      );
      return {
        ...item.toObject(),
        isInterested,
        interestedCount: item.interestedStudents.length
      };
    });

    res.json({ news: newsWithInterestStatus });
    
  } catch (error) {
    console.error('Error fetching pinned placement news:', error);
    res.status(500).json({ message: 'Failed to fetch pinned placement news', error: error.message });
  }
});

// Get placement news categories and types
router.get('/categories', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userDepartment = req.user.department;
    const userBatch = req.user.batch || req.user.graduationYear;
    
    let query = {
      isActive: true,
      publishedAt: { $lte: new Date() },
      $and: [{
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }]
    };

    if (userDepartment || userBatch) {
      const filters = [];
      if (userDepartment) {
        filters.push({
          $or: [
            { targetDepartments: { $in: [userDepartment] } },
            { targetDepartments: { $size: 0 } }
          ]
        });
      }
      if (userBatch) {
        filters.push({
          $or: [
            { targetBatches: { $in: [userBatch] } },
            { targetBatches: { $size: 0 } }
          ]
        });
      }
      query.$and.push(...filters);
    }

    const types = await PlacementNews.distinct('type', query);
    const priorities = await PlacementNews.distinct('priority', query);
    const companies = await PlacementNews.distinct('company.name', query);

    res.json({ types, priorities, companies });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

// Get single placement news by ID and increment view count
router.get('/:id', verifyStudentOrAdmin, async (req, res) => {
  try {
    const newsId = req.params.id;
    const news = await PlacementNews.findById(newsId)
      .populate('createdBy', 'name email')
      .populate('interestedStudents.student', 'name email studentID');

    if (!news) {
      return res.status(404).json({ message: 'Placement news not found' });
    }

    if (!news.isActive || (news.expiresAt && news.expiresAt < new Date())) {
      return res.status(404).json({ message: 'This news is no longer available' });
    }

    // Check department and batch access
    const userDepartment = req.user.department;
    const userBatch = req.user.batch || req.user.graduationYear;
    
    if (userDepartment && news.targetDepartments.length > 0 && 
        !news.targetDepartments.includes(userDepartment)) {
      return res.status(403).json({ message: 'You do not have access to this news' });
    }

    if (userBatch && news.targetBatches.length > 0 && 
        !news.targetBatches.includes(userBatch)) {
      return res.status(403).json({ message: 'This news is not applicable for your batch' });
    }

    // Increment view count
    await news.incrementViewCount();

    const isInterested = news.interestedStudents.some(
      interest => interest.student._id.toString() === req.user.id
    );

    res.json({ 
      news: {
        ...news.toObject(),
        isInterested,
        interestedCount: news.interestedStudents.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching placement news:', error);
    res.status(500).json({ message: 'Failed to fetch placement news', error: error.message });
  }
});

// Show interest in placement news
router.post('/:id/interest', verifyStudentOrAdmin, async (req, res) => {
  try {
    const newsId = req.params.id;
    const userId = req.user.id;

    const news = await PlacementNews.findById(newsId);
    if (!news) {
      return res.status(404).json({ message: 'Placement news not found' });
    }

    if (!news.isActive || (news.expiresAt && news.expiresAt < new Date())) {
      return res.status(404).json({ message: 'This news is no longer available' });
    }

    await news.addInterestedStudent(userId);

    res.json({ 
      message: 'Interest registered successfully',
      interestedCount: news.interestedStudents.length
    });
    
  } catch (error) {
    console.error('Error showing interest:', error);
    res.status(500).json({ message: 'Failed to register interest', error: error.message });
  }
});

// Remove interest in placement news
router.delete('/:id/interest', verifyStudentOrAdmin, async (req, res) => {
  try {
    const newsId = req.params.id;
    const userId = req.user.id;

    const news = await PlacementNews.findById(newsId);
    if (!news) {
      return res.status(404).json({ message: 'Placement news not found' });
    }

    await news.removeInterestedStudent(userId);

    res.json({ 
      message: 'Interest removed successfully',
      interestedCount: news.interestedStudents.length
    });
    
  } catch (error) {
    console.error('Error removing interest:', error);
    res.status(500).json({ message: 'Failed to remove interest', error: error.message });
  }
});

// Get upcoming deadlines
router.get('/deadlines/upcoming', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userDepartment = req.user.department;
    const userBatch = req.user.batch || req.user.graduationYear;
    const { limit = 10 } = req.query;

    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let query = {
      isActive: true,
      publishedAt: { $lte: now },
      $or: [
        { 
          'jobDetails.applicationDeadline': {
            $gte: now,
            $lte: oneWeekFromNow
          }
        },
        {
          registrationDeadline: {
            $gte: now,
            $lte: oneWeekFromNow
          }
        }
      ]
    };

    if (userDepartment || userBatch) {
      const filters = [];
      if (userDepartment) {
        filters.push({
          $or: [
            { targetDepartments: { $in: [userDepartment] } },
            { targetDepartments: { $size: 0 } }
          ]
        });
      }
      if (userBatch) {
        filters.push({
          $or: [
            { targetBatches: { $in: [userBatch] } },
            { targetBatches: { $size: 0 } }
          ]
        });
      }
      query.$and = filters;
    }

    const upcomingDeadlines = await PlacementNews.find(query)
      .populate('createdBy', 'name email')
      .sort({ 
        'jobDetails.applicationDeadline': 1, 
        registrationDeadline: 1 
      })
      .limit(parseInt(limit));

    res.json({ deadlines: upcomingDeadlines });
    
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming deadlines', error: error.message });
  }
});

// Get placement statistics
router.get('/stats/overview', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userDepartment = req.user.department;
    const userBatch = req.user.batch || req.user.graduationYear;
    
    let query = {
      isActive: true,
      publishedAt: { $lte: new Date() },
      $and: [{
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }]
    };

    if (userDepartment || userBatch) {
      const filters = [];
      if (userDepartment) {
        filters.push({
          $or: [
            { targetDepartments: { $in: [userDepartment] } },
            { targetDepartments: { $size: 0 } }
          ]
        });
      }
      if (userBatch) {
        filters.push({
          $or: [
            { targetBatches: { $in: [userBatch] } },
            { targetBatches: { $size: 0 } }
          ]
        });
      }
      query.$and.push(...filters);
    }

    const totalNews = await PlacementNews.countDocuments(query);
    const jobOpenings = await PlacementNews.countDocuments({...query, type: 'job_opening'});
    const campusDrives = await PlacementNews.countDocuments({...query, type: 'campus_drive'});
    
    const typeStats = await PlacementNews.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ 
      totalNews,
      jobOpenings,
      campusDrives,
      typeStats
    });
    
  } catch (error) {
    console.error('Error fetching placement stats:', error);
    res.status(500).json({ message: 'Failed to fetch placement statistics', error: error.message });
  }
});

// Admin routes for placement news management
// Get all placement news for admin
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can access all placement news' });
    }

    const { 
      page = 1, 
      limit = 20, 
      type, 
      priority,
      status = 'all', // all, published, draft, expired
      search
    } = req.query;

    let query = {};
    let news;
    let total;

    // Build query based on filters
    if (status === 'published') {
      query = {
        isActive: true,
        publishedAt: { $lte: new Date() },
        $and: [{
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        }]
      };
    } else if (status === 'draft') {
      query = {
        publishedAt: { $gt: new Date() }
      };
    } else if (status === 'expired') {
      query = {
        $or: [
          { isActive: false },
          { expiresAt: { $lte: new Date() } }
        ]
      };
    }
    // For 'all', we don't add any status filters

    if (type) query.type = type;
    if (priority) query.priority = priority;

    if (search) {
      // Add text search
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    news = await PlacementNews.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    total = await PlacementNews.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      news,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNews: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching all placement news:', error);
    res.status(500).json({ message: 'Failed to fetch placement news', error: error.message });
  }
});

router.post('/admin/create', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can create placement news' });
    }

    const newsData = {
      ...req.body,
      createdBy: req.user.id
    };

    const news = new PlacementNews(newsData);
    await news.save();

    res.status(201).json({
      message: 'Placement news created successfully',
      news
    });
    
  } catch (error) {
    console.error('Error creating placement news:', error);
    res.status(500).json({ message: 'Failed to create placement news', error: error.message });
  }
});

router.put('/admin/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can update placement news' });
    }

    const newsId = req.params.id;
    const updateData = { ...req.body, updatedAt: new Date() };

    const news = await PlacementNews.findByIdAndUpdate(
      newsId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!news) {
      return res.status(404).json({ message: 'Placement news not found' });
    }

    res.json({
      message: 'Placement news updated successfully',
      news
    });
    
  } catch (error) {
    console.error('Error updating placement news:', error);
    res.status(500).json({ message: 'Failed to update placement news', error: error.message });
  }
});

router.delete('/admin/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete placement news' });
    }

    const newsId = req.params.id;
    const news = await PlacementNews.findByIdAndDelete(newsId);

    if (!news) {
      return res.status(404).json({ message: 'Placement news not found' });
    }

    res.json({ message: 'Placement news deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting placement news:', error);
    res.status(500).json({ message: 'Failed to delete placement news', error: error.message });
  }
});

module.exports = router;