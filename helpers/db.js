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

    // Protect against accidental destructive operations unless explicitly allowed
    const allowDestructive = process.env.ALLOW_DB_DESTRUCTIVE_OPS === "true";

    function isEmptyFilter(filter) {
      return (
        filter == null || (typeof filter === "object" && Object.keys(filter).length === 0)
      );
    }

    try {
      // Block Model.deleteMany called with an empty filter
      const origDeleteMany = mongoose.Model.deleteMany;
      mongoose.Model.deleteMany = function (filter, ...args) {
        if (!allowDestructive && isEmptyFilter(filter)) {
          console.warn("Blocked deleteMany with empty filter on model", this && this.modelName);
          throw new Error(
            "Blocked deleteMany with empty filter. Set ALLOW_DB_DESTRUCTIVE_OPS=true to override."
          );
        }
        return origDeleteMany.apply(this, [filter, ...args]);
      };

      // Older remove() static (deprecated) - block if called without a filter
      if (mongoose.Model.remove) {
        const origRemove = mongoose.Model.remove;
        mongoose.Model.remove = function (filter, ...args) {
          if (!allowDestructive && isEmptyFilter(filter)) {
            console.warn("Blocked remove() with empty filter on model", this && this.modelName);
            throw new Error(
              "Blocked remove() with empty filter. Set ALLOW_DB_DESTRUCTIVE_OPS=true to override."
            );
          }
          return origRemove.apply(this, [filter, ...args]);
        };
      }

      // Protect native dropDatabase and dropCollection on the connected native DB
      const nativeDb = mongoose.connection.db;
      if (nativeDb) {
        if (nativeDb.dropDatabase) {
          const origDropDatabase = nativeDb.dropDatabase.bind(nativeDb);
          nativeDb.dropDatabase = function (...args) {
            if (!allowDestructive) {
              console.warn("Blocked dropDatabase()");
              throw new Error(
                "Blocked dropDatabase(). Set ALLOW_DB_DESTRUCTIVE_OPS=true to override."
              );
            }
            return origDropDatabase(...args);
          };
        }

        if (nativeDb.dropCollection) {
          const origDropCollection = nativeDb.dropCollection.bind(nativeDb);
          nativeDb.dropCollection = function (name, ...args) {
            if (!allowDestructive) {
              console.warn(`Blocked dropCollection(${name})`);
              throw new Error(
                "Blocked dropCollection(). Set ALLOW_DB_DESTRUCTIVE_OPS=true to override."
              );
            }
            return origDropCollection(name, ...args);
          };
        }
      }

      // If available, patch the underlying driver's Collection.prototype.drop
      try {
        const mongodbDriver = mongoose.mongo;
        if (
          mongodbDriver &&
          mongodbDriver.Collection &&
          mongodbDriver.Collection.prototype &&
          mongodbDriver.Collection.prototype.drop
        ) {
          const origColDrop = mongodbDriver.Collection.prototype.drop;
          mongodbDriver.Collection.prototype.drop = function (...args) {
            if (!allowDestructive) {
              console.warn("Blocked Collection.drop() on", this && this.collectionName);
              throw new Error(
                "Blocked Collection.drop(). Set ALLOW_DB_DESTRUCTIVE_OPS=true to override."
              );
            }
            return origColDrop.apply(this, args);
          };
        }
      } catch (e) {
        // non-fatal: continue if driver structure differs
      }
    } catch (e) {
      console.error("Failed to install DB safety wrappers:", e && e.message);
    }

    return state.db;
  }
};