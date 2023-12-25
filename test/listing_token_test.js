const { expect } = require("chai");
const { parseEther, parseUnits, toBigInt } = require("ethers");
const { ethers } = require("hardhat");

describe("Listing Token Sales Contract", function () {
    let tokenSales;
    let tokenCoin;
    let owner;
    let devWallet;
    let addr1;

    beforeEach(async function() {
        const _tokenSales = await ethers.getContractFactory("TokenSales");
        [owner, addr1, devWallet] = await ethers.getSigners();

        const _minterContract = await ethers.getContractFactory("ERC20PresetMinterPauser");
        tokenCoin = await _minterContract.connect(owner).deploy("TokenYield", "TY");

        tokenSales = await _tokenSales.deploy(tokenCoin.getAddress(), owner.address, devWallet.address);

        await tokenCoin.mint(tokenSales.getAddress(), parseUnits("10000000", 18));
    })

    it("Property initial should reflect correctly", async function() {
        expect(await tokenSales.owner()).to.equal(owner.address);
        expect(await tokenSales.currentPrice()).to.equal(parseEther("3"));
        expect(await tokenSales.threshold()).to.equal(parseEther("1000000"));
        expect(await tokenSales.feePercentage()).to.equal(15);
        expect(await tokenSales.token()).to.equal(await tokenCoin.getAddress());
    })

    it("Property should updated and reflect correctluy", async function() {
        await tokenSales.updatePrice(parseEther("4"), parseEther("2000000"), false);
        expect(await tokenSales.currentPrice()).to.equal(parseEther("4"));
        expect(await tokenSales.threshold()).to.equal(parseEther("2000000"));
    })

    it("buyTokens transfer correct value", async function() {
        await tokenSales.updatePrice(parseEther("3"), parseEther("30"), true);
        
        const purchaseAmount = parseEther("3");
        const initialBalanceDevWallet = await ethers.provider.getBalance(devWallet.address);
        const expectedFee = purchaseAmount * toBigInt(15) / toBigInt(1000);

        expect(await ethers.provider.getBalance(addr1.address)).to.be.at.least(purchaseAmount);
        expect(await tokenSales.threshold()).to.equal(parseEther("30"));
        expect(await tokenCoin.balanceOf(addr1.address)).to.equal(parseEther("0"));

        await expect(addr1.sendTransaction({
            to: tokenSales.getAddress(),
            value: parseEther("93")
        })).to.be.revertedWithCustomError(tokenSales, "ExceedMaximumSalesOffer");

        await expect(addr1.sendTransaction({
            to: tokenSales.getAddress(),
            value: parseEther("1.5")
        })).to.be.revertedWith("Value must be multiplication by the price");

        await expect(addr1.sendTransaction({
            to: tokenSales.getAddress(),
            value: purchaseAmount
        })).to.not.be.reverted;

        expect(await tokenCoin.balanceOf(addr1.address)).to.equal(parseEther("1"));

        // test correct value sending to devWallet
        const finalBalanceDevWallet = await ethers.provider.getBalance(devWallet.address);
        const feeReceived = finalBalanceDevWallet - initialBalanceDevWallet;
        expect(feeReceived).to.equal(expectedFee);

    })

    it("withdrawEther should successfully executed with correct value", async function() {
        const initialBalanceOwner = await ethers.provider.getBalance(owner.address);
        await tokenSales.updatePrice(parseEther("3"), parseEther("30"), false);
        await addr1.sendTransaction({
            to: tokenSales.getAddress(),
            value: parseEther("12")
        });
        await expect(tokenSales.withdrawEther(owner.address, parseEther("12"))).to.not.be.reverted;
        await expect(tokenSales.withdrawEther(owner.address, parseEther("12"))).to.be.reverted;

        const finalBalanceOwner = await ethers.provider.getBalance(owner.address);
        const resultFromWithdraw = finalBalanceOwner - initialBalanceOwner;
        await expect(resultFromWithdraw).to.be.greaterThan(parseEther("11"));
    })

    it("withdrawToken should successfully executed with correct value", async function() {
        const initialBalanceOwner = await tokenCoin.balanceOf(owner.address);
        await tokenSales.updatePrice(parseEther("3"), parseEther("30"), false);
        expect(initialBalanceOwner).to.be.equal(0);

        await expect(tokenSales.withdrawTokens(owner.address, parseEther("10"))).to.be.not.reverted;

        const finalBalanceOwner = await tokenCoin.balanceOf(owner.address);
        expect(finalBalanceOwner).to.be.equal(parseEther("10"));
    })

    it("User should not be able to buy token after reach threashold", async function() {
        await tokenSales.updatePrice(parseEther("3"), parseEther("10"), false);
        await expect(addr1.sendTransaction({
            to: tokenSales.getAddress(),
            value: parseEther("30")
        })).to.not.be.reverted;
        await expect(addr1.sendTransaction({
            to: tokenSales.getAddress(),
            value: parseEther("30")
        })).to.be.revertedWithCustomError(tokenSales, "ExceedMaximumSalesOffer");
    })
})