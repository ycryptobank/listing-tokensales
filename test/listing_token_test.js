const { expect } = require("chai");
const { parseEther, parseUnits, toBigInt } = require("ethers");
const { ethers } = require("hardhat");

describe("Listing Token Sales Contract", function () {
    let tokenSales;
    let tokenCoin;
    let owner;
    let addr1;

    beforeEach(async function() {
        const _tokenSales = await ethers.getContractFactory("TokenSales");
        [owner, addr1] = await ethers.getSigners();

        const _minterContract = await ethers.getContractFactory("ERC20PresetMinterPauser");
        tokenCoin = await _minterContract.connect(owner).deploy("TokenYield", "TY");

        tokenSales = await _tokenSales.deploy(tokenCoin.getAddress(), owner.address);

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
        const initialBalanceOwner = await ethers.provider.getBalance(owner.address);
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

        // test correct value sending to owner
        const finalBalanceOwner = await ethers.provider.getBalance(owner.address);
        const feeReceived = finalBalanceOwner - initialBalanceOwner;
        expect(feeReceived).to.equal(expectedFee);

    })
})