const { parseEther } = require("ethers");

require("@nomicfoundation/hardhat-toolbox");
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      accounts: {
        accountsBalance: parseEther("3000").toString(),
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.22"
      },
      {
        version: "0.8.20"
      },
    ]
  }
};
