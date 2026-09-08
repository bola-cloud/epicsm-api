const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const InMemoryManager = require('../core/InMemoryManager');
const JobActionV2 = require('../models/JobActionV2');
const JobV2 = require('../models/JobV2');

class SocketManager {
    constructor(server, jobQueue) {
        this.io = socketIo(server, {
            path: '/v2/socket.io', // Isolated path for V2
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            },
            // Performance tuning for high concurrency (30k+ connections)
            maxHttpBufferSize: 1e6,       // 1 MB max payload
            pingTimeout: 60000,           // 60s before marking disconnected
            pingInterval: 25000,          // Heartbeat every 25s
            transports: ['websocket'],    // Force WebSocket only, skip polling
            upgradeTimeout: 10000,
            connectTimeout: 10000,
        });

        this.jobQueue = jobQueue;

        // Pass the io instance to the queue so it can emit
        if (this.jobQueue) {
            this.jobQueue.io = this.io;
        }

        this.setupMiddleware();
        this.setupEvents();
    }

    /**
     * Authenticate sockets using the existing JWT mechanism
     */
    setupMiddleware() {
        this.io.use((socket, next) => {
            // Support Mobile Firebase UID directly or Web Dashboard JWT
            const uid = socket.handshake.auth.uid;
            const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];

            if (uid) {
                // Mobile Firebase Auth
                socket.user = { _id: uid, id: uid };
                return next();
            }

            if (!token) {
                return next(new Error("Authentication error: No uid or token provided"));
            }

            try {
                // Assuming the JWT secret is stored in process.env.JWT_SECRET
                const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret');
                // We attach user info to socket
                socket.user = decoded;
                next();
            } catch (err) {
                return next(new Error("Authentication error: Invalid token"));
            }
        });
    }

    /**
     * Handle connection and events
     */
    setupEvents() {
        this.io.on('connection', (socket) => {
            const userId = socket.user._id || socket.user.id;

            // Wait for register_worker to actually register the user in Memory
            socket.on('register_worker', (payload) => {
                const data = Array.isArray(payload) ? payload[0] : payload;
                if (!data) return;

                const { country = 'all', facebookEnabled = true, instagramEnabled = true, platform = 'all' } = data;

                // Register user in Memory Map with exact status
                InMemoryManager.addUser(socket.id, userId, country, platform, facebookEnabled, instagramEnabled);
            });

            // Event: User completed or failed the job (Legacy Mobile App uses 'order_result')
            socket.on('order_result', async (data, ack) => {
                try {
                    const { jobId, success, reason } = data;

                    if (success === true) {
                        // 1. Fetch the pending action first to validate (Atomic Check)
                        const pendingAction = await JobActionV2.findOne({ jobId, userId, status: 'pending' });

                        if (!pendingAction) {
                            if (typeof ack === 'function') ack({ success: false, reason: 'Action expired or already processed' });
                            return;
                        }

                        // 2. Speed Hack / Botting Protection (Time Validation)
                        const timeElapsed = Date.now() - new Date(pendingAction.createdAt).getTime();
                        if (timeElapsed < 2500) {
                            console.warn(`[V2 Socket] Bot detected! User ${userId} responded in ${timeElapsed}ms for job ${jobId}`);
                            if (typeof ack === 'function') ack({ success: false, reason: 'Action performed too fast. Suspicious activity.' });
                            return;
                        }

                        // 3. Delegate to BatchWriter instead of updating DB directly
                        const BatchWriter = require('../core/BatchWriter');
                        BatchWriter.addActionSuccess(jobId, userId);

                        // Free up the user's pending jobs slot immediately in Memory
                        InMemoryManager.decrementPending(userId);

                        if (typeof ack === 'function') ack({ success: true });
                    } else {
                        // Handle failure or already_done
                        if (reason === 'already_done' || reason === 'direct_follow_already_done' || reason === 'direct_like_already_done') {
                            await JobActionV2.findOneAndUpdate(
                                { jobId, userId },
                                { status: 'completed_externally' }
                            );
                            InMemoryManager.decrementPending(userId);
                        } else {
                            await JobActionV2.findOneAndUpdate(
                                { jobId, userId },
                                { status: 'failed' }
                            );
                            InMemoryManager.decrementPending(userId);
                        }
                        if (typeof ack === 'function') ack({ success: true });
                    }
                } catch (error) {
                    console.error('[V2 Socket] Error on order_result:', error);
                    if (typeof ack === 'function') ack({ success: false, error: error.message });
                }
            });

            // Handle Disconnect
            socket.on('disconnect', () => {
                InMemoryManager.removeUser(socket.id);
                console.log(`[V2 Socket] User disconnected: ${userId} (${socket.id})`);
            });
        });
    }
}

module.exports = SocketManager;
