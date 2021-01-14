const router = require("express").Router()
let Request = require("../models/request.model")

// Returns all requests from MongoDB server
router.route("/").get((req, res) => {
  Request.find()
    .then((requests) => res.json(requests))
    .catch((err) => res.status(400).json("Error: " + err))
})

// Adds request to server
router.route("/add").post((req, res) => {
  const phoneNumber = req.body.phoneNumber
  const ticker = req.body.ticker
  const price = req.body.price
  const type = req.body.type

  const newRequest = new Request({
    phoneNumber,
    ticker,
    price,
    type,
  })

  newRequest
    .save()
    .then(() => res.json("Request Added!"))
    .catch((err) => res.status(400).json("Error: " + err))
})

// Deletes request from server
router.route("/:id").delete((req, res) => {
  Request.findByIdAndDelete(req.params.id)
    .then(() => res.json("Request deleted"))
    .catch((err) => res.status(400).json("Error: ", +err))
})

// Exports server
module.exports = router
