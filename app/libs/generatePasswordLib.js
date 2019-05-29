const bcryptjs = require('bcryptjs')
const saltRounds = 10

let logger = require('../libs/loggerLib')

let hashpassword = (myPlaintextPassword) => {
	let salt = bcryptjs.genSaltSync(saltRounds)
	let hash = bcryptjs.hashSync(myPlaintextPassword, salt)
	return hash
}

let comparePassword = (oldPassword, hashpassword, cb) => {
	bcryptjs.compare(oldPassword, hashpassword, (err,res)=>{
		if(err){
			logger.error(err.message, 'Comparison Error',5)
			cb(err,null)
		} else{
			cb(null,res)
		}
	})
}

let comparePasswordSync = (myPlaintextPassword, hash) => {
	return bcryptjs.compareSync(myPlaintextPassword, hash)
}

module.exports = {
	hashpassword : hashpassword,
	comparePassword : comparePassword,
	comparePasswordSync : comparePasswordSync
}
