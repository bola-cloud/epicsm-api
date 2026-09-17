const InMemoryManager = require('./core/InMemoryManager');

console.log("Active users count:", InMemoryManager.activeUsers.size);
for (const [socketId, user] of InMemoryManager.activeUsers.entries()) {
    console.log(`Socket: ${socketId}, User: ${user.userId}, Pending: ${user.pendingJobs}, FB: ${user.facebookEnabled}, Country: ${user.country}`);
}
process.exit(0);
