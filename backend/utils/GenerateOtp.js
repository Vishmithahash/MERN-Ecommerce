const crypto = require("crypto");

exports.generateOTP = () => {
    const num = crypto.randomInt(0, 1000000);
    return String(num).padStart(6, '0');
};

  