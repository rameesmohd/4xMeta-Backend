const express = require('express')
const router = express.Router();
const { verifyUser } = require('../middlewares/userAuth')
const teleAuth = require('../controllers/user/authController');
const webAuth = require('../controllers/user/web/auth');
const user = require('../controllers/user/userController');
const payment = require('../controllers/user/paymentController');
const investment = require('../controllers/user/invController');
const manager = require('../controllers/user/managerController')
const chart = require('../controllers/chartController');
const bonus = require('../controllers/user/bonusController')
const ticket = require('../controllers/user/ticketContoller')
const { fetchCountryList } = require('../controllers/common/fetchCountryList')
const { activity } = require('../controllers/common/activityController')

const upload = require('../config/multer');
const { default: rateLimit } = require('express-rate-limit');

router.get("/ping",(req,res)=>{
      res.status(200).json({ok : true})
})

// router.post('/test',teleAuth.userlog)

const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

const providerUploads = upload.fields([
  { name: "providerIdFront", maxCount: 1 },
  { name: "providerIdBack", maxCount: 1 },
  { name: "providerSelfie", maxCount: 1 },
  { name: "profitableProof", maxCount: 1 },
]);

router.post("/register-provider", (req, res, next) => {
  providerUploads(req, res, (err) => {
    if (err) {
      // IMPORTANT: handle multer errors cleanly
      return res.status(400).json({
        success: false,
        error: err.message || "Upload failed",
      });
    }
    next();
  });
}, user.registerProvider);
//-----------------------------------WEB PUBLIC---------------------------------------------->
router.post('/register',strictLimiter,upload.none(),webAuth.registerWebUser)

router.post('/login/provider',strictLimiter,webAuth.providerLogin)
router.post('/login',strictLimiter,webAuth.webLogin)

router.route('/forget-password')
    .get(webAuth.forgetPassGenerateOTP)
    .post(webAuth.validateForgetOTP)
    .patch(webAuth.resetPassword)

router.get('/list-countries',strictLimiter,fetchCountryList)
router.post('/callback-request',user.callbackRequestSubmit)

router.get("/activity",activity)

router.get('/user/manager',manager.fetchManager)
router.get("/account-history/manager",manager.fetchAccountData)

router.get("/chart/daily", chart.getDailyChart);
router.get("/chart/weekly", chart.getWeeklyChart);
router.get("/chart/monthly", chart.getMonthlyChart);

router.post('/logout',webAuth.webLogout)  

//------------------------------------TELE PUBLIC--------------------------------------------->
router.post('/user',strictLimiter,teleAuth.teleUser)
// -------------------------------------------------------------------------------->

router.use(verifyUser)

router.post('/user/update-details',user.updateUserDetails)

router.route('/deposit/usdt-trc20')
      .get(payment.trc20CreateDeposit) 
      .post(payment.trc20CheckAndTransferPayment)

router.route('/deposit/usdt-bep20')
      .get(payment.bep20CreateDeposit) 
      .post(payment.bep20CheckAndTransferPayment)

router.route('/bonuses/claim')
      .get(bonus.fetchBonus) 
      .post(investment.makeBonusInvestment)

router.route("/bonus/check-criteria")
      .get(bonus.checkCriteria)

router.post('/withdraw/crypto',payment.withdrawFromMainWallet)

router.get('/wallet',user.fetchUserWallet)

router.get('/transactions/user',user.fetchUserWalletTransactions)

router.get("/account-history/user",user.fetchAccountData)

router.post('/invest',investment.makeInvestment)

router.get('/porfolio',investment.fetchInvestment)

router.route('/withdraw/investment')
      .get(investment.getWithdrawSummary)
      .post(investment.handleInvestmentWithdrawal)

router.post('/portfolio/history',investment.fetchInvTransactions)

router.get('/manager-portfolio',manager.fetchManagerTele)
router.get('/transactions/manager',manager.fetchManagerTransactions)

router.get("/chart",chart.getUserGrowthChart)

router.post('/kyc/otp',user.handleEmailVerificationOtp)
router.post('/kyc/identity',upload.array("identityProof", 2),user.handleKycProofSubmit)
router.post('/kyc/residential',upload.array("residentialProof", 2),user.handleKycProofSubmit)

router.route("/rebate")
      .get(user.fetchRebateTx)
      .post(user.trasferRebateToWallet)

router.get('/investments',investment.fetchInvestments)

router.get('/investment/trades',investment.fetchInvestmentTrades)
router.get('/investment/transactions',investment.fetchInvestmentTransactions)
router.get('/investment',investment.fetchInvById)
router.get('/pending-deposit',investment.checkPendingDeposit)


router.route('/ticket')
.post(upload.array('upload',5),ticket.submitTicket)
.get(ticket.fetchTickets)

router.get('/user',user.fetchUser)

module.exports=router