'use strict'

let trim = (x) => {
    let value = String(x)
    return value.replace(/^\s+|\s+$/gm, '')
}
let isEmpty = (value) => {
    if (value === undefined || value === null || trim(value) === '' || value.length === 0) {
        return true
    } else {
        return false
    }
}

module.exports = {
    isEmpty: isEmpty
}