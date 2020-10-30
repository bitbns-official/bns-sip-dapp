const SIP = artifacts.require("SIPDapp");
const USDT = artifacts.require("USDT");
const ICO = artifacts.require("ICO");
const WETH=artifacts.require("WETH");
module.exports = function (deployer) {
  deployer.deploy(SIP);
  deployer.deploy(USDT);
  deployer.deploy(ICO);
  deployer.deploy(WETH);
};
