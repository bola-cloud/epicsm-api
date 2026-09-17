const io = require("socket.io-client");

console.log("Starting Mobile Client Simulator...");

const randomUid = "test_user_" + Math.floor(Math.random() * 1000000);
console.log("Generated Random User ID:", randomUid);

const socket = io("http://127.0.0.1:3000", {
  path: '/v2/socket.io',
  transports: ['websocket'],
  auth: {
    uid: randomUid
  }
});

socket.on("connect", () => {
  console.log("\n[Test Client] Connected to Socket.IO server!");
  console.log("[Test Client] Socket ID:", socket.id);
  
  console.log("[Test Client] Emitting 'register_worker' to become eligible for jobs...");
  socket.emit("register_worker", { 
      country: 'all', 
      facebookEnabled: true, 
      instagramEnabled: true, 
      platform: 'all' 
  });
  
  console.log("[Test Client] Waiting for 'job_assigned' from server...\n");
});

socket.on("job_assigned", (data) => {
  console.log("\n====================================");
  console.log("🔥 [Test Client] RECEIVED NEW JOB/ORDER 🔥");
  console.log("====================================");
  console.log(JSON.stringify(data, null, 2));
  console.log("====================================\n");

  if (data.orders && data.orders.length > 0) {
      const order = data.orders[0];
      
      console.log(`[Test Client] Simulating Android App processing order ${order.jobId}...`);
      
      // Wait 3 seconds to simulate human/botting delay (server has 2.5s bot protection)
      setTimeout(() => {
          const result = {
              jobId: order.jobId,
              uid: randomUid,
              platform: order.link && order.link.includes("instagram") ? "instagram" : "facebook",
              status: "success",
              success: true,
              reason: "direct_action_success",
              linkTypeName: order.linkTypeName,
              timestamp: Date.now()
          };
          
          console.log("[Test Client] Emitting 'order_result' back to server:", JSON.stringify(result, null, 2));
          socket.emit("order_result", result, (ack) => {
             console.log("[Test Client] Server acknowledged order_result:", ack);
          });
      }, 3000);
  } else {
      console.log("[Test Client] ERROR: 'orders' array is empty or missing in the payload!");
  }
});

socket.on("disconnect", () => {
  console.log("\n[Test Client] Disconnected");
});

socket.on("connect_error", (err) => {
  console.log("\n[Test Client] Connection Error:", err.message);
});
