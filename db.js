const { connect, connection } = require("mongoose");
require("dotenv").config();
const mongoPass = process.env.REACT_APP_MONGOPASS;
const mongoURI = `mongodb+srv://vaidkumar31:${mongoPass}@cluster0.xvys2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

let dbConnection = null;
const connectToDb = async () => {
  try {
    if (!dbConnection) {
      await connect(mongoURI);
      dbConnection = connection;
    }
    return dbConnection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

module.exports = connectToDb;
