// start server
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/db/db');
const { initSocket } = require('./src/socket');

connectDB();

const server = http.createServer(app);
initSocket(server);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
