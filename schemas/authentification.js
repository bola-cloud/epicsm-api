module.exports = {
  loginSchema: {
    id: "/loginSchema",
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
    //  platformName: { type: "string" },
    },
    required: ["email", "password", ],
  },
  registerSchema: {
    id: "/registerSchema",
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string"},
    //  platformName: { type: "string" }
    },
    required: ["email", "password", ],
  },
};
