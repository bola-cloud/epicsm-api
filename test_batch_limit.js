// Mock Firestore
class MockDocRef {
    constructor(id) { this.id = id; }
}

class MockBatch {
    constructor() {
        this.operations = 0;
    }
    update(ref, data) {
        this.operations++;
        if (this.operations > 500) {
            throw new Error("Firestore batch can only contain up to 500 operations");
        }
    }
    async commit() {
        if (this.operations > 500) {
            throw new Error("Firestore batch can only contain up to 500 operations");
        }
        return true;
    }
}

const mockDb = {
    batch: () => new MockBatch()
};

const users = Array.from({ length: 1200 }).map((_, i) => ({
    ref: new MockDocRef(`user_${i}`)
}));

async function oldUpdate(newDailyRewardValue) {
    const batch = mockDb.batch();
    users.forEach(doc => {
        batch.update(doc.ref, { dailyRewards: newDailyRewardValue });
    });
    await batch.commit();
    console.log(`[Old Method] Updated dailyReward to ${newDailyRewardValue} for ${users.length} users`);
}

async function newUpdate(newDailyRewardValue) {
    const chunks = [];
    for (let i = 0; i < users.length; i += 500) {
        chunks.push(users.slice(i, i + 500));
    }
    
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const batch = mockDb.batch();
        chunk.forEach(doc => {
            batch.update(doc.ref, { dailyRewards: newDailyRewardValue });
        });
        await batch.commit();
        console.log(`Committed batch ${i + 1} with ${chunk.length} updates.`);
    }
    console.log(`[New Method] Updated dailyReward to ${newDailyRewardValue} for ${users.length} users in ${chunks.length} batches`);
}

async function runTest() {
    console.log("--- Testing Old Method (Expected to fail) ---");
    try {
        await oldUpdate(100);
    } catch (e) {
        console.error("Old Method Failed:", e.message);
    }

    console.log("\n--- Testing New Method (Expected to succeed) ---");
    try {
        await newUpdate(100);
    } catch (e) {
        console.error("New Method Failed:", e.message);
    }
}

runTest();
