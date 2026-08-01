const crypto = require('crypto');
const email = process.argv[2].trim().toLowerCase();
const secret = process.argv[3];
const hmac = crypto.createHmac('sha256', secret).update(email).digest('hex');
console.log(hmac);
