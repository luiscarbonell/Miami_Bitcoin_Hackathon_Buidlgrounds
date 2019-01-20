'use strict'

let dotenv = require('dotenv').config()
let _ = require('lodash')
let path = require('path')
let logger = require('morgan')
let chalk = require('chalk')
let faker = require('faker')
let express = require('express')
let async = require('neo-async')
let mongoose = require('mongoose')
let cors = require('cors')
let bitcore = require('bitcore-lib')
// let Message = require('bitcore-message')
let bodyParser = require('body-parser')
let Insight = require('bitcore-explorers').Insight

let Address = require('./models/address')
let User = require('./models/user')

mongoose.connect("mongodb://localhost:27017/pastelitos", {
  useNewUrlParser: true,
  useCreateIndex: true
})

let app = express()

let PORT = process.env.PORT || 8080

app.use(cors())
app.use(bodyParser.json())
app.use(logger('dev'))

if(process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "../client/build")))
}

/**
* @res {Object}
* @res.address {string} address - BTC Wallet address
*/
app.get("/address", function(req, res) {
  async.auto({
    // Create Private Key
    "key": function(callback) {
      let value = Buffer.from(faker.lorem.words())
      let hash = bitcore.crypto.Hash.sha256(value)
      let bn = bitcore.crypto.BN.fromBuffer(hash)
      let key = new bitcore.PrivateKey(bn)
      
      callback(null, key)
    },
    // Create Address
    "address": ["key", function(results, callback) {
      let address = results.key.toAddress('testnet')
      
      callback(null, address)
    }],
    // Store Private Key & Address
    "store": ["key", "address", function(results, callback) {
      Address.create({
        key: results.key,
        address: results.address
      }, callback)
    }]
  }, function(error, results) {
    if(error) {
      res.status(500).send(error)
    } else {
      res.json({
        address: results.store.address
      })
    }
  })
})

/**
* @req.body {String} email - User's Email
* @req.body {String} address - Course BTC Wallet
*/
app.post('/user', function(req, res) {
  
  async.auto({
    "address": function(callback) {
      Address.findOne({
       address: req.body.address
      }, function(error, address) {
        console.log(error)
        console.log(address)
        callback(error, address)
      })
    },
    "user": ["address", function(results, callback) {
      console.log(results.address)
      
      User.create({
        email: req.body.email,
        address: results.address.id
      }, callback)
    }],
    "update": ["address", "user", function(results, callback) {
      results.address.user = results.user.id
      results.address.save(callback)
    }]
  }, function(error, results) {
    if(error) {
      res.status(500).send(error)
    } else {
      res.json(_.pick(results.user, "id", "email", "address"))
    }
  })
})

if(process.env.NODE_ENV === "production") {
  app.listen(80, function() {
    console.log("\nServer is listening on http://locahost:" + chalk.bold(80) + "\n")
  })
} else {
  app.listen(PORT, function() {
    console.log("\nServer is listening on http://locahost:" + chalk.bold(PORT) + "\n")
  })
}
