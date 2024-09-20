const mongoose = require("mongoose");
const config = require("../config");

const state = { db: null };

module.exports.instance = async function () {
  if (state.db) {
    return state.db;
  } else {
    console.log(`${process.env.DATABASE_URL}`)
    await mongoose.connect(`${process.env.DATABASE_URL}`);

    state.db = mongoose.connection;
    return state.db;
  }
};