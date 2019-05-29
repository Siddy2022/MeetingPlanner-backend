const mongoose = require('mongoose')
const Schema = mongoose.Schema

const meetingSchema = new Schema({
    meetingId:{
        type : String,
        unique : true,
        required : true
    },
    adminId:{
        type : String,
        required : true
    },
    adminUserName:{
        type : String,
        required : true
    },
    adminFullName : {
        type : String,
        required: true
    },
    userId:{
        type : String,
        required : true
    },
    userFullName:{
        type : String,
        required : true
    },
    userEmail:{
        type : String,
        required : true
    },
    start : {
        type : Date,
        required : true
    },
    end : {
        type : Date,
        required : true,    
    },
    place : {
        type : String,
        required : true
    },
    color : {
        type : Object,
        default: {
            primary: '#1e90ff',
            secondary: '#D1E8FF'
          }
    },
    title : {
        type : String,
        required : true
    },
    currentYear : {
        type : Date,
        default : new Date().getFullYear()
    }
})

module.exports = mongoose.model('Meeting',meetingSchema)