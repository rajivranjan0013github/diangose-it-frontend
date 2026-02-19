import express from 'express';
import {
    getSummary,
    getUserTrend,
    getGameplayTrend,
    getRecentUsers,
    getTimezoneDistribution,
    getUserDetails,
    sendNotificationToUser,
    sendNotificationByTopic,
    getCases,
    getCategories,
    getCasesByCategory,
    getActiveUsersByDate,
    getActiveQuizUsersByDate
} from '../controllers/analyticsController.js';

const router = express.Router();

// Main dashboard summary - all data in one call
router.get('/summary', getSummary);

// User join trend over time
router.get('/users/trend', getUserTrend);

// Gameplay activity trend
router.get('/gameplays/trend', getGameplayTrend);

// Get active users by date (for clicking on chart bars)
router.get('/gameplays/users-by-date/:date', getActiveUsersByDate);

// Get active quiz users by date
router.get('/quizzes/users-by-date/:date', getActiveQuizUsersByDate);

// Recent user registrations
router.get('/users/recent', getRecentUsers);

// Get specific user details with gameplay history
router.get('/users/:userId', getUserDetails);

// Send notification to a specific user
router.post('/users/:userId/send-notification', sendNotificationToUser);

// Send notification by topic
router.post('/notifications/send-by-topic', sendNotificationByTopic);

// Timezone distribution
router.get('/users/timezones', getTimezoneDistribution);

// Get all cases
router.get('/cases', getCases);

// Get all categories
router.get('/categories', getCategories);

// Get cases by category
router.get('/cases/category/:category', getCasesByCategory);

export default router;
