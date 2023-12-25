// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenSales is Ownable {

    error ExceedMaximumSalesOffer();

    IERC20 public token; 
    uint256 public constant feePercentage = 15; // 1.5% fee 
    uint256 public totalTokenPurchased;
    uint256 public currentPrice = 3 ether;
    uint256 public threshold = 1000000 ether;
    bool isFeeCharged = true;
    address devAddress;

    event TokensPurchased(
        address indexed buyer,
        uint256 amount,
        uint256 pricePaid
    );

    constructor(address _tokenAddress, address initialOwner, address _devAddress)
        Ownable(initialOwner)
    {
        token = IERC20(_tokenAddress);
        totalTokenPurchased = 0 ether;
        devAddress = _devAddress;
    }

    function updatePrice(uint256 _price, uint256 _threshold, bool _isFeeCharged) external onlyOwner {
        currentPrice = _price;
        threshold = _threshold;
        isFeeCharged = _isFeeCharged;
    }

    function buyTokens() internal {
        require(msg.value > 0, "Value sent must be greater than 0");

        uint256 multiplicationPrice = 1 ether;

        require(msg.value % multiplicationPrice == 0, "Value must be multiplication by the price");
        
        uint256 tokensToTransfer = msg.value / currentPrice * 1 ether;

        if (totalTokenPurchased == 0) {
            totalTokenPurchased = tokensToTransfer;
        } else {
            totalTokenPurchased += tokensToTransfer;
        }

        if (totalTokenPurchased > threshold) {
            totalTokenPurchased -= tokensToTransfer;
            revert ExceedMaximumSalesOffer();
        }

        uint256 feeAmount = 0;
        if (isFeeCharged) {
            feeAmount = (msg.value * feePercentage) / 1000;
            payable(devAddress).transfer(feeAmount);
        }

        token.transfer(msg.sender, tokensToTransfer);
        emit TokensPurchased(msg.sender, tokensToTransfer, currentPrice - feeAmount);
    }

    function withdrawTokens(address _to, uint256 _amount) external onlyOwner {
        token.transfer(_to, _amount);
    }

    function withdrawEther(address payable _to, uint256 _amount)
        external
        onlyOwner
    {
        require(
            _amount <= address(this).balance,
            "Insufficient contract balance"
        );
        _to.transfer(_amount);
    }

    receive() external payable {
        buyTokens();
    }
}
