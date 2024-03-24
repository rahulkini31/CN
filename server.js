const tls = require('tls');
const fs = require('fs');

const HOST = '192.168.56.1';
const PORT = 2048;

function calculateTotal(items) {
  let total = 0;
  items.forEach(item => {
    const [, price] = item.split(':');
    total += parseFloat(price);
  });
  return total;
}

const options = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),

  // This is necessary only if using the client certificate authentication.
  requestCert: true,
  rejectUnauthorized: false,

  // This is necessary only if the client uses the self-signed certificate.
  ca: [ fs.readFileSync('server-cert.pem') ]
};

const server = tls.createServer(options, function (socket) {
  console.log(`Connected: ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on('data', function (data) {
    const items = data.toString().split(',');
    const totalPrice = calculateTotal(items);
    socket.write(totalPrice.toString());
  });

  socket.on('end', function () {
    console.log(`Disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
  });

  socket.on('error', function (err) {
    console.error('Socket error:', err);
  });
});


server.on('error', function (err) {
  console.error('Server error:', err);
});


server.listen(PORT, function () {
  console.log(`Server listening on ${PORT}`);
});
