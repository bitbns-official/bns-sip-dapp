const ico = artifacts.require("ICO");
const usdt = artifacts.require("USDT");
const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const fs = require('fs');
var truffleContract = require('@truffle/contract');

const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");

let uniswapABI = fs.readFileSync('../abi/uniswapRouter.abi').toString();
uniswapABI = JSON.parse(uniswapABI);

let factoryABI = fs.readFileSync('../abi/factory.abi').toString();
factoryABI = JSON.parse(factoryABI);

let pairABI = fs.readFileSync('../abi/pair.abi').toString();
pairABI = JSON.parse(pairABI);

let erc20ABI = fs.readFileSync('../abi/erc20.abi').toString();
erc20ABI = JSON.parse(erc20ABI);


contract("UNISWAP Router test cases", function() {

  let icotoken = null;
  let usdttoken = null;
  let icoadd = null;
  let usdtadd = null;
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

  let routerInstance = null;
  let factoryInstance = null;


  before(async function(){
    
     icotoken = await ico.deployed();
     usdttoken = await usdt.deployed();
     routerInstance = await router.at(routerAdd);
     factoryInstance = await factory.at(factoryADD);
     usdtadd = usdttoken.address;
     icoadd = icotoken.address;

  });
  
  it("should be able to verify WETH and Factor address", async function() {


    var wethFound = await routerInstance.WETH.call();
    assert.equal(wethFound.toLowerCase(), wethADD.toLowerCase(), 'Incorrect WETH address found');

    var factoryFound = await routerInstance.factory.call();
    assert.equal(factoryFound.toLowerCase(), factoryADD.toLowerCase(), 'Incorrect Factory address found');


  });

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

  it("should be able to swap tokens", async function() {

    var accounts = await web3.eth.getAccounts();
    // Sell 5 ICO tokens for USDT
    let amt = 5 * icoFactor;

    let expiry_time = parseInt((new Date().getTime()/1000) + 5000);

    let preResults = await routerInstance.getAmountsOut.call(amt, [icoadd, usdtadd]);

    let balBefore = parseInt(await usdttoken.balanceOf.call(accounts[1]));

    await routerInstance.swapExactTokensForTokens(amt, (preResults[1]), [icoadd, usdtadd], accounts[1], expiry_time, {from : accounts[0]});

    let balAfter = parseInt(await usdttoken.balanceOf.call(accounts[1]));

    assert.equal((balAfter - balBefore), preResults[1], 'Incorrect swap amount');
    

  });

});