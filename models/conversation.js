const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema();

module.exports = mongoose.model("Conversation", conversationSchema);