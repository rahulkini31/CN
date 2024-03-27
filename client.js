// Import necessary modules
const readline = require('readline');
const tls = require('tls');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Define the host and port for the server
const HOST = '127.0.0.1';
const PORT = 2048;

// Create readline interface for user input/output
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize variables to store total price, number of items, and item list
let total_price = 0;
let num_items = 0;
let items = [];

// Options for TLS connection
const options = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),
  rejectUnauthorized: true,
  ca: [fs.readFileSync('server-cert.pem')]
};

// Function to send item data to the server
function sendToServer() {
  const data = items.join(',');
  client.write(data); // Send the item data to the server
}

// Establish TLS connection with the server
const client = tls.connect(PORT, HOST, options, function () {
  console.log(`SSL is validating certificates...`);
  console.log(`Securely connected to ${HOST}:${PORT} using SSL`);
  addItem(); // Start adding items after successful connection
});

// Event handler for receiving data from the server
client.on('data', function (data) {
  total_price = parseFloat(data.toString());
  console.log(`Total Price: $${total_price.toFixed(2)}`);
  addItem();
});


// Event handler for when the connection is closed
client.on('close', function () {
  console.log('Connection closed');
});

// Event handler for connection errors
client.on('error', function (err) {
  if (err.code === 'CERT_UNTRUSTED') {
    console.error('Certificate verification failed: The server certificate was not trusted.');
  } else {
    console.error('Connection error:', err);
  }
  client.end();
});

// Function to prompt user for adding an item
function addItem() {
  rl.question('Enter item name (type "done" to finish): ', function (item_name) {
    if (item_name.toLowerCase() === 'done') {
      rl.close();
      printBill();
      generatePDF();
      client.end(); // Close the TLS connection when done
      return;
    }

    rl.question('Enter item price: ', function (item_price) {
      rl.question('Enter quantity: ', function (quantity) {
        // Convert inputs to appropriate data types
        item_price = parseFloat(item_price);
        quantity = parseInt(quantity);

        // Calculate total price for the item
        const totalPrice = item_price * quantity;

        if (item_name && totalPrice > 0) {
          items.push({ name: item_name, price: item_price, quantity: quantity });
          total_price += totalPrice;
          num_items++;
          sendToServer();
        } else {
          console.log('Invalid input. Please try again.');
        }
      });
    });
  });
}



// Function to print bill
function printBill() {
  const TAX_RATE = 0.1; // Example tax rate (10%)

  console.log('\n------------------ Invoice ------------------');
  console.log('Item Name       Price       Quantity      Total');

  let subtotal = 0;

  // Print each item with details
  items.forEach(item => {
    const totalPrice = item.price * item.quantity;
    console.log(`${item.name.padEnd(15)}$${item.price.toFixed(2).padStart(10)}${item.quantity.toString().padStart(14)}$${totalPrice.toFixed(2)}`);
    subtotal += totalPrice;
  });

  // Calculate taxes and total
  const taxAmount = subtotal * TAX_RATE;
  const totalAmount = subtotal + taxAmount;

  // Print subtotal, taxes, and total
  console.log('\nSubtotal:'.padEnd(45), `$${subtotal.toFixed(2)}`);
  console.log(`Tax (${(TAX_RATE * 100).toFixed(2)}%):`.padEnd(45), `$${taxAmount.toFixed(2)}`);
  console.log('----------------------------------------------');
  console.log(`Total:`.padEnd(45), `$${totalAmount.toFixed(2)}`);
  console.log('----------------------------------------------');

  // Assign subtotal and total to variables for PDF generation
  subtotalForPDF = subtotal.toFixed(2);
  taxAmountForPDF = taxAmount.toFixed(2);
  totalAmountForPDF = totalAmount.toFixed(2);
}

// Function to generate PDF
function generatePDF() {
  const invoiceID = generateUniqueID(); // Generate a unique ID for the invoice

  const doc = new PDFDocument(); // Create a new PDF document
  const stream = fs.createWriteStream(`invoice_${invoiceID}.pdf`); // Create a write stream with unique ID in the filename

  doc.pipe(stream); // Pipe PDF content to the write stream

  // Define text content for the PDF
  doc.fontSize(12).text('------------------ Invoice ------------------', {
    align: 'left'
  }).moveDown();

  // Add headers for item name, price, quantity, and net price
  doc.text('Item-Name      Price      Quantity      Net-Price', {
    align: 'left'
  }).moveDown();

  items.forEach(item => {
    const totalPrice = item.price * item.quantity;
    doc.text(`${item.name.padEnd(15)}  ${item.price.toFixed(2).padStart(10)}  ${item.quantity.toString().padStart(8)}  ${totalPrice.toFixed(2).padStart(10)}`, {
      align: 'left'
    }).moveDown();
  });

  // Calculate the total amount
  const totalAmount = parseFloat(subtotalForPDF) + parseFloat(taxAmountForPDF);

  // Add dotted lines
  doc.moveDown().text('----------------------------------------------', {
    align: 'left'
  });

  // Print subtotal, taxes, and total
  doc.text(`Subtotal:`, {
    align: 'left'
  }).text(`$${subtotalForPDF}`, {
    align: 'right'
  }).moveDown();

  doc.text(`Tax (10%):`, {
    align: 'left'
  }).text(`$${taxAmountForPDF}`, {
    align: 'right'
  }).moveDown();

  doc.text('----------------------------------------------', {
    align: 'left'
  });

  doc.fontSize(14).text(`Total:`, {
    align: 'left'
  }).text(`$${totalAmount.toFixed(2)}`, {
    align: 'right'
  });

  doc.end(); // Finalize the PDF
  console.log(`PDF created successfully with ID: ${invoiceID}.`);
}

// Function
function generateUniqueID() {
  const currentDate = new Date(); // Get the current date
  const datePart = currentDate.toISOString().slice(0, 10).replace(/-/g, ""); // Format date as YYYYMMDD
  const randomPart = Math.random().toString(36).substr(2, 5); // Generate random characters
  return `${datePart}${randomPart}`; // Concatenate date and random characters to form unique ID
}
