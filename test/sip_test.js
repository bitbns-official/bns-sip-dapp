const ico = artifacts.require("ICO");
const usdt = artifacts.require("USDT");
const SIP = artifacts.require("SIPDapp")
const weth=artifacts.require("WETH");
const Web3 = require('web3');
const BN = require("bn.js")
const truffleAssert = require('truffle-assertions');
const fs = require('fs');
var truffleContract = require('@truffle/contract');
// const { assert } = require('console');
// const { assert } = require('console');
console.log((new BN("8").mul(new BN(String(1e18)))).toString());


const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");

let uniswapABI = fs.readFileSync('../abi/uniswapRouter.abi').toString();
uniswapABI = JSON.parse(uniswapABI);

let factoryABI = fs.readFileSync('../abi/factory.abi').toString();
factoryABI = JSON.parse(factoryABI);

let pairABI = fs.readFileSync('../abi/pair.abi').toString();
pairABI = JSON.parse(pairABI);

let erc20ABI = fs.readFileSync('../abi/erc20.abi').toString();
erc20ABI = JSON.parse(erc20ABI);

const advancetime = (time) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      id: new Date().getTime(),
      params: [time]
    }, async (err, result) => {
      if (err) { return reject(err) }
      const newBlockHash = await web3.eth.getBlock('latest').hash

      return resolve(newBlockHash)
    })
  })
}


contract("UNISWAP Router test cases", function() {

  let accounts = null;

  let icotoken = null;
  let usdttoken = null;
  let wethtoken=null;

  let icoadd = null;
  let usdtadd = null;
  let sip = null;
  let wethadd=null;
  let router = null;
  let factory = null;
  let routerAdd = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  let wethADD = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  let factoryADD = "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f";
  router = truffleContract({abi:uniswapABI});
  router.setProvider(provider);
  factory = truffleContract({abi:factoryABI});
  factory.setProvider(provider);

  let icoFactor = 1e9;
  let usdtFactor = 1e6;
  let wethFactor=1e18;
  let routerInstance = null;
  let factoryInstance = null;
  

  before(async function(){
    accounts = await web3.eth.getAccounts();
    
     icotoken = await ico.deployed();
     usdttoken = await usdt.deployed();
     wethtoken=await weth.deployed();
     routerInstance = await router.at(routerAdd);
     factoryInstance = await factory.at(factoryADD);
     usdtadd = usdttoken.address;
     icoadd = icotoken.address;
     wethadd= wethtoken.address;
     sip = await SIP.deployed()
     const largeAmt = "999999999999999999999999999999999999999999"

    //  Allow SIP to take user funds
    // await usdttoken.approve(sip.address, largeAmt, {from: accounts[1]})
    // await usdttoken.approve(sip.address, largeAmt, { from: accounts[2] })
    // await usdttoken.approve(sip.address, largeAmt, { from: accounts[3] })

    // await wethtoken.approve(sip.address, largeAmt, {from: accounts[1]})
    // await wethtoken.approve(sip.address, largeAmt, { from: accounts[2] })
    // await wethtoken.approve(sip.address, largeAmt, { from: accounts[3] })

    // All Accounts approval to WETH pull by SIP
    let approvals = []
    for(let i=1;i<=9;i+=1){
      approvals.push(wethtoken.approve(sip.address, largeAmt, { from: accounts[i] }))
      approvals.push(usdttoken.approve(sip.address, largeAmt, {from: accounts[i]}))
    }
    console.log("WETH per account:", String(100 * wethFactor));
    
    // Send WETH/USDT to all accounts
    let transfers = []
    for (let i = 1; i <= 9; i += 1) {
      transfers.push(wethtoken.transfer(accounts[i], String(100 * wethFactor), { from: accounts[0] }))
      transfers.push(usdttoken.transfer(accounts[i], String(10000000 * usdtFactor), { from: accounts[0] }))
    }
    // await Promise.all(transfers)
    await Promise.all([...approvals, ...transfers])
    console.log("Approval given to SIP to take USDT/WETH from all accounts");
    console.log("USDT/WETH transfers done to all accounts");
    let accBal = await wethtoken.balanceOf(accounts[1])
    console.log({
      account: 1,
      accBal: accBal.toString(),
    });

    //setting address for sip contract
    let feeaccount=accounts[5];
    await sip.setAddresses(feeaccount,routerAdd,factoryADD,icoadd,wethadd);
  });
  
  // it("should be able to verify WETH and Factor address", async function() {


  //   var wethFound = await routerInstance.WETH.call();
  //   assert.equal(wethFound.toLowerCase(), wethADD.toLowerCase(), 'Incorrect WETH address found');

  //   var factoryFound = await routerInstance.factory.call();
  //   assert.equal(factoryFound.toLowerCase(), factoryADD.toLowerCase(), 'Incorrect Factory address found');


  // });

  it("should be able to create pair", async function() {

    var accounts = await web3.eth.getAccounts();
    let amt = 100000 * icoFactor;
    let amt_usdt = 100000 * usdtFactor;
    await icotoken.approve(routerAdd, amt, {from : accounts[0]});
    await usdttoken.approve(routerAdd, amt_usdt, {from : accounts[0]});

    

    await factoryInstance.createPair(icoadd, usdtadd, {from : accounts[0]});

    let allowance1 = await icotoken.allowance.call(accounts[0], routerAdd);
    let allowance2 = await usdttoken.allowance.call(accounts[0], routerAdd);

    assert.equal(allowance1, amt, 'Incorrect allowance ICO');
    assert.equal(allowance2, amt_usdt, 'Incorrect allowance USDT');


  });


  it("should be able to add liquidity", async function() {

    var accounts = await web3.eth.getAccounts();
    let amt = 50000 * icoFactor;
    let amt_usdt = 50000 * usdtFactor;

    let expiry_time = parseInt((new Date().getTime()/1000) + 5000);

    await routerInstance.addLiquidity(icoadd, usdtadd, amt, amt_usdt, amt_usdt, amt, accounts[0], expiry_time, {from : accounts[0], gasLimit:1e11, gasPrice:1});

    // Check the pair address using factory instance

    let pairAdd = await factoryInstance.getPair.call(icoadd, usdtadd);

    let pair = truffleContract({abi:pairABI});
    pair.setProvider(provider);

    let pairInstance = await pair.at(pairAdd);

    let reserve = await pairInstance.getReserves.call();

    if (icoadd < usdtadd){
        assert.equal(reserve._reserve0, amt, 'Incorrect liquidity ICO');
        assert.equal(reserve._reserve1, amt_usdt, 'Incorrect liquidity USDT');
    }
    else {
        assert.equal(reserve._reserve0, amt_usdt, 'Incorrect liquidity USDT - 2');
        assert.equal(reserve._reserve1, amt, 'Incorrect liquidity ICO - 2');
    }
    

  });

  // it("should be able to swap tokens", async function() {

  //   var accounts = await web3.eth.getAccounts();
  //   // Sell 5 ICO tokens for USDT
  //   let amt = 5 * icoFactor;

  //   let expiry_time = parseInt((new Date().getTime()/1000) + 5000);

  //   let preResults = await routerInstance.getAmountsOut.call(amt, [icoadd, usdtadd]);

  //   let balBefore = parseInt(await usdttoken.balanceOf.call(accounts[1]));

  //   await routerInstance.swapExactTokensForTokens(amt, (preResults[1]), [icoadd, usdtadd], accounts[1], expiry_time, {from : accounts[0]});

  //   let balAfter = parseInt(await usdttoken.balanceOf.call(accounts[1]));

  //   assert.equal((balAfter - balBefore), preResults[1], 'Incorrect swap amount');
    

  // });

  // it("should be able to deposit tokens", async () => {
  //   let depositAmt = new BN(String(100 * usdtFactor))
  //   await usdttoken.transfer(accounts[1], depositAmt, {from: accounts[0]})
  //   let oldBal = await sip.tokens.call(usdtadd, accounts[1])
  //   await sip.depositToken(usdtadd, depositAmt, {from: accounts[1]})
  //   let newBal = await sip.tokens.call(usdtadd, accounts[1])
  //   // console.log({oldBal: oldBal.toString(), newBal: newBal.toString()});
  //   assert.equal((oldBal.add(depositAmt)).toString(), newBal.toString(), "Balance add issue")
  // })

  // it("should be able to withdraw tokens", async () => {
  //   let withdrawAmt = new BN(String(49 * usdtFactor))
  //   let tx1,tx2;

  //   tx1 = await sip.withdrawToken(usdtadd, withdrawAmt, {from: accounts[1]})
  //   tx2 = await sip.withdrawTokenOpti(usdtadd, withdrawAmt, {from: accounts[1]})
  //   console.log("OPTIMISATION",{
  //     withdrawToken:tx1.receipt.gasUsed, 
  //     withdrawTokenOpti: tx2.receipt.gasUsed
  //   });
  //   // TODO: Add asserts here
    
  // })

  // it("should be able to subscribe to sip",async()=>{
  // //calling initFees to set fees
  // let initFee=new BN(String(5))
  // await sip.setInitFee(initFee);
  // //checking initfees is set.
  // let initFeeAfter=await sip.initFee.call()
  // console.log(initFeeAfter.toString())
  // assert.equal(initFeeAfter.toString(),initFee.toString(),"Problem with SetInitFee");
  // let beforeethbalance=await wethtoken.balanceOf(accounts[1]);
  // //transfering weth to account1
  // let amteth=new BN(String(100000000000000000000));
  
  // let tx=await wethtoken.transfer(accounts[1],amteth,{from:accounts[0]})
  
  // let afterethbalance=await wethtoken.balanceOf(accounts[1]);
  
  // console.log({
  //   "BEFORE":beforeethbalance.toString(),
  //   "AFTER":afterethbalance.toString()
  // })
  // //deposit token
  // await sip.depositToken(wethadd,afterethbalance,{from:accounts[1]});
  // afterethbalance=await wethtoken.balanceOf(accounts[1]);
  // console.log("BALANCE:",afterethbalance.toString())
  // //subscribe to spp
  // let amttosubscribe=new BN(String(1));
  // let period=new BN(String(3600));
  // let oldSppID = await sip.sppID.call()
  // let tx1 = await sip.subscribeToSppOpti(amttosubscribe,period,icoadd,usdtadd,{from:accounts[1]});
  // // console.log(tx1);
  // let newSppID = await sip.sppID.call()
  // let bnOne = new BN("1")
  //   // console.log((oldSppID.add(bnOne)).toString(), newSppID.toString());
  // assert.ok((oldSppID.add(bnOne)).toString(), newSppID.toString(), "SIP ID Error")
  
  // let sppSubList = await sip.getlistOfSppSubscriptions(accounts[1])
  // // console.log(sppSubList);
  // let sppIDFromMap = sppSubList[sppSubList.length-1]
  // assert.ok(newSppID.toString(), sppIDFromMap.toString())
  // console.log(sppIDFromMap.toString());
  // })

  // it("should be able to charge SIP -  single user", async() => {
  //   let sppIDs = await sip.sppID.call()
  //   const pairMap = {

  //   }
  //   for(let i=1;i<=sppIDs; i+=1) {
  //     let data = await sip.fetchPairAndDirection(i)
  //     console.log(data);
  //     if(pairMap[data.pair] === undefined){
  //       pairMap[data.pair] = {
  //         0: [],
  //         1: []
  //       }
  //     }
  //     pairMap[data.pair][(data.direction === true) ? "1" : "0"].push(i)
  //   }

  //   console.log(pairMap);

  //   const contractWalletBalUsdtOld = await sip.tokens.call(usdtadd, accounts[1])
  //   const sppStats = await sip.sppSubscriptionStats.call(sppIDs)
  //   const deductAmt = sppStats.value

  //   for(let pair of Object.keys(pairMap)){
  //     // Call for true direction
  //     if(pairMap[pair]["1"].length !== 0){
  //       console.log(pair, true);
  //       await sip.chargeWithSPPIndexes(pair, Object.keys(pairMap[pair]["1"]), true)
  //     }

  //     // Call for false direction
  //     if (pairMap[pair]["0"].length !== 0) {
  //       console.log(pair, false);
  //       await sip.chargeWithSPPIndexes(pair, Object.keys(pairMap[pair]["0"]), false)
  //     }
  //   }

  //   const contractWalletBalUsdtNew = await sip.tokens.call(usdtadd, accounts[1])
  //   console.log({
  //     contractWalletBalUsdtOld: contractWalletBalUsdtOld.toString(),
  //     contractWalletBalUsdtNew: contractWalletBalUsdtNew.toString(),
  //     deductAmt: deductAmt.toString()
  //   });
  //   assert.ok((contractWalletBalUsdtOld.sub(deductAmt)).toString() , contractWalletBalUsdtNew.toString())


  // })

  it("should charge fees in proportion", async () => {

  })

  it("should be able to charge 150 SIPs with some random ones closed", async () => {

    let sips = []

    // Deposit WETH & USDT
    let deposits = []
    for (let i = 1; i <= 9; i += 1) { // for accounts
      let amtToTransfer = new BN("8").mul(new BN(String(wethFactor)))
      deposits.push(sip.depositToken(wethadd, amtToTransfer, { from: accounts[i] }))
      deposits.push(sip.depositToken(usdtadd, "100000", { from: accounts[i]}))
    }
    await Promise.all(deposits)

    // Start 150 SIPs
    for (let i = 1; i <= 9; i += 1) { // for accounts
      // WETH for fees
      // let accBal = await wethtoken.balanceOf(accounts[i])
      
      console.log({
        account: i,
        // accBal: accBal.toString(),
        // amtToTransfer: amtToTransfer.toString()
      });
      for (let j = 1; j <= 5; j += 1) {
        let sipAmt = new BN(j.toString());
        // Start SIP
        sips.push(sip.subscribeToSppOpti(sipAmt, "3600", icoadd, usdtadd, { from: accounts[i] }))
      }

    }
    await Promise.all(sips)
    console.log("150 SIPs created");

  })

});