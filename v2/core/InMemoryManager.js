/**
 * InMemoryManager
 * 
 * Manages active socket connections in memory to prevent hitting the database.
 * Handles Fair Load Balancing by sorting users based on pendingJobs.
 * Prevents Starvation by enforcing MAX_PENDING_JOBS limit.
 */
class InMemoryManager {
    constructor() {
        // Map<SocketId, { userId, platform, country, pendingJobs }>
        this.activeUsers = new Map();
        
        // Reverse Map to quickly find socketId by userId
        this.userSockets = new Map();
        
        this.MAX_PENDING_JOBS = 5;
    }

    /**
     * Register a new user connection
     */
    addUser(socketId, userId, country = 'all', platform = 'all', facebookEnabled = true, instagramEnabled = true) {
        this.activeUsers.set(socketId, {
            userId: userId.toString(),
            country,
            platform,
            facebookEnabled,
            instagramEnabled,
            pendingJobs: 0
        });
        this.userSockets.set(userId.toString(), socketId);
    }

    /**
     * Remove a user connection on disconnect
     */
    removeUser(socketId) {
        const user = this.activeUsers.get(socketId);
        if (user) {
            this.userSockets.delete(user.userId);
            this.activeUsers.delete(socketId);
        }
    }

    /**
     * Increment pending jobs for a specific user
     */
    incrementPending(userId) {
        const socketId = this.userSockets.get(userId.toString());
        if (socketId) {
            const user = this.activeUsers.get(socketId);
            if (user) {
                user.pendingJobs += 1;
            }
        }
    }

    /**
     * Decrement pending jobs for a specific user (on success/fail)
     */
    decrementPending(userId) {
        const socketId = this.userSockets.get(userId.toString());
        if (socketId) {
            const user = this.activeUsers.get(socketId);
            if (user && user.pendingJobs > 0) {
                user.pendingJobs -= 1;
            }
        }
    }

    /**
     * Fair Load Balancing Algorithm
     * Selects up to `neededCount` users who match criteria, 
     * haven't interacted with the target, and have fewest pending jobs.
     */
    getEligibleUsers(neededCount, excludedUserIds = [], country = 'all', platform = 'all') {
        const excludedSet = new Set(excludedUserIds.map(id => id.toString()));
        let eligible = [];

        for (const [socketId, user] of this.activeUsers.entries()) {
            // Check max limits to avoid freezing mobile app
            if (user.pendingJobs >= this.MAX_PENDING_JOBS) continue;

            // Check exclusion list
            if (excludedSet.has(user.userId)) continue;

            // Check country match
            if (country !== 'all' && user.country !== 'all' && user.country !== country) continue;
            
            // Check platform enable/disable settings from mobile app
            if (platform === 'facebook' && user.facebookEnabled === false) continue;
            if (platform === 'instagram' && user.instagramEnabled === false) continue;

            eligible.push({ socketId, ...user });
        }

        // Sort by pendingJobs ascending (Fair Load Balancing)
        eligible.sort((a, b) => a.pendingJobs - b.pendingJobs);

        // Take only the needed amount
        return eligible.slice(0, neededCount);
    }

    /**
     * Get total active count
     */
    getActiveCount() {
        return this.activeUsers.size;
    }
}

// Export as singleton
module.exports = new InMemoryManager();
