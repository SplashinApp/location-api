import http from 'http'
import express from 'express'
import dotenv from 'dotenv'
import {fileRouter} from "./middleware/file-based-routing.js";

dotenv.config({path:`.env.${process.env.NODE_ENV}`})

const app = express()
const server = http.createServer(app)

app.set('etag', false)
app.use(express.json())
app.all('/*', fileRouter)

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`)
})

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Optional: Log it or send it to an external service
    process.exit(1); // Exit the process to let PM2 restart it
});
