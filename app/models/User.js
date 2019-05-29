'use strict'
const mongoose = require('mongoose')
const Schema = mongoose.Schema;

let userSchema = new Schema({
  userId: {
    type: String,
    index: true,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required : true
  },
  lastName: {
    type: String,
    default: ''
  },
  userName:{
    type:String,
    required:true,
  },
  countryCode : {
    type:String,
    required:true
  },
  mobileNumber : {
    type : Number,
    min : 1111111111,
    max : 9999999999,
    required: true
  },
  admin:{
    type : Boolean,
    default : false
  },
  password: {
    type: String,
    required : true
  },
  email: {
    type: String,
    required : true
  },
  createdOn :{
    type : Date,
    default: Date.now()
  },
  active : {
    type : Boolean,
    default : false
  },
  activateUserToken : String,
  resetPasswordToken : String,
  resetPasswordExpires : Date
  
})



mongoose.model('User', userSchema);