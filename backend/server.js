const app = require("./app");
const debug = require("debug")("node-angular");
const http = require("http");
// const https = require("https");
// const fs = require("fs");

// const credentials = {
//     key: fs.readFileSync(__dirname + '/../certs/key.key'),
//     cert: fs.readFileSync(__dirname + '/../certs/cert.crt')
// };

const normalizePort = val => {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
};

const onError = error => {
    if (error.syscall !== "listen") {
        throw error;
    }
    const bind = typeof port === "string" ? "pipe " + port : "port " + port;
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
};

const onListening = () => {
    const addr = server.address();
    const bind = typeof port === "string" ? "pipe " + port : "port " + port;
    debug("Listening on " + bind);
};

const port = process.env.PORT || 3000;
app.set("port", port);

const server = http.createServer(app);
server.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
});
