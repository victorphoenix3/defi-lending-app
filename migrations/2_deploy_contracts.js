var LoanContract = artifacts.require("./LoanApp");

module.exports = function(deployer) {
  deployer.deploy(LoanContract);
};
