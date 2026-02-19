import mongoose from 'mongoose';
import { sendToToken, sendToTokens, sendToTopic } from '../utils/Notification.js';

// Get the native MongoDB collections (no schemas needed)
const getCollections = () => {
    const db = mongoose.connection.db;
    return {
        users: db.collection('users'),
        gameplays: db.collection('gameplays'),
        cases: db.collection('cases'),
        quizzattempts: db.collection('quizzattempts')
    };
};

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

// Helper to get date string in YYYY-MM-DD format (IST)
const getDateString = (date) => {
    const istDate = new Date(date.getTime() + IST_OFFSET);
    return istDate.toISOString().split('T')[0];
};

// Helper to get start date based on days parameter (returns UTC date corresponding to 00:00 IST)
const getStartDate = (days) => {
    const now = new Date();
    const istNow = new Date(now.getTime() + IST_OFFSET);
    istNow.setUTCHours(0, 0, 0, 0);
    istNow.setUTCDate(istNow.getUTCDate() - days);
    // Convert back to UTC for MongoDB query
    return new Date(istNow.getTime() - IST_OFFSET);
};

/**
 * GET /api/analytics/summary
 * Main dashboard summary - returns all analytics data in one call
 */
export const getSummary = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const { users, gameplays, quizzattempts } = getCollections();
        const startDate = getStartDate(days);
        const today = getDateString(new Date());

        // Run all queries in parallel for performance
        const [
            totalUsers,
            premiumUsers,
            platformCounts,
            genderCounts,
            todaySolvedCases,
            joinTrendData,
            gameplayTrendData,
            quizTrendData,
            timezoneCounts
        ] = await Promise.all([
            // Total users count
            users.countDocuments(),

            // Premium users count
            users.countDocuments({ isPremium: true }),

            // Platform distribution
            users.aggregate([
                { $group: { _id: '$platform', count: { $sum: 1 } } }
            ]).toArray(),

            // Gender distribution
            users.aggregate([
                { $group: { _id: '$gender', count: { $sum: 1 } } }
            ]).toArray(),

            // Today's completed cases (IST day)
            gameplays.countDocuments({
                status: 'completed',
                completedAt: {
                    $gte: getStartDate(0)
                }
            }),

            // User join trend (daily counts for the time range)
            users.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]).toArray(),

            // Gameplay activity trend with unique users
            gameplays.aggregate([
                { $match: { startedAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt', timezone: '+05:30' } },
                        count: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$userId' }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        uniqueUsers: { $size: '$uniqueUsers' }
                    }
                },
                { $sort: { _id: 1 } }
            ]).toArray(),

            // Quiz activity trend (daily counts for the time range)
            quizzattempts.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: '+05:30' } },
                        count: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$userId' }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        uniqueUsers: { $size: '$uniqueUsers' }
                    }
                },
                { $sort: { _id: 1 } }
            ]).toArray(),

            // Timezone distribution
            users.aggregate([
                { $match: { timezone: { $ne: null } } },
                { $group: { _id: '$timezone', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).toArray()
        ]);

        // Format platform split
        const platformSplit = [
            { name: 'Android', value: platformCounts.find(p => p._id === 'android')?.count || 0 },
            { name: 'iOS', value: platformCounts.find(p => p._id === 'ios')?.count || 0 }
        ];

        // Format gender split
        const genderSplit = [
            { name: 'Male', value: genderCounts.find(g => g._id === 'Male')?.count || 0 },
            { name: 'Female', value: genderCounts.find(g => g._id === 'Female')?.count || 0 }
        ];

        // Fill in missing dates for trends
        const joinTrend = fillMissingDates(joinTrendData, days);
        const gameplayTrend = fillMissingDatesWithUsers(gameplayTrendData, days);
        const quizTrend = fillMissingDatesWithUsers(quizTrendData, days);

        // Format timezone distribution
        const timezoneDistribution = timezoneCounts.map(tz => ({
            name: tz._id,
            value: tz.count
        }));

        // Calculate conversion rate
        const conversionRate = totalUsers > 0
            ? parseFloat(((premiumUsers / totalUsers) * 100).toFixed(1))
            : 0;

        res.json({
            totalUsers,
            premiumUsers,
            todaySolvedCases,
            conversionRate,
            platformSplit,
            genderSplit,
            joinTrend,
            gameplayTrend,
            quizTrend,
            timezoneDistribution
        });
    } catch (error) {
        console.error('Error in getSummary:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
};

/**
 * GET /api/analytics/users/trend
 * User registration trend over time
 */
export const getUserTrend = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const { users } = getCollections();
        const startDate = getStartDate(days);

        const trendData = await users.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        res.json(fillMissingDates(trendData, days));
    } catch (error) {
        console.error('Error in getUserTrend:', error);
        res.status(500).json({ error: 'Failed to fetch user trend' });
    }
};

/**
 * GET /api/analytics/gameplays/trend
 * Gameplay activity trend over time
 */
export const getGameplayTrend = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const { gameplays } = getCollections();
        const startDate = getStartDate(days);

        const trendData = await gameplays.aggregate([
            { $match: { startedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt', timezone: '+05:30' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        res.json(fillMissingDates(trendData, days));
    } catch (error) {
        console.error('Error in getGameplayTrend:', error);
        res.status(500).json({ error: 'Failed to fetch gameplay trend' });
    }
};

/**
 * GET /api/analytics/users/recent
 * Recent user registrations with pagination, search and gameplay count
 */
export const getRecentUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;
        const { users, gameplays } = getCollections();

        // Build query object
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const [recentUsers, totalCount] = await Promise.all([
            users
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .project({
                    _id: 1,
                    name: 1,
                    email: 1,
                    gender: 1,
                    platform: 1,
                    isPremium: 1,
                    timezone: 1,
                    createdAt: 1
                })
                .toArray(),
            users.countDocuments(query)
        ]);

        // Get gameplay counts for each user
        const userIds = recentUsers.map(u => u._id);
        const gameplayCounts = await gameplays.aggregate([
            { $match: { userId: { $in: userIds } } },
            { $group: { _id: '$userId', count: { $sum: 1 } } }
        ]).toArray();

        // Create a map for quick lookup
        const countMap = new Map(gameplayCounts.map(g => [g._id.toString(), g.count]));

        // Add casesPlayed to each user
        const usersWithCases = recentUsers.map(u => ({
            ...u,
            casesPlayed: countMap.get(u._id.toString()) || 0
        }));

        res.json({
            users: usersWithCases,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Error in getRecentUsers:', error);
        res.status(500).json({ error: 'Failed to fetch recent users' });
    }
};

/**
 * GET /api/analytics/users/timezones
 * Timezone distribution of users
 */
export const getTimezoneDistribution = async (req, res) => {
    try {
        const { users } = getCollections();

        const timezones = await users.aggregate([
            { $match: { timezone: { $ne: null } } },
            { $group: { _id: '$timezone', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        res.json(timezones.map(tz => ({
            name: tz._id,
            value: tz.count
        })));
    } catch (error) {
        console.error('Error in getTimezoneDistribution:', error);
        res.status(500).json({ error: 'Failed to fetch timezone distribution' });
    }
};

/**
 * GET /api/analytics/users/:userId
 * Get detailed user information including gameplay history
 */
export const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const { users, gameplays } = getCollections();

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const objectId = new mongoose.Types.ObjectId(userId);

        // Fetch user details
        const user = await users.findOne({ _id: objectId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch all gameplays for this user with case details
        const userGameplays = await gameplays
            .find({ userId: objectId })
            .sort({ startedAt: -1 })
            .toArray();

        // Calculate stats
        const totalGames = userGameplays.length;
        const completedGames = userGameplays.filter(g => g.status === 'completed').length;
        const inProgressGames = userGameplays.filter(g => g.status === 'in-progress').length;

        // Calculate total time played (in minutes)
        let totalTimeMinutes = 0;
        userGameplays.forEach(game => {
            if (game.startedAt && game.completedAt) {
                const duration = (new Date(game.completedAt) - new Date(game.startedAt)) / 1000 / 60;
                totalTimeMinutes += duration;
            }
        });

        // Format gameplays with readable time
        const formattedGameplays = userGameplays.map(game => {
            let duration = null;
            if (game.startedAt && game.completedAt) {
                const durationMs = new Date(game.completedAt) - new Date(game.startedAt);
                const minutes = Math.floor(durationMs / 1000 / 60);
                const seconds = Math.floor((durationMs / 1000) % 60);
                duration = `${minutes}m ${seconds}s`;
            }

            return {
                _id: game._id,
                caseId: game.caseId,
                status: game.status,
                startedAt: game.startedAt,
                completedAt: game.completedAt,
                duration,
                score: game.score || 0
            };
        });

        res.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                gender: user.gender,
                platform: user.platform,
                isPremium: user.isPremium,
                timezone: user.timezone,
                createdAt: user.createdAt
            },
            stats: {
                totalGames,
                completedGames,
                inProgressGames,
                totalTimeMinutes: Math.round(totalTimeMinutes)
            },
            gameplays: formattedGameplays
        });
    } catch (error) {
        console.error('Error in getUserDetails:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
};

/**
 * Helper function to fill in missing dates in trend data
 */
function fillMissingDates(data, days) {
    const result = [];
    const dataMap = new Map(data.map(d => [d._id, d.count]));

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = getDateString(date);
        result.push({
            date: dateStr,
            count: dataMap.get(dateStr) || 0
        });
    }

    return result;
}

/**
 * Helper function to fill in missing dates in gameplay trend data with unique users
 */
function fillMissingDatesWithUsers(data, days) {
    const result = [];
    const dataMap = new Map(data.map(d => [d._id, { count: d.count, uniqueUsers: d.uniqueUsers }]));

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = getDateString(date);
        const dayData = dataMap.get(dateStr) || { count: 0, uniqueUsers: 0 };
        result.push({
            date: dateStr,
            count: dayData.count,
            uniqueUsers: dayData.uniqueUsers
        });
    }

    return result;
}

/**
 * POST /api/analytics/users/:userId/send-notification
 * Send a push notification to a specific user
 */
export const sendNotificationToUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { title, body, data = {}, imageUrl } = req.body;
        const { users } = getCollections();

        // Validate required fields
        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const objectId = new mongoose.Types.ObjectId(userId);

        // Fetch user with FCM token
        const user = await users.findOne(
            { _id: objectId },
            { projection: { _id: 1, name: 1, email: 1, fcmToken: 1 } }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.fcmToken) {
            return res.status(400).json({
                error: 'User does not have a registered device token',
                user: { id: user._id, name: user.name, email: user.email }
            });
        }

        // Send notification
        const response = await sendToToken(
            user.fcmToken,
            title,
            body,
            data,
            imageUrl
        );

        res.json({
            success: true,
            message: 'Notification sent successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            notification: {
                title,
                body,
                imageUrl: imageUrl || null
            },
            response
        });
    } catch (error) {
        console.error('Error in sendNotificationToUser:', error);

        // Handle Firebase errors specifically
        if (error.code?.startsWith('messaging/')) {
            return res.status(400).json({
                error: 'Failed to send notification',
                details: error.message
            });
        }

        res.status(500).json({ error: 'Failed to send notification to user' });
    }
};

/**
 * GET /api/analytics/cases
 * Get all cases with basic information (caseId, title, image)
 */
export const getCases = async (req, res) => {
    try {
        const { cases } = getCollections();

        const allCases = await cases
            .find({})
            .project({
                'caseData.caseId': 1,
                'caseData.caseTitle': 1,
                'caseData.mainimage': 1,
                'caseData.caseCategory': 1,
                'caseData.steps': 1
            })
            .sort({ 'caseData.caseId': 1 })
            .toArray();

        // Format the response to extract nested data
        const formattedCases = allCases.map(c => ({
            _id: c._id,
            caseId: c.caseData?.caseId || 'N/A',
            title: c.caseData?.caseTitle || 'Untitled Case',
            imageUrl: c.caseData?.mainimage || null,
            category: c.caseData?.caseCategory || 'General',
            chiefComplaint: c.caseData?.steps?.[0]?.data?.chiefComplaint || 'N/A'
        }));

        res.json(formattedCases);
    } catch (error) {
        console.error('Error in getCases:', error);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
};

/**
 * GET /api/analytics/categories
 * Get all unique categories with case counts
 */
export const getCategories = async (req, res) => {
    try {
        const { cases } = getCollections();

        const categories = await cases.aggregate([
            {
                $group: {
                    _id: '$caseData.caseCategory',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        const formattedCategories = categories.map(cat => ({
            name: cat._id || 'General',
            count: cat.count
        }));

        res.json(formattedCategories);
    } catch (error) {
        console.error('Error in getCategories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

/**
 * GET /api/analytics/cases/category/:category
 * Get cases by category
 */
export const getCasesByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { cases } = getCollections();

        const categoryCases = await cases
            .find({ 'caseData.caseCategory': category })
            .project({
                'caseData.caseId': 1,
                'caseData.caseTitle': 1,
                'caseData.mainimage': 1,
                'caseData.caseCategory': 1,
                'caseData.steps': 1
            })
            .sort({ 'caseData.caseId': 1 })
            .toArray();

        const formattedCases = categoryCases.map(c => ({
            _id: c._id,
            caseId: c.caseData?.caseId || 'N/A',
            title: c.caseData?.caseTitle || 'Untitled Case',
            imageUrl: c.caseData?.mainimage || null,
            category: c.caseData?.caseCategory || 'General',
            chiefComplaint: c.caseData?.steps?.[0]?.data?.chiefComplaint || 'N/A'
        }));

        res.json(formattedCases);
    } catch (error) {
        console.error('Error in getCasesByCategory:', error);
        res.status(500).json({ error: 'Failed to fetch cases by category' });
    }
};

/**
 * POST /api/analytics/notifications/send-by-topic
 * Send a push notification to a specific topic
 */
export const sendNotificationByTopic = async (req, res) => {
    try {
        const { topic, title, body, imageUrl, data } = req.body;

        if (!topic || !title || !body) {
            return res.status(400).json({ error: 'Topic, title, and body are required' });
        }

        const resp = await sendToTopic(topic, title, body, data || {}, imageUrl);

        res.json({
            success: true,
            message: 'Notification sent successfully to topic subscribers',
            response: resp
        });
    } catch (error) {
        console.error('Error in sendNotificationByTopic:', error);
        res.status(500).json({
            error: 'Failed to send topic notification',
            details: error.message
        });
    }
};

/**
 * GET /api/analytics/gameplays/users-by-date/:date
 * Get all unique users who played on a specific date (IST)
 */
export const getActiveUsersByDate = async (req, res) => {
    try {
        const { date } = req.params; // Expected format: YYYY-MM-DD
        const { users, gameplays } = getCollections();

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Parse the date in IST and convert to UTC range
        const [year, month, day] = date.split('-').map(Number);
        // IST midnight = UTC 18:30 previous day
        const istMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET);
        const istEndOfDay = new Date(istMidnight.getTime() + 24 * 60 * 60 * 1000);

        // Get unique user IDs who played on this date
        const uniqueUserIds = await gameplays.distinct('userId', {
            startedAt: {
                $gte: istMidnight,
                $lt: istEndOfDay
            }
        });

        if (uniqueUserIds.length === 0) {
            return res.json({ date, users: [], count: 0 });
        }

        // Fetch user details for these users
        const activeUsers = await users.find({
            _id: { $in: uniqueUserIds }
        }).project({
            _id: 1,
            name: 1,
            email: 1,
            platform: 1,
            isPremium: 1,
            createdAt: 1
        }).toArray();

        // Get gameplay count for each user on this date
        const gameplayCounts = await gameplays.aggregate([
            {
                $match: {
                    userId: { $in: uniqueUserIds },
                    startedAt: { $gte: istMidnight, $lt: istEndOfDay }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    gamesPlayed: { $sum: 1 }
                }
            }
        ]).toArray();

        const countMap = new Map(gameplayCounts.map(g => [g._id.toString(), g.gamesPlayed]));

        // Enrich users with their gameplay count for that day
        const enrichedUsers = activeUsers.map(u => ({
            ...u,
            gamesPlayedOnDate: countMap.get(u._id.toString()) || 0
        }));

        // Sort by games played descending
        enrichedUsers.sort((a, b) => b.gamesPlayedOnDate - a.gamesPlayedOnDate);

        res.json({
            date,
            users: enrichedUsers,
            count: enrichedUsers.length
        });
    } catch (error) {
        console.error('Error in getActiveUsersByDate:', error);
        res.status(500).json({ error: 'Failed to fetch active users for date' });
    }
};

/**
 * GET /api/analytics/quizzes/users-by-date/:date
 * Get all unique users who attempted quizzes on a specific date (IST)
 */
export const getActiveQuizUsersByDate = async (req, res) => {
    try {
        const { date } = req.params; // Expected format: YYYY-MM-DD
        const { users, quizzattempts } = getCollections();

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Parse the date in IST and convert to UTC range
        const [year, month, day] = date.split('-').map(Number);
        // IST midnight = UTC 18:30 previous day
        const istMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET);
        const istEndOfDay = new Date(istMidnight.getTime() + 24 * 60 * 60 * 1000);

        // Get unique user IDs who attempted quizzes on this date
        const uniqueUserIds = await quizzattempts.distinct('userId', {
            timestamp: {
                $gte: istMidnight,
                $lt: istEndOfDay
            }
        });

        if (uniqueUserIds.length === 0) {
            return res.json({ date, users: [], count: 0 });
        }

        // Fetch user details for these users
        const activeUsers = await users.find({
            _id: { $in: uniqueUserIds }
        }).project({
            _id: 1,
            name: 1,
            email: 1,
            platform: 1,
            isPremium: 1,
            createdAt: 1
        }).toArray();

        // Get quiz attempt count for each user on this date
        const attemptCounts = await quizzattempts.aggregate([
            {
                $match: {
                    userId: { $in: uniqueUserIds },
                    timestamp: { $gte: istMidnight, $lt: istEndOfDay }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    gamesPlayed: { $sum: 1 } // Reuse field name gamesPlayed to match frontend expectation or map later
                }
            }
        ]).toArray();

        const countMap = new Map(attemptCounts.map(g => [g._id.toString(), g.gamesPlayed]));

        // Enrich users with their quiz attempt count for that day
        const enrichedUsers = activeUsers.map(u => ({
            ...u,
            gamesPlayedOnDate: countMap.get(u._id.toString()) || 0
        }));

        // Sort by attempts descending
        enrichedUsers.sort((a, b) => b.gamesPlayedOnDate - a.gamesPlayedOnDate);

        res.json({
            date,
            users: enrichedUsers,
            count: enrichedUsers.length
        });
    } catch (error) {
        console.error('Error in getActiveQuizUsersByDate:', error);
        res.status(500).json({ error: 'Failed to fetch active quiz users for date' });
    }
};
