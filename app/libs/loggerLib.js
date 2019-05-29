'use strict'

const logger = require('pino')()
const moment = require('moment')

//standard method for capturing error
let captureError = (errorMessage, errorOrigin, errorLevel) => {
	let currentTime = moment()

	let errorResponse = {
		timestamp: currentTime,
		errorMessage: errorMessage,
		errorOrigin: errorOrigin,
		errorLevel: errorLevel
	}
	//method provided by pino to print on console
	logger.error(errorResponse)
	return errorResponse
}

//standard method for capturing messages
let captureInfo = (message, origin, importance) => {
	let currentTime = moment()

	let infoMessage = {
		timestamp: currentTime,
		message: message,
		origin: origin,
		level: importance
	}
	//method provided by pino to print on console
	logger.info(infoMessage)
	return infoMessage
}

module.exports = {
	error: captureError,
	info: captureInfo
}