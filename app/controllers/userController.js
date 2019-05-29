const express = require('express')
const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const validateInput = require('../libs/paramsValidationLib')
const passwordLib = require('../libs/generatePasswordLib')
const token = require('../libs/tokenLib')
const adminToken = require('../libs/adminTokenLib')
const check = require('../libs/checkLib')
const uuid = require('uuid')

/* Models */
const UserModel = mongoose.model('User')
const AuthModel = mongoose.model('Auth')

// User Signup function 
let signUpFunction = (req, res) => {
    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (req.body.email) {
                if (!validateInput.Email(req.body.email)) {
                    let apiResponse = response.generate(true, 'Email Does not meet the requirement', 400, null)
                    reject(apiResponse)
                } else if (!validateInput.Password(req.body.password)) {
                    let apiResponse = response.generate(true, 'Password must be atleast 8 characters', 400, null)
                    reject(apiResponse)
                }
                else if (check.isEmpty(req.body.password)) {
                    let apiResponse = response.generate(true, 'password parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (!validateInput.UserName(req.body.userName)) {
                    let apiResponse = response.generate(true, 'UserName must be atleast 8 characters', 400, null)
                    reject(apiResponse)
                } else if (!validateInput.CountryCode(req.body.countryCode)) {
                    let apiResponse = response.generate(true, 'Invalid Country Code', 400, null)
                    reject(apiResponse)
                } else if (!validateInput.MobileNumber(req.body.mobileNumber)) {
                    let apiResponse = response.generate(true, 'Invalid Mobile Number', 400, null)
                    reject(apiResponse)
                }
                else {
                    resolve()
                }
            } else {
                logger.error('Field Missing during User creation', 'User Controller : validateUserInput', 5)
                let apiResponse = response.generate(true, 'One or more Parameter(s) is missing', 400, null)
                reject(apiResponse)
            }
        })
    }

    let validateUserName = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ userName: req.body.userName.toLowerCase() })
                .exec((err, retrievedUserDetails) => {
                    if (err) {
                        logger.error(err.message, 'User Controller : validateUserName', 5)
                        let apiResponse = response.generate(true, 'Failed to create User', 400, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(retrievedUserDetails)) {
                        resolve()
                    } else {
                        logger.info('User Name already taken', 'User Controller : validateUserName', 5)
                        let apiResponse = response.generate(true, 'User Name is already taken', 403, null)
                        reject(apiResponse)
                    }
                })
        })
    }

    let createUser = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ email: req.body.email.toLowerCase() })
                .exec((err, retrievedUserDetails) => {
                    if (err) {
                        logger.error(err.message, 'User Controller : createUser', 5)
                        let apiResponse = response.generate(true, 'Failed to create User', 400, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(retrievedUserDetails)) {
                        let newUser = new UserModel({
                            userId: shortid.generate(),
                            firstName: req.body.firstName,
                            lastName: req.body.lastName || '',
                            userName: req.body.userName.toLowerCase(),
                            email: req.body.email.toLowerCase(),
                            countryCode: req.body.countryCode,
                            mobileNumber: req.body.mobileNumber,
                            admin: (/\w*-admin\b/.test(req.body.userName.toLowerCase()) ? true : false),
                            password: passwordLib.hashpassword(req.body.password),
                            activateUserToken: uuid.v4(),
                            createdOn: time.now()
                        })
                        newUser.save((err, newUser) => {
                            if (err) {
                                console.log(err)
                                logger.error(err.message, 'User Controller : createUser', 10)
                                let apiResponse = response.generate(true, 'Failed to create new user', 400, null)
                                reject(apiResponse)
                            } else {
                                // delete keyword will not working until you convert it to js object using toObject()
                                let newUserObj = newUser.toObject()
                                resolve(newUserObj)
                            }
                        })
                    } else {
                        logger.info('User cannot be created. User already present', 'User Controller : createUser', 5)
                        let apiResponse = response.generate(true, 'User already present with this email', 403, null)
                        reject(apiResponse)
                    }
                })
        })
    }
    validateUserInput(req, res)
        .then(validateUserName)
        .then(createUser)
        .then((resolve) => {
            delete resolve.password
            delete resolve._id
            delete resolve.__v
            delete resolve.admin
            let apiResponse = response.generate(false, 'User created', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            console.log(err)
            res.send(err)
        })
}

// User Activate function 
let activateUser = (req, res) => {
    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.body.activateToken)) {
                let apiResponse = response.generate(true, 'activateToken parameter is missing', 400, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    }
    let activateUser = () => {
        return new Promise((resolve, reject) => {
            UserModel.update({ activateUserToken: req.body.activateToken }, { $unset: { activateUserToken: 1 }, active: true }, (err, result) => {
                if (err) {
                    console.log(err)
                    logger.error('Failed to Retrieve User Data', 'User Controller : activateUser', 5)
                    let apiResponse = response.generate(true, 'Failed to activate the user', 400, null)
                    reject(apiResponse)
                } else if (result.n === 0) {
                    logger.error('No User Found', 'User Controller : activateUser', 5)
                    let apiResponse = response.generate(true, 'No User Details Found', 400, null)
                    reject(apiResponse)
                } else {
                    resolve(result)
                }
            })
        })
    }
    validateUserInput(req, res)
        .then(activateUser)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Your account is successfully activated', 200, resolve)
            res.status(200)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.send(err)
        })
}

// Login function 
let loginFunction = (req, res) => {
    let findUser = () => {
        return new Promise((resolve, reject) => {
            if (req.body.email) {
                UserModel.findOne({ $or: [{ email: req.body.email.toLowerCase() }, { userName: req.body.email.toLowerCase() }] }, (err, userDetails) => {
                    if (err) {
                        console.log(err)
                        logger.error('Failed to Retrieve User Data', 'User Controller : findUser', 5)
                        let apiResponse = response.generate(true, 'Failed to find the user', 400, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(userDetails)) {
                        logger.error('No User Found', 'User Controller : findUser', 5)
                        let apiResponse = response.generate(true, 'No User Details Found', 400, null)
                        reject(apiResponse)
                    } else if (userDetails.active == false) {
                        logger.error('No User Found', 'User Controller : findUser', 5)
                        let apiResponse = response.generate(true, 'Email is not verified', 400, null)
                        reject(apiResponse)
                    } else {
                        logger.info('User Found', 'User Controller : findUser', 5)
                        // and this
                        resolve(userDetails)
                    }
                })
            } else {
                let apiResponse = response.generate(true, 'email parameter is missing', 400, null)
                reject(apiResponse)
            }
        })
    }

    let validatePassword = (retrievedUserDetails) => {
        return new Promise((resolve, reject) => {
            passwordLib.comparePassword(req.body.password, retrievedUserDetails.password, (err, isMatch) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'User Controller : validatePassword', 5)
                    let apiResponse = response.generate(true, 'Login Failed', 500, null)
                    reject(apiResponse)
                } else if (isMatch) {
                    let retrievedUserDetailsObj = retrievedUserDetails.toObject()
                    delete retrievedUserDetailsObj.password
                    delete retrievedUserDetailsObj._id
                    delete retrievedUserDetailsObj.__v
                    delete retrievedUserDetailsObj.createdOn
                    delete retrievedUserDetailsObj.modifiedOn
                    resolve(retrievedUserDetailsObj)
                } else {
                    logger.error('Login failed due to incorrect password', 'User Controller : validatePassword', 5)
                    let apiResponse = response.generate(true, 'Wrong password . Login Failed', 500, null)
                    reject(apiResponse)
                }
            })

        })
    }

    let generateToken = (userDetails) => {
        if (userDetails.admin == true) {
            return new Promise((resolve, reject) => {
                adminToken.generateToken(userDetails, (err, tokenDetails) => {
                    if (err) {
                        console.log(err)
                        let apiResponse = response.generate(true, 'Failed to generate token', 500, null)
                        reject(apiResponse)
                    } else {
                        tokenDetails.userId = userDetails.userId
                        delete userDetails.admin
                        tokenDetails.userDetails = userDetails
                        resolve(tokenDetails)
                    }
                })
            })
        } else {
            return new Promise((resolve, reject) => {
                token.generateToken(userDetails, (err, tokenDetails) => {
                    if (err) {
                        console.log(err)
                        let apiResponse = response.generate(true, 'Failed to generate token', 500, null)
                        reject(apiResponse)
                    } else {
                        tokenDetails.userId = userDetails.userId
                        delete userDetails.admin
                        tokenDetails.userDetails = userDetails
                        resolve(tokenDetails)
                    }
                })
            })
        }
    }

    let saveToken = (tokenDetails) => {
        return new Promise((resolve, reject) => {
            let newAuthToken = new AuthModel({
                userId: tokenDetails.userId,
                authToken: tokenDetails.token,
                tokenDetails: tokenDetails.tokenDetails,
                tokenSecret: tokenDetails.tokenSecret,
                tokenGenerationTime: time.now()
            })
            newAuthToken.save((err, newTokenDetails) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'User Controller : saveToken', 10)
                    let apiResponse = response.generate(true, 'Failed to generate new token', 400, null)
                    reject(apiResponse)
                } else {
                    delete tokenDetails.userDetails.active
                    delete tokenDetails.userDetails.countryCode
                    delete tokenDetails.userDetails.mobileNumber
                    let responseBody = {
                        authToken: newTokenDetails.authToken,
                        userDetails: tokenDetails.userDetails
                    }
                    resolve(responseBody)
                }
            })
        })
    }

    findUser(req, res)
        .then(validatePassword)
        .then(generateToken)
        .then(saveToken)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Login successful', 200, resolve)
            res.status(200)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.send(err)
        })
}

// sending forgot password email after submiting user email
let forgotPassword = (req, res) => {
    let validateEmail = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ email: req.body.email.toLowerCase() }, (err, result) => {
                if (err) {
                    logger.error(err.message, 'User Controller : validateEmail', 10)
                    let apiResponse = response.generate(true, `error occured : ${err.message}`, 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'No User Found', 400, null)
                    reject(apiResponse)
                } else {
                    resolve()
                }
            })
        })
    }
    let updateResetTokenInUser = () => {
        return new Promise((resolve, reject) => {
            let findQuery = {
                email: req.body.email.toLowerCase()
            }
            let updateQuery = {
                resetPasswordToken: uuid.v4(),
                resetPasswordExpires: Date.now() + 300000 //link expiration after 5 mins
            }
            UserModel.findOneAndUpdate(findQuery, updateQuery, { multi: true, new: true })
                .exec((err, result) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'User Controller: updateResetTokenInUser', 10)
                        let apiResponse = response.generate(true, `Reset Token Failed`, 500, null)
                        reject(apiResponse)
                    } else {
                        let resultObj = result.toObject()
                        delete resultObj._id
                        delete resultObj.__v
                        delete resultObj.password
                        delete resultObj.admin
                        resolve(resultObj)
                    }
                })
        })
    }
    validateEmail(req, res)
        .then(updateResetTokenInUser)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Reset Token successful', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.send(err)
        })
}

// resetting password 
let resetPassword = (req, res) => {
    let findUser = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ resetPasswordToken: req.body.resetPasswordToken, resetPasswordExpires: { $gt: new Date(Date.now()) } }, (err, result) => {
                if (err) {
                    logger.error(err.message, 'User Controller : findUser', 10)
                    let apiResponse = response.generate(true, `error occured : ${err.message}`, 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'Link Expired', 400, null)
                    reject(apiResponse)
                } else {
                    resolve()
                }
            })
        })
    }

    let validatePassword = () => {
        return new Promise((resolve, reject) => {
            if (!validateInput.Password(req.body.password)) {
                let apiResponse = response.generate(true, `Password does not meet the requirement`, 400, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    }

    let updatePassword = () => {
        return new Promise((resolve, reject) => {
            let updateQuery = {
                password: passwordLib.hashpassword(req.body.password),
                $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
            }
            UserModel.update({ resetPasswordToken: req.body.resetPasswordToken }, updateQuery, (err, result) => {
                if (err) {
                    logger.error(err.message, 'User Controller : resetPassword', 10)
                    let apiResponse = response.generate(true, `Password update failed`, 500, null)
                    reject(apiResponse)
                }
                else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'No User Found', 400, null)
                    reject(apiResponse)
                } else {
                    resolve(result)
                }
            })
        })

    }
    findUser(req, res)
        .then(validatePassword)
        .then(updatePassword)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Password Successfully Updated', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.send(err)
        })
}

// Logout function.
let logout = (req, res) => {
    AuthModel.remove({ authToken: req.query.authToken }, (err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'User Controller : logout', 10)
            let apiResponse = response.generate(true, `error occured : ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'Already logged out or invalid user', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Logged out successfully', 200, result)
            res.send(apiResponse)
        }
    })
}

// getting userdetails to save it in Meeting Model
let getUserDetails = (req, res) => {
    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.params.userId)) {
                let apiResponse = response.generate(true, 'userId parameter is missing', 400, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    }

    let getUserDetails = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ userId: req.params.userId })
                .select('-_id -__v -password')
                .lean()
                .exec((err, result) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'User Controller: getUserDetails', 10)
                        let apiResponse = response.generate(true, 'Error occured while getting the User', 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(result)) {
                        logger.info('No User Found', 'User Controller: getUserDetails')
                        let apiResponse = response.generate(true, 'No User Found', 404, null)
                        reject(apiResponse)
                    } else {
                        resolve(result)
                    }
                })
        })
    }
    validateUserInput(req, res)
        .then(getUserDetails)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'User Found', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            console.log(err)
            res.send(err)
        })
}


module.exports = {

    signUpFunction: signUpFunction,
    activateUser: activateUser,
    loginFunction: loginFunction,
    forgotPassword: forgotPassword,
    resetPassword: resetPassword,
    getUserDetails: getUserDetails,
    logout: logout

}