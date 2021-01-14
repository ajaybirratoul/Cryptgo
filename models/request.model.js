const mongoose = require("mongoose")

const Schema = mongoose.Schema

// Schema model for requests
const requestSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: false,
      trim: true,
      minlength: 10,
    },
    ticker: {
      type: String,
      required: true,
      unique: false,
      trim: true,
      minlength: 1,
    },
    price: {
      type: Number,
      required: true,
      unique: false,
    },
    type: {
      type: String,
      required: true,
      unique: false,
      trim: true,
      minlength: 0,
    },
  },
  {
    timestamps: true,
  }
)

const Request = mongoose.model("Request", requestSchema)

module.exports = Request
