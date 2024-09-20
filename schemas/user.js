module.exports = {
  createUserSchema: {
    id: "/createUserSchema",
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
     // platformName: { type: "string" },
      role: { type: "string" },
      company_name: { type: "string" },
      job: { type: "string" },
      phone_number: { type: "string" },
    },
    required: ["email", "password",  "role","company_name","job","phone_number"],
  },
}