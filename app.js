const express = require('express');
const cors = require('cors');
const cron = require("node-cron");
const dotenv = require('dotenv');
const connectDB = require('./config/mongoose.js')
const app = express();
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require("cookie-parser");
const userRoute = require('./routes/userRoute.js')
const masterRoute = require('./routes/masterRoute.js')
const managerRoute = require('./routes/managerRoute.js')
const botRoute = require('./routes/botRoute.js')

dotenv.config();
connectDB()

app.use(helmet({
  contentSecurityPolicy:false,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  expectCt: { maxAge: 86400 },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { policy: "none" },
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
}));

app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'https://www.4xmeta.com',
  'https://api.4xmeta.com',
  'https://app.4xmeta.com',
  'https://admin.4xmeta.com',
  'https://web.telegram.org'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, telegram, curl, server-side)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log(`❌ CORS blocked request from: ${origin}`);
    return callback(null, false); // ❗ DO NOT throw error
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ limit: "10mb", extended: true })); 
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 100 
});

app.use('/api', limiter);

app.use('/api/master',masterRoute);
app.use('/api/manager',managerRoute);
app.use('/api/bot',botRoute);
app.use('/api',userRoute);

app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err.message === 'Not allowed by CORS') {
      res.status(403).send('CORS policy does not allow access from this origin');
    } else {
      console.log("App global err : ", err  );
      
      res.status(500).send('Something broke!');
    }
});

app.listen(process.env.PORT, () => {
    console.log(`app listening at http://localhost:${process.env.PORT}`);
})
