const http = require("http");
const CONSTANTS = require("./coco");
const host = 'localhost';
const port = CONSTANTS.default.PORT;

const requestListener = function (req, res) {};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});