const mongoose = require('mongoose')
const socketio = require('socket.io')
const events = require('events')
const eventEmitter = new events.EventEmitter()
const nodemailer = require('nodemailer')
const tokenLib = require('./tokenLib')
const adminTokenLib = require('./adminTokenLib')
const shortid = require('shortid')
const check = require('../libs/checkLib')
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const dateformat = require('dateformat')
const schedule = require('node-schedule')

const MeetingModel = mongoose.model('Meeting')

let setServer = (server) => {
    let io = socketio.listen(server);
    let myIo = io.of('/')  //namespace

    /*--------estabilishing connection using service.ts---------------*/
    myIo.on('connection', (socket) => {
        // Sending email which contains link to activate email
         /**
             * @api {emit} activate-email Sending activation email
             * @apiVersion 0.0.1
             * @apiGroup Emit 
             *@apiDescription This event <b>("activate-email")</b> has to be emitted when a user signs up to send activation email.
            *@apiExample The following data has to be emitted
                *{
                    "email":string,
                    "firstName":string,
                    "lastName" : string,
                    "activateUserToken":string
                }
            */
        socket.on('activate-email', (data) => {

            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'meanstack2019@gmail.com',
                    pass: 'meanstackdeveloper@2019'
                }
            });
            let mailOptions = {
                from: '"MeanStack" <Admin@MeanStack.com>', // sender address
                to: data.email, // list of receivers
                subject: 'Welcome to Meeting Planner App', // Subject line
                html: `Hi ${data.firstName} ${data.lastName},<br><br>
                Welcome to the Meeting Planner App. It is used to plan a meeting with professionals at a particular date and time in many time zones.<br>Please Click <a href="https://www.meetingplanner.ml/activate?activateToken=${data.activateUserToken}" >here</a> to verify your email and continue with our sevices.<br><br> Warm Regards,<br>MeanStack Team` // html body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: %s', info.messageId);
            });
        })

        /**
         * @api {emit} forgot-password Sending change password email
         * @apiVersion 0.0.1
         * @apiGroup Emit 
         *@apiDescription This event <b>("forgot-password")</b> has to be emitted when a user inputs his email to receive forget password email.
        *@apiExample The following data has to be emitted
            *{
                "email":string,
                "resetPasswordToken":string
            }
        */
        // sending email which contains link to reset the password
        socket.on('forgot-password', (data) => {
            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'meanstack2019@gmail.com',
                    pass: 'meanstackdeveloper@2019'
                }
            });
            let mailOptions = {
                from: '"MeanStack" <Admin@MeanStack.com>', // sender address
                to: data.email, // list of receivers
                subject: 'Reset Password', // Subject line
                html: `Hi,<br><br>If you are receiving this email, You have forgotten the password on Meeting Planner App.<br>To reset the password Click the <a href="https://www.meetingplanner.ml/reset?passwordToken=${data.resetPasswordToken}">link</a><br><b>The link will expire in 5 minutes</b><br><br>Warm Regards,<br>MeanStack Team` // html body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: %s', info.messageId);
            });
        })

        /**
         * @api {listen} verifyUser Verification of user
         * @apiVersion 0.0.1
         * @apiGroup Listen 
         *@apiDescription This event <b>("verifyUser")</b> has to be listened on the user's end to verify user or admin authentication.
        */
        //To initiate the user
        socket.emit('verifyUser', '')

        /**
         * @api {emit} set-user Setting user online
         * @apiVersion 0.0.1
         * @apiGroup Emit 
         *@apiDescription This event <b>("set-user")</b> has to be emitted when a user comes online. This is to verify if the user is normal user only
        */
        // verify normal user token
        socket.on('set-user', (authToken) => {
            tokenLib.verifyClaimWithoutSecret(authToken, (err, result) => {
                if (err) {
                    /**
                     * @api {listen} auth-error Emitting auth error on fail of token verification
                     * @apiVersion 0.0.1
                     * @apiGroup Listen 
                     *@apiDescription This event <b>("auth-error")</b> has to be listened by the current room and will be triggered if there comes any auth-token error
                        *@apiExample The example data as output
                        *{
                            "status": 500,
                            "error": Please provide correct auth token
                        }
                    */
                    socket.emit('auth-error', { status: 500, error: 'Please provide correct auth token' })
                } else {
                    socket.room = result.data.userId
                    // making the user join in room so the real time notifications can be sent to the user by admin if he is online
                    socket.join(socket.room)
                }
            })
        })

        /**
         * @api {emit} set-admin Setting admin online
         * @apiVersion 0.0.1
         * @apiGroup Emit 
         *@apiDescription This event <b>("set-admin")</b> has to be emitted when a admin comes online. This is to verify if the user is admin user only. The data that has to be passed is <b>authToken</b>.
        */
        //verify admin user token
        socket.on('set-admin', (authToken) => {
            adminTokenLib.verifyClaimWithoutSecret(authToken, (err, result) => {
                if (err) {
                    socket.emit('auth-error', { status: 500, error: 'Please provide correct auth token' })
                } else {
                    /**
                     * @api {listen} start-room Starting the room
                     * @apiVersion 0.0.1
                     * @apiGroup Listen 
                     *@apiDescription This event <b>("start-room")</b> has to be listened to start any room. Only then the other events of room and meeting get to work.
                    */
                    // initiate the page of selected user by the admin
                    socket.emit('start-room', '')

                    /**
                     * @api {emit} join-room Joining the current room
                     * @apiVersion 0.0.1
                     * @apiGroup Emit 
                     *@apiDescription This event ("join-room") has to be emitted when admin opens the user page to check his dashboard. Data that has to be passed here is <b>userId</b>
                    */
                    // here room is consider as the user page opened in front of admin
                    socket.on('join-room', (data) => {
                        socket.room = data
                        // if any other admin is present in the same user page, then he will also be notified of the actions taken by another admin. The data that has to be passed is <b>authToken</b>.
                        socket.join(socket.room)
                    })

                      /**
                     * @api {emit} create-meeting Create meeting
                     * @apiVersion 0.0.1
                     * @apiGroup Emit 
                     *@apiDescription This event <b>("create-meeting")</b> has to be emitted while creating a meeting.It will automatically send meeting created email and meeting will also be automatically scheduled 1 minute before start of the meeting.
                      *@apiExample The following data has to be emitted
                        *{
                            "adminId" : string,
                            "adminFullName" : string,
                            "adminUserName" : string,
                            "userId" : string,
                            "userFullName" : string,
                            "userEmail" : string,
                            "start" : date,
                            "end" : date,
                            "place" : string,
                            "title" : string
                        }
                    */
                    //create meeting by admin
                    socket.on('create-meeting', (data) => {
                        data['meetingId'] = shortid.generate()

                        //saving meeting in db
                        eventEmitter.emit('save-meeting', data)
                    })

                     /**
                     * @api {emit} edit-meeting Edit meeting
                     * @apiVersion 0.0.1
                     * @apiGroup Emit 
                     *@apiDescription This event <b>("edit-meeting")</b> has to be emitted while saving an edited meeting.It will automatically send meeting edited email and meeting will also be automatically rescheduled 1 minute before start of the meeting.
                      *@apiExample The following data has to be emitted
                        *{
                            "meetingId" : string,
                            "adminId" : string,
                            "adminFullName" : string,
                            "adminUserName" : string,
                            "userId" : string,
                            "userFullName" : string,
                            "userEmail" : string,
                            "start" : date,
                            "end" : date,
                            "place" : string,
                            "title" : string
                        }
                    */
                    // edit meeting by admin
                    socket.on('edit-meeting', (data) => {

                        //saving edited meeting in database
                        eventEmitter.emit('edit-meeting', data)
                    })

                     /**
                     * @api {emit} delete-meeting Delete meeting
                     * @apiVersion 0.0.1
                     * @apiGroup Emit 
                     *@apiDescription This event <b>("delete-meeting")</b> has to be emitted while deleting a meeting.It will automatically send meeting deletion email and cancel the scheduled email.
                      *@apiExample The following data has to be emitted
                        *{
                            "meetingId" : string,
                            "adminId" : string,
                            "adminFullName" : string,
                            "adminUserName" : string,
                            "userId" : string,
                            "userFullName" : string,
                            "userEmail" : string,
                            "start" : date,
                            "end" : date,
                            "place" : string,
                            "title" : string
                        }
                    */
                    //delete meeting by admin
                    socket.on('delete-meeting', (data) => {

                        // deleting meeting from database
                        eventEmitter.emit('delete-meeting', data)
                    })
                }
            })
        })

        // leave room on disconnect
        socket.on('disconnect', () => {
            if (socket.room) {
                socket.leave(socket.room)
            }
        })
    })

    //saving created meeting in database
    eventEmitter.on('save-meeting', (data) => {
        let validateUserInput = () => {
            return new Promise((resolve, reject) => {
                if (check.isEmpty(data.meetingId)) {
                    let apiResponse = response.generate(true, 'meetingId parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.adminId)) {
                    let apiResponse = response.generate(true, 'adminId parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.adminUserName)) {
                    let apiResponse = response.generate(true, 'adminUserName parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.adminFullName)) {
                    let apiResponse = response.generate(true, 'adminFullName parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.userId)) {
                    let apiResponse = response.generate(true, 'userId parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.userFullName)) {
                    let apiResponse = response.generate(true, 'userFullName parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.userEmail)) {
                    let apiResponse = response.generate(true, 'userEmail parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.start)) {
                    let apiResponse = response.generate(true, 'start parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.end)) {
                    let apiResponse = response.generate(true, 'end parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.place)) {
                    let apiResponse = response.generate(true, 'place parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.title)) {
                    let apiResponse = response.generate(true, 'title parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (Math.floor((new Date(data.end).getTime() <= new Date(data.start).getTime())) / 60000 > 0) {
                    let apiResponse = response.generate(true, 'End time must be greater than the start time', 400, null)
                    reject(apiResponse)
                } else {
                    resolve()
                }
            })
        }
        let getAllMeetings = () => {
            return new Promise((resolve, reject) => {
                // finding meeting if input start or input end is clashing with already present of meetings of the particular user
                let findQuery = {
                    $and: [
                        { userId: data.userId },
                        {
                            $or: [
                                {
                                    $and: [
                                        { start: { $gte: new Date(data.start) } },
                                        { start: { $lte: new Date(data.end) } }
                                    ]
                                },
                                {
                                    $and: [
                                        { end: { $gte: new Date(data.start) } },
                                        { end: { $lte: new Date(data.end) } }
                                    ]
                                }
                            ]
                        }
                    ]
                }
                MeetingModel.find(findQuery)
                    .select('-_id -__v')
                    .lean()
                    .exec((err, result) => {
                        if (err) {
                            console.log(err)
                            logger.error(err.message, 'Socket Library: getAllMeetings', 10)
                            let apiResponse = response.generate(true, 'Error occured while getting the Meetings', 500, null)
                            reject(apiResponse)
                        } else if (check.isEmpty(result)) {
                            logger.info('No Meetings Found', 'Socket Library: getAllMeetings')
                            resolve()
                        } else {
                            // resolving red color, default is blue
                            resolve({
                                primary: '#ad2121',
                                secondary: '#FAE3E3'
                            })
                        }
                    })
            })
        }
        let createMeeting = (resolvedColor) => {
            return new Promise((resolve, reject) => {
                let newMeeting = new MeetingModel({
                    meetingId: data.meetingId,
                    adminId: data.adminId,
                    adminFullName: data.adminFullName,
                    adminUserName: data.adminUserName,
                    userId: data.userId,
                    userFullName: data.userFullName,
                    userEmail: data.userEmail,
                    start: data.start,
                    end: data.end,
                    place: data.place,
                    title: data.title,
                    color: (resolvedColor) ? resolvedColor : { primary: '#1e90ff', secondary: '#D1E8FF' },
                    currentYear: new Date(data.start).getFullYear()
                })
                newMeeting.save((err, newMeeting) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'Socket Library : createMeeting', 10)
                        let apiResponse = response.generate(true, 'Failed to create new meeting', 400, null)
                        reject(apiResponse)
                    } else {
                        resolve(newMeeting)
                    }
                })
            })
        }
        validateUserInput()
            .then(getAllMeetings)
            .then(createMeeting)
            .then((resolve) => {
                let resolveObj = resolve.toObject()
                delete resolveObj.__v
                delete resolveObj._id
                delete resolveObj.currentYear
                let apiResponse = response.generate(false, 'Meeting created', 200, resolveObj)
                //updating meeting to admin and the user dashboard
                /**
                 * @api {listen} update-meeting Updating meeting in realtime for user and admin
                 * @apiVersion 0.0.1
                 * @apiGroup Listen 
                 *@apiDescription This event <b>("update-meeting")</b> has to be listened by both admin and user that will notify them in real time that meeting is created or edited.
                 *@apiExample The example data as output
                    *{
                        error:false,
                        message : 'Meeting created',
                        status : 200,
                        data :
                            {
                                "meetingId" : string,
                                "adminId" : string,
                                "adminFullName" : string,
                                "adminUserName" : string,
                                "userId" : string,
                                "userFullName" : string,
                                "userEmail" : string,
                                "start" : date,
                                "end" : date,
                                "place" : string,
                                "title" : string
                            }
                    }
                */
                io.sockets.in(data.userId).emit('update-meeting', apiResponse)
                // sending meeting created email
                eventEmitter.emit('meeting-create-email', resolveObj)
                // scheduling the email for being sent 1 minute before the meeting starts
                eventEmitter.emit('schedule-meeting', resolveObj)
            })
            .catch((err) => {
                console.log(err)
            })
    })

    // saving edited meeting in database
    eventEmitter.on('edit-meeting', (data) => {
        let validateUserInput = () => {
            return new Promise((resolve, reject) => {
                if (check.isEmpty(data.meetingId)) {
                    let apiResponse = response.generate(true, 'meetingId parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.adminId)) {
                    let apiResponse = response.generate(true, 'adminId parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.adminUserName)) {
                    let apiResponse = response.generate(true, 'adminUserName parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.adminFullName)) {
                    let apiResponse = response.generate(true, 'adminFullName parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.userId)) {
                    let apiResponse = response.generate(true, 'userId parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.userFullName)) {
                    let apiResponse = response.generate(true, 'userFullName parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.userEmail)) {
                    let apiResponse = response.generate(true, 'userEmail parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.start)) {
                    let apiResponse = response.generate(true, 'start parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.end)) {
                    let apiResponse = response.generate(true, 'end parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.place)) {
                    let apiResponse = response.generate(true, 'place parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(data.title)) {
                    let apiResponse = response.generate(true, 'title parameter is missing', 400, null)
                    reject(apiResponse)
                } else if (Math.floor((new Date(data.end).getTime() <= new Date(data.start).getTime())) / 60000 > 0) {
                    let apiResponse = response.generate(true, 'End time must be greater than the start time', 400, null)
                    reject(apiResponse)
                } else {
                    resolve()
                }
            })
        }

        let getAllMeetings = () => {
            return new Promise((resolve, reject) => {
                // finding meeting if input start or input end is clashing with already present of meetings of the particular user
                let findQuery = {
                    $and: [
                        { userId: data.userId },
                        {
                            $or: [
                                {
                                    $and: [
                                        { start: { $gte: new Date(data.start) } },
                                        { start: { $lte: new Date(data.end) } }
                                    ]
                                },
                                {
                                    $and: [
                                        { end: { $gte: new Date(data.start) } },
                                        { end: { $lte: new Date(data.end) } }
                                    ]
                                }
                            ]
                        },
                        { meetingId: { $ne: data.meetingId } }
                    ]
                }
                MeetingModel.find(findQuery)
                    .select('-_id -__v')
                    .lean()
                    .exec((err, result) => {
                        if (err) {
                            console.log(err)
                            logger.error(err.message, 'Socket Library: getAllMeetings', 10)
                            let apiResponse = response.generate(true, 'Error occured while getting the Meetings', 500, null)
                            reject(apiResponse)
                        } else if (check.isEmpty(result)) {
                            logger.info('No Meetings Found', 'Socket Library: getAllMeetings')
                            console.log('Empty')
                            resolve()
                        } else {
                            // resolving red color, default is blue
                            resolve({
                                primary: '#ad2121',
                                secondary: '#FAE3E3'
                            })
                        }
                    })
            })
        }

        let editAndSaveMeeting = (resolvedColor) => {
            return new Promise((resolve, reject) => {
                MeetingModel.findOneAndUpdate({ meetingId: data.meetingId }, { start: data.start, end: data.end, title: data.title, place: data.place, color: (resolvedColor) ? resolvedColor : { primary: '#1e90ff', secondary: '#D1E8FF' }, currentYear: new Date(data.start).getFullYear() }, { new: true }, (err, editedMeeting) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'Socket Library : editAndSaveMeeting', 10)
                        let apiResponse = response.generate(true, 'Failed to edit meeting', 400, null)
                        reject(apiResponse)
                    } else {
                        resolve(editedMeeting)
                    }
                })
            })
        }
        validateUserInput()
            .then(getAllMeetings)
            .then(editAndSaveMeeting)
            .then((resolve) => {
                let resolveObj = resolve.toObject()
                delete resolveObj.__v
                delete resolveObj._id
                let apiResponse = response.generate(false, 'Meeting saved', 200, resolveObj)
                //updating meeting to admin and the user dashboard
                io.sockets.in(data.userId).emit('update-meeting', apiResponse)
                // sending meeting reschedule email
                eventEmitter.emit('meeting-update-email', resolveObj)

                // scheduling the email for being sent 1 minute before the edited meeting starts
                eventEmitter.emit('schedule-meeting', resolveObj)
            })
            .catch((err) => {
                console.log(err)
            })
    })

    // deleting meeting from db
    eventEmitter.on('delete-meeting', (data) => {
        let validateUserInput = () => {
            return new Promise((resolve, reject) => {
                if (check.isEmpty(data.meetingId)) {
                    let apiResponse = response.generate(true, 'meetingId parameter is missing', 400, null)
                    reject(apiResponse)
                }
                else {
                    resolve()
                }
            })
        }

        let deleteMeeting = () => {
            return new Promise((resolve, reject) => {
                MeetingModel.findOneAndRemove({ meetingId: data.meetingId }, (err, deletedMeeting) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'Socket Library : deleteMeeting', 10)
                        let apiResponse = response.generate(true, 'Failed to delete meeting', 400, null)
                        reject(apiResponse)
                    } else {
                        resolve(deletedMeeting)
                    }
                })
            })
        }
        validateUserInput()
            .then(deleteMeeting)
            .then((resolve) => {
                let resolveObj = resolve.toObject()
                delete resolveObj.__v
                delete resolveObj._id
                let apiResponse = response.generate(false, 'Meeting deleted', 200, resolveObj)
                /**
                 * @api {listen} delete-meeting deleting meeting in realtime for user and admin
                 * @apiVersion 0.0.1
                 * @apiGroup Listen 
                 *@apiDescription This event <b>("delete-meeting")</b> has to be listened by both admin and user that will notify them in real time that meeting is deleted.
                */
               // deleting meeting to user and admin dashboards
                io.sockets.in(apiResponse.data.userId).emit('delete-meeting', apiResponse)
                // sending email of deleted meeting to the user
                eventEmitter.emit('meeting-delete-email', data)

                // canceling the scheduled task from the scheduledJobs array
                let scheduledMeeting = schedule.scheduledJobs[data.meetingId]
                if (scheduledMeeting) {
                    scheduledMeeting.cancel()
                }
            })
            .catch((err) => {
                console.log(err)
            })
    })

    // scheduling email to send before one minute of created or edited meeting
    eventEmitter.on('schedule-meeting', (data) => {
        let meeting = schedule.scheduledJobs[data.meetingId]
        if (meeting) {
            meeting.cancel()
        }
        let reminder = new Date(data.start).setMinutes(new Date(data.start).getMinutes() - 1)
        let a = schedule.scheduleJob(data.meetingId, reminder, function () {
            let transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'meanstack2019@gmail.com',
                    pass: 'meanstackdeveloper@2019'
                }
            });
            let mailOptions = {
                from: '"MeanStack" <Admin@MeanStack.com>', // sender address
                to: data.userEmail, // list of receivers
                subject: 'Meeting About to Start', // Subject line
                html: `Hi ${data.userFullName},<br><br>The following meeting is about to start soon,<br><br><b>Title: </b>${data.title}<br><b>Venue: </b>${data.place}<br><b>Start: </b>${dateformat(data.start, "dddd, mmmm dS, yyyy, h:MM TT")}<br><b>End: </b>${dateformat(data.end, "dddd, mmmm dS, yyyy, h:MM TT")}<br><br>Warm Regards,<br>MeanStack Team` // html body
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: %s', info.messageId);
            });
            /**
                 * @api {listen} userId Meeting Reminder
                 * @apiVersion 0.0.1
                 * @apiGroup Listen 
                 *@apiDescription This event <b>("userId")</b> has to be listened by the online user that will notify them in real time that is about to start in 1 minute.
                 *@apiExample The example data as output
                    *{
                        "meetingId" : string,
                        "adminId" : string,
                        "adminFullName" : string,
                        "adminUserName" : string,
                        "userId" : string,
                        "userFullName" : string,
                        "userEmail" : string,
                        "start" : date,
                        "end" : date,
                        "place" : string,
                        "title" : string
                    }
                */
            myIo.emit(data.userId, data)
        })

    })
}

// meeting created email
eventEmitter.on('meeting-create-email', (data) => {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'meanstack2019@gmail.com',
            pass: 'meanstackdeveloper@2019'
        }
    });
    let mailOptions = {
        from: '"MeanStack" <Admin@MeanStack.com>', // sender address
        to: data.userEmail, // list of receivers
        subject: 'Meeting Scheduled', // Subject line
        html: `Hi ${data.userFullName},<br><br>A meeting,<br><br><b>Title: </b>${data.title}<br><b>Venue: </b>${data.place}<br><b>Start: </b>${dateformat(data.start, "dddd, mmmm dS, yyyy, h:MM TT")}<br><b>End: </b>${dateformat(data.end, "dddd, mmmm dS, yyyy, h:MM TT")}<br><br>has been created by <b>Admin: </b>${data.adminFullName}.<br><br>Warm Regards,<br>MeanStack Team` // html body
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
    });
})

//meeting updated email
eventEmitter.on('meeting-update-email', (data) => {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'meanstack2019@gmail.com',
            pass: 'meanstackdeveloper@2019'
        }
    });
    let mailOptions = {
        from: '"MeanStack" <Admin@MeanStack.com>', // sender address
        to: data.userEmail, // list of receivers
        subject: 'Meeting Rescheduled', // Subject line
        html: `Hi ${data.userFullName},<br><br>A meeting has been updated as below,<br><br><b>Title: </b>${data.title}<br><b>Venue: </b>${data.place}<br><b>Start: </b>${dateformat(data.start, "dddd, mmmm dS, yyyy, h:MM TT")}<br><b>End: </b>${dateformat(data.end, "dddd, mmmm dS, yyyy, h:MM TT")}<br><br>Warm Regards,<br>MeanStack Team` // html body
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
    });
})

// meeting deleted email
eventEmitter.on('meeting-delete-email', (data) => {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'meanstack2019@gmail.com',
            pass: 'meanstackdeveloper@2019'
        }
    });
    let mailOptions = {
        from: '"MeanStack" <Admin@MeanStack.com>', // sender address
        to: data.userEmail, // list of receivers
        subject: 'Meeting Canceled', // Subject line
        html: `Hi ${data.userFullName},<br><br>The following meeting has been deleted by admin:-<br><br><b>Title: </b>${data.title}<br><b>Venue: </b>${data.place}<br><b>Start: </b>${dateformat(data.start, "dddd, mmmm dS, yyyy, h:MM TT")}<br><b>End: </b>${dateformat(data.end, "dddd, mmmm dS, yyyy, h:MM TT")}<br><br>Warm Regards,<br>MeanStack Team` // html body
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
    });
})

module.exports = {
    setServer: setServer
}
