import express from 'express';
import cors from 'cors';
import session from 'express-session';
import crypto from 'crypto'
import NodeCache from 'node-cache';


export const app = express();
export const myCache = new NodeCache(); // use to store data into ram memory

app.use(cors({

    origin: process.env.CLIENT_ORIGIN, // Adjust origin based on your frontend URL
    credentials: true
}))

// Use express-session middleware
const secretKey = crypto.randomBytes(64).toString('hex');
// console.log(secretKey);
app.use(session({
    secret: secretKey, // Secret used to sign the session ID cookie
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 60 * 60 * 24 * 2,
        // httpOnly: false,
        // asif have change it after deployment start
        maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
        httpOnly: true, // Restrict cookie access to HTTP(S) requests only
        secure: process.env.NODE_ENV === 'production' // Set secure attribute only in production

        // asif have change it after deployment end
    }
}));

app.use(express.json({ limit: "16mb" })) //limit to send data to the server
app.use(express.urlencoded({ extended: true, limit: "16kb" })) //this will encode your url
app.use(express.static("public")) // i am creating public folder to save my images or data

//routes import

import userRouter from './routes/user.routes.js';
import healthCheckRouter from "./routes/healthCheck.routes.js"
import productRouter from "./routes/product.routes.js"
import contactFormRouter from "./routes/contact_form.routes.js"


//routes declaration
app.use("/api/v1/healthcheck", healthCheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/products", productRouter)
app.use("/api/v1/contactForm", contactFormRouter)






