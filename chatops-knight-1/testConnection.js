const isPortReachable = require('is-port-reachable');
const myArgs = process.argv.slice(2);
async function testConnection() {
  const res = await isPortReachable(myArgs[1], {host: myArgs[0]});
  console.log(`Checking connection for ${myArgs[0]} ${myArgs[1]}`);
  if (res) {
    console.log(`connection to ${myArgs[0]} ${myArgs[1]} - Successful `);
    process.exit(0);
  } else {
    console.log(`connection to ${myArgs[0]} ${myArgs[1]} - Failed`);
    process.exit(1);
  }
}
testConnection().catch(() => {});
