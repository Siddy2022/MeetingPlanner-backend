const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Auth = mongoose.model('Auth')

const logger = require('./../libs/loggerLib')
const responseLib = require('./../libs/responseLib')
const token = require('./../libs/tokenLib')
const check = require('./../libs/checkLib')

let isAuthorized = (req, res, next) => {
    if(req.params.authToken || req.query.authToken || req.body.authToken || req.header('authToken')) {
        Auth.findOne({ authToken : req.header('authToken') || req.params.authToken || req.query.authToken || req.body.authToken },(err,authDetails)=>{
            if(err){
                console.log(err)
                logger.error(err.message,'Authorization Middleware',10)
                let apiResponse = responseLib.generate(true,'Failed to Authorize',500,null)
                res.send(apiResponse)
            } else if (check.isEmpty(authDetails)){
                logger.error('No AuthorizationKey is present','Authorization Middleware',10)
                let apiResponse = responseLib.generate(true,'Invalid or expired authorization key',404,null)
                res.send(apiResponse)
            } else {
                token.verifyClaim(authDetails.authToken, authDetails.tokenSecret,(err,decoded)=>{
                    if(err){
                        logger.error(err.message,'Authorization middleware',10)
                        let apiResponse = responseLib.generate(true,'Failed to authorize',500,null)
                        res.send(apiResponse)
                    } else {
                        console.log('decoded ' + decoded)
                        req.user = {userId : decoded.data.userId}
                        next()
                    }
                })
            }
        })
    } else {
        logger.error('Authorization token missing', 'AuthorizationMiddleware',5)
        let apiResponse = responseLib.generate(true,'Authorization token is missing in request',400,null)
        res.send(apiResponse)
    }
}

module.exports = {
    isAuthorized : isAuthorized
}