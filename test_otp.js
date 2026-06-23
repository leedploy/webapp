const OTPAuth = require('otpauth');

const codeToFind = '501702';
const secrets = {
  'cidxwrn5c4ypauasb7hb4gfunkstirwj': 'Only second part after |',
  'cdbdhlmmbrkcidxwrn5c4ypauasb7hb4gfunkstirwj': 'Full string without |',
};

// สแกนย้อนหลัง 30 นาที (60 คาบเวลา คาบละ 30 วินาที)
const nowSeconds = Math.floor(Date.now() / 1000);

for (const [secret, desc] of Object.entries(secrets)) {
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret.toUpperCase())
    });

    for (let i = 0; i < 120; i++) {
      const testTime = nowSeconds - (i * 30);
      const code = totp.generate({ timestamp: testTime * 1000 });
      if (code === codeToFind) {
        console.log(`MATCH FOUND!`);
        console.log(`Secret: ${secret} (${desc})`);
        console.log(`Time: ${new Date(testTime * 1000).toLocaleString()}`);
        process.exit(0);
      }
    }
  } catch (e) {
    console.error(`Error with ${secret}:`, e.message);
  }
}

console.log('No match found in the last 60 minutes.');
