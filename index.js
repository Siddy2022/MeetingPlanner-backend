const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const appConfig = require('./config/appConfig');
const logger = require('./app/libs/loggerLib');
const routeLoggerMiddleware = require('./app/middlewares/routeLogger.js');
const globalErrorMiddleware = require('./app/middlewares/appErrorHandler');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');

const app = express()
app.use(morgan('dev'));
// without bodyParser posting method cannot happen and had to be anywhere before routes function
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(routeLoggerMiddleware.logIp);
app.use(globalErrorMiddleware.globalErrorHandler);
app.use(helmet())

// getting all models present in models folder
let modelsPath = './app/models'
fs.readdirSync(modelsPath).forEach(function(file){
	if(~file.indexOf('js')){
		console.log(`including the ${modelsPath}/${file} model`)
		require(`${modelsPath}/${file}`)
	}
})

// getting all routes present in routes folder
let routesPath = './app/routes'
fs.readdirSync(routesPath).forEach(function(file){
    if(~file.indexOf('.js')){
        console.log(`Including the ${routesPath}/${file} route`)
        let route = require(`${routesPath}/${file}`)
        route.setRouter(app)
    }
})

app.use(globalErrorMiddleware.globalNotFoundHandler);

//this will connect to port and database
// we will be connecting thourgh http for security concerns
// app.listen(appConfig.port,()=>{
//     console.log(`eCommerce app listening on port ${appConfig.port}`)
//     mongoose.connect(appConfig.db.uri, { useNewUrlParser : true });
// })

const server = http.createServer(app)

server.listen(appConfig.port)
server.on('error',onError)
server.on('listening', onListening)

const socketLib = require('./app/libs/socketLib')
socketLib.setServer(server)

function onError(error){
	if(error.syscall !=='listen'){
	logger.error(error.code + 'not equal listen','serverOnErrorHandler',10)
	throw error
	}
	switch(error.code){
	case 'EACCES' :
	logger.error(error.code + ':elavated privileges required','serverOnErrorHandler' , 10)
	process.exit(1)
	break
	case 'EADDRINUSE' :
	logger.error(error.code + 'port is already in use','serverOnErrorHandler' , 10)
	process.exit(1)
	break
	default:
	logger.error(error.code + 'some unknown error occured','serverOnErrorHandler' , 10)
	throw error
	}
}

function onListening(){
	var addr = server.address()
	var bind = typeof addr === 'string'
	? 'pipe ' + addr
	: 'port ' + addr.port;
	('Listening on ' + bind)
	logger.info('server listening on port ' + addr.port,'serverOnListeningHandler', 10)
	let db = mongoose.connect(appConfig.db.uri, { useNewUrlParser : true })
}

process.on('unhandleRejection',(reason,p)=>{
	console.log('unhandled rejection at: Promise ',p,'reason: ',reason)
})

mongoose.connection.on('error',function(err){
	console.log('database connection error');
	console.log(err)
});

mongoose.connection.on('open',function(err){
	if(err){
		console.log('database error');
		console.log(err)
	} else {
		console.log('database connection open success')
	}
})

module.exports = app;