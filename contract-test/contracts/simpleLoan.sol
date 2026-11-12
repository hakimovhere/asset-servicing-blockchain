// SPDX-License-Identifier: MIT
// Workshop #2, Step 5 — completed (all TOCOMPLETE gaps filled)
pragma solidity ^0.8.13;

contract simpleLoan {
    address payable public immutable borrower;
    uint public immutable nominal;
    uint public immutable fixedRate;
    uint256 public maturityDate;
    uint256 public paymentPeriod;
    address payable public lender;
    bool private lender_kyc_approved = false;
    bool private borrower_kyc_approved = false;
    bool public kyc_approved = false;
    bool public cash_lent = false;
    bool public pay_back = false;
    uint256 public redemptionAmount;

    constructor(uint _nominalToBorrow, uint _rateToBorrow, uint256 _paymentPeriod) {
        borrower = payable(msg.sender);
        nominal = _nominalToBorrow * 1000000000000000000;
        fixedRate = _rateToBorrow;
        paymentPeriod = _paymentPeriod;
        maturityDate = block.timestamp + paymentPeriod;
    }

    function registerAsLender() public {
        require(msg.sender != borrower , "the lender cannot be the borrower");
        require(lender == address(0), "A lender already exists");
        lender = payable(msg.sender);
    }

    function approveKYC() public {
        require(msg.sender == borrower || msg.sender == lender, "Only the Lender or the Borrower are allowed to approve its KYC");
        require(lender != address(0), "A lender is required to execute a KYC");
        require( (lender_kyc_approved == false && msg.sender == lender) || (borrower_kyc_approved == false && msg.sender == borrower), "KYC already approved");
        if (msg.sender == lender ){
            lender_kyc_approved = true;
        }else{
            borrower_kyc_approved = true;
        }
        if( lender_kyc_approved == true &&  borrower_kyc_approved ==true){
            kyc_approved = true;
        }
    }

    function lendCash() external payable {
        require(msg.sender == lender, "Only the lender can lend the cash");
        require(kyc_approved, "KYC not approved yet");
        require(cash_lent == false, "Cash already lent");
        require(msg.value == nominal, "The money sent is not equal to the nominal");
        borrower.transfer(nominal);
        cash_lent = true;
    }

    function paybackCashAndCoupon() external payable {
        require(msg.sender == borrower, "Only the borrower can pay back");
        require(kyc_approved, "KYC not approved yet");
        require(cash_lent == true, "Cash not lent yet");
        require(pay_back == false, "Pay back already done");
        require(block.timestamp >= maturityDate,"Not the right time to pay back");
        redemptionAmount = nominal + (nominal * fixedRate / 100);
        require(msg.sender.balance >= redemptionAmount, "Insufficient Balance");
        require(msg.value == redemptionAmount, "The money sent is not equal to the redemption amount");
        lender.transfer(redemptionAmount);
        pay_back = true;
    }
}
