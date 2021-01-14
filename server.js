// Importing required packages
const http = require("http"),
  express = require("express"),
  bodyParser = require("body-parser"),
  MessagingResponse = require("twilio").twiml.MessagingResponse,
  cors = require("cors"),
  mongoose = require("mongoose"),
  axios = require("axios"),
  requestsRouter = require("./routes/requests")

// Constants for Twilio authentication
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

// Constant for port that server is listening on
const port = process.env.PORT || 1337

// Allows ability to use environment variables
require("dotenv").config()

// Setting up client for out-bound Twilio text/sms communication
const client = require("twilio")(accountSid, authToken)

// Initializing express app
const app = express()

// Configuring app dependencies and routes
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
)
app.use(cors())
app.use(express.json())
app.use("/requests", requestsRouter)

// Constant for MongoDB Atlas database
const uri = process.env.ATLAS_URI

// Connecting to database
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
})
const connection = mongoose.connection
connection.once("open", () => {
  console.log("MongoDB database connection established successfully!")
})

// Handles in-bound http requests from Twilio
app.post("/sms", (req, res) => {
  // Initializing message response
  const twiml = new MessagingResponse()

  // Processing text/sms request
  const message = req.body.Body.toLowerCase()
  const splitMessage = message.split(" ")

  // Checks if requested currency ticker exists and responds accordingly depending on request
  axios.get(process.env.EXCHANGE_API).then((response) => {
    if (splitMessage[0] in response.data.rates && splitMessage.length > 1) {
      newRequest = {
        phoneNumber: req.body.From,
        ticker: splitMessage[0],
        price: parseFloat(splitMessage[1]).toFixed(2),
      }
      if (
        newRequest.price <
        response.data.rates.cad.value /
          response.data.rates[splitMessage[0]].value
      ) {
        newRequest.type = "decrease"
      } else {
        newRequest.type = "increase"
      }

      axios
        .post(`${process.env.PUBLIC_URL}/requests/add`, newRequest)
        .then(() => {
          twiml.message(
            `You will be notified when ${newRequest.ticker.toUpperCase()} ${
              newRequest.type
            }s to $${newRequest.price} CAD`
          )
          res.writeHead(200, {
            "Content-Type": "text/xml",
          })
          res.end(twiml.toString())
        })
        .catch((err) => {
          console.log(err)
        })
    } else if (splitMessage[0] in response.data.rates) {
      const rate =
        response.data.rates.cad.value /
        response.data.rates[req.body.Body.toLowerCase()].value
      twiml.message(
        `The current exchange rate for 1 ${req.body.Body.toUpperCase()} to CAD is ${rate}`
      )
      res.writeHead(200, {
        "Content-Type": "text/xml",
      })
      res.end(twiml.toString())
    } else {
      twiml.message(
        `Error: ${req.body.Body.toUpperCase()} is not a valid ticker!`
      )
      res.writeHead(200, {
        "Content-Type": "text/xml",
      })
      res.end(twiml.toString())
    }
  })
})

// Fetches new currency exchange data every 60 seconds and fulfills requests if price alert is triggered
setInterval(function () {
  axios.get(process.env.EXCHANGE_API).then((response) => {
    axios
      .get(`${process.env.PUBLIC_URL}/requests/`)
      .then((requests) => {
        requests.data.forEach((request) => {
          if (
            request.price <=
              response.data.rates.cad.value /
                response.data.rates[request.ticker.toLowerCase()].value &&
            request.type === "increase"
          ) {
            client.messages.create({
              to: request.phoneNumber,
              from: process.env.TWILIO_PHONE_NUMBER,
              body: `Alert: ${request.ticker.toUpperCase()} has ${
                request.type
              }d to $${request.price} CAD!`,
            })
            axios
              .delete(`${process.env.PUBLIC_URL}/requests/${request._id}`)
              .catch((err) => {
                console.log(err)
              })
          } else if (
            request.price >=
              response.data.rates.cad.value /
                response.data.rates[request.ticker.toLowerCase()].value &&
            request.type === "decrease"
          ) {
            client.messages.create({
              to: request.phoneNumber,
              from: process.env.TWILIO_PHONE_NUMBER,
              body: `Alert: ${request.ticker.toUpperCase()} has ${
                request.type
              }d to $${request.price} CAD!`,
            })
            axios
              .delete(`${process.env.PUBLIC_URL}/requests/${request._id}`)
              .catch((err) => {
                console.log(err)
              })
          }
        })
      })
      .catch((err) => {
        console.log(err)
      })
  })
}, 60000)

// Launching server
http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port ${port}`)
})
