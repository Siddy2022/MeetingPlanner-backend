const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth')
const userController = require("./../../app/controllers/userController");
const appConfig = require("./../../config/appConfig")

module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/users`;

    // defining routes.

    app.post(`${baseUrl}/signup`, userController.signUpFunction);

    /**
     * @apiGroup User
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/signup User SignUp.
     *
     * @apiParam {string} email email of the user. (body params) (required)
     * @apiParam {string} firstName firstName of the user. (body params) (required)
     * @apiParam {string} lastName lastName of the user. (body params)
     * @apiParam {string} userName userName of the user. (body params) (required)
     * @apiParam {string} countryCode countryCode of the user. (body params) (required)
     * @apiParam {number} mobileNumber mobileNumber of the user. (body params) (required)
     * @apiParam {string} password password of the user. (body params) (required)
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "User Created",
            "status": 200,
            "data": {
                "userId":string,
                "email": string
                "firstName": string,
                "lastName": string,
                "userName" : string,
                "countryCode" : string,
                "mobileNumber" : number,
                "active": boolean,
                "createdOn": date,
                "activateUserToken":string
            }
        }
        @apiErrorExample {json} Error-Response:
	 *
	 * {
	    "error": true,
	    "message": "Failed to create new user",
	    "status": 500,
	    "data": null
	   }
    */

    app.post(`${baseUrl}/activate`, userController.activateUser);
    /**
  * @apiGroup User
  * @apiVersion  1.0.0
  * @api {post} /api/v1/users/activate User Activate.
  *
  * @apiParam {string} activateToken activateToken of the user. (body params) (required)
  * 
  * @apiSuccessExample {object} Success-Response:
      {
         "error": false,
         "message": "Your account is successfully activated",
         "status": 200,
         "data": {
             "n": 1,
             "nModified": 1,
             "ok": 1
             }
         }
     }
     @apiErrorExample {json} Error-Response:
  *
  * {
     "error": true,
     "message": "Failed to activate the user",
     "status": 500,
     "data": null
    }
 */

    app.post(`${baseUrl}/login`, userController.loginFunction);
    /**
   * @apiGroup User
   * @apiVersion  1.0.0
   * @api {post} /api/v1/users/login User Login.
   *
   * @apiParam {string} email email or userName of the user. (body params) (required)
   * @apiParam {string} password password of the user. (body params) (required)
   * 
   * @apiSuccessExample {object} Success-Response:
       {
          "error": false,
          "message": "Login Successful",
          "status": 200,
          "data": {
              "authToken":string,
              "userDetails":{
              "userId": string,
              "firstName": string,
              "lastName": string,
              "email": string,
              "userName" : string
              }
          }
      }
      @apiErrorExample {json} Error-Response:
   *
   * {
      "error": true,
      "message": "Login Failed",
      "status": 500,
      "data": null
     }
  */

    // auth token params: userId.
    app.post(`${baseUrl}/forgot`, userController.forgotPassword);
    /**
     * @apiGroup User
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/forgot User Forgot Password.
     *
     * @apiParam {string} email email of the user. (body params) (required)
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "Reset Token Successful",
            "status": 200,
            "data": {
                "userId":string,
                "email":string,
                "firstName": string,
                "lastName": string,
                "password": string,
                "active" : boolean,
                "createdOn":date,
                "resetPasswordExpires":date,
                "resetPasswordToken" : string,
                "countryCode" : string,
                "mobileNumber" : number
            }
        }
        @apiErrorExample {json} Error-Response:
	 *
	 * {
	    "error": true,
	    "message": "Reset Token Failed",
	    "status": 500,
	    "data": null
	   }
    */

    app.post(`${baseUrl}/reset`, userController.resetPassword);
    /**
     * @apiGroup User
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/reset User Reset Password.
     *
     * @apiParam {string} password password of the user. (body params) (required)
     * @apiParam {string} resetPasswordToken resetPasswordToken of the user. (body params) (required)
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "Password successfully updated",
            "status": 200,
            "data": {
                "n": 1,
                "nModified": 1,
                "ok": 1
            }
        }
        @apiErrorExample {json} Error-Response:
	 *
	 * {
	    "error": true,
	    "message": "Password update Failed",
	    "status": 500,
	    "data": null
	   }
    */
    app.post(`${baseUrl}/logout`, auth.isAuthorized, userController.logout);
    /**
 * @apiGroup User
 * @apiVersion  1.0.0
 * @api {post} /api/v1/users/logout  Logout user.
 *
 * @apiParam {string} authToken The token for authentication.(Send authToken as query parameter, body parameter or as a header)
 * @apiParam {string} userId userId of the user. (body Params) (required)
 * 
 * @apiSuccessExample {object} Success-Response:
     {
        "error": false,
        "message": "Logged Out Successfully",
        "status": 200,
        "data": {
            "n": 1,
            "ok": 1
        }
    }
*/

    app.get(`${baseUrl}/user/:userId`, auth.isAuthorized, userController.getUserDetails)
    /**
 * @apiGroup User
 * @apiVersion  1.0.0
 * @api {get} /api/v1/users/user/:userId Get User Details.
 *
 * @apiParam {string} authToken The token for authentication.(Send authToken as query parameter, body parameter or as a header)
 * @apiParam {string} userId userId of the user
 * 
 * @apiSuccessExample {object} Success-Response:
     {
        "error": false,
        "message": "User Found",
        "status": 200,
        "data": {
            "lastName": string,
            "admin": boolean,
            "createdOn": date,
            "active": boolean,
            "userId": string,
            "firstName": string,
            "userName": string,
            "email": string,
            "countryCode": string,
            "mobileNumber": number
        }
    }
    @apiErrorExample {json} Error-Response:
 *
 * {
    "error": true,
    "message": "No User Found",
    "status": 500,
    "data": null
   }
*/

}
