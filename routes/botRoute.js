const express = require('express')
const router = express.Router();
const { botAuth } = require('../middlewares/botAuth')

router.use(botAuth)

router.post('/save-user',(req,res)=>{
    console.log(req.body);
    console.log("fetched telegram");
    res.send(200)
})

module.exports=router