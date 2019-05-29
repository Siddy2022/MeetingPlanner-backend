const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth')
const planController = require("../controllers/meetingController");
const appConfig = require("../../config/appConfig")

module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/meetings`;

    app.get(`${baseUrl}/allusers`,auth.isAuthorized, planController.findUsers)
    /**
     * @apiGroup User
     * @apiVersion  1.0.0
     * @api {get} /api/v1/meetings/allUsers Get paginated normal users.
     *
     * @apiParam {string} authToken The token for authentication.(Send authToken as query parameter, body parameter or as a header)
     * @apiParam {number} skip skip value for pagination. (query params) (optional)
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "Users Found",
            "status": 200,
            "data": {
                "userId":string,
                "email": string,
                "firstName": string,
                "lastName": string,
                "userName" : string,
                "countryCode" : string,
                "mobileNumber" : number,
            }
        }
        @apiErrorExample {json} Error-Response:
	 *
	 * {
	    "error": true,
	    "message": "Error occured while getting the users",
	    "status": 500,
	    "data": null
	   }
    */

    app.get(`${baseUrl}/userMeetings/:userId`, auth.isAuthorized, planController.getUserMeetings)
    /**
     * @apiGroup Meeting
     * @apiVersion  1.0.0
     * @api {get} /api/v1/meetings/userMeetings/:userId Get all meetings of the user (current year only).
     *
     * @apiParam {string} authToken The token for authentication.(Send authToken as query parameter, body parameter or as a header)
     * @apiParam {string} userId userId of the user.
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "Meetings Found",
            "status": 200,
            "data": [
                    {
                "color": {
                    "primary": string,
                    "secondary": string
                        },
                "meetingId": string,
                "adminId": string,
                "adminFullName": string,
                "adminUserName": string,
                "userId": string,
                "userFullName": string,
                "userEmail": string,
                "start": date,
                "end": date,
                "place": string,
                "title": string
                    }
                ]
            }
        @apiErrorExample {json} Error-Response:
	 *
	 * {
	    "error": true,
	    "message": "Error occured while getting the meetings",
	    "status": 500,
	    "data": null
	   }
    */
}