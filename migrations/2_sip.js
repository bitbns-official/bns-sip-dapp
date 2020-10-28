const SIP = artifacts.require("SIPDapp");
const USDT = artifacts.require("USDT");
const ICO = artifacts.require("ICO");
module.exports = function (deployer) {
  deployer.deploy(SIP);
  deployer.deploy(USDT);
  deployer.deploy(ICO);
};
