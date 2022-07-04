// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.4;

import "./Loan.sol";

contract LoanApp {
    enum Status {
        PENDING,
        ACTIVE,
        RESOLVED
    }

    struct loans {
        uint256 fullAmount;
        uint256 collateralAmount;
        uint256 ID;
        address lender;
        address borrower;
        address loanAddress;
        Status status;
    }
    mapping(uint256 => loans) public loanStorage;

    uint256 public loanId;
    address payable public owner;
    address payable public loaner;
    IERC20 public daiToken;
    IERC20 public linkToken;
    IERC20 public weth;
    address payable[] record;
    AggregatorV3Interface internal priceFeed;

    constructor() payable {
        owner = payable(msg.sender);
        loaner = payable(msg.sender);
        daiToken = IERC20(0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735);
        linkToken = IERC20(0x01BE23585060835E02B77ef475b0Cc51aA1e0709);
        priceFeed = AggregatorV3Interface(
            0x8A753747A1Fa494EC906cE90E9f37563A8AF630e
        );
        loanId = 1;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function getExchangePrice() public view returns (int256) {
        (
            ,
            /*uint80 roundID*/
            int256 price, /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/
            ,
            ,

        ) = priceFeed.latestRoundData();
        return price / 1e8;
    }

    function createLoanRequest(uint256 _duration)
        public
        payable
        returns (address payable)
    {
        uint256 collateral = msg.value;
        address payable loanContractAddress = startLoan(
            collateral,
            payable(msg.sender),
            _duration
        );
        record.push(loanContractAddress);
        return loanContractAddress;
    }

    function getAllLoans() public view returns (address payable[] memory) {
        return record;
    }

    event LoanProvided(
        address loan,
        address borrower,
        uint256 collateral,
        uint256 dueDate
    );

    function startLoan(
        uint256 collateral,
        address payable borrower,
        uint256 _duration
    ) public payable returns (address payable) {
        require(getExchangePrice() >= 0);
        uint256 loan_amount = uint256(getExchangePrice()) * collateral;
        address payable loan = payable(
            address(new Loan(owner, borrower, collateral, _duration))
        );
        loan.transfer(collateral);
        require(daiToken.transfer(borrower, loan_amount));
        emit LoanProvided(
            loan,
            borrower,
            collateral,
            block.timestamp + _duration
        );

        loanStorage[loanId] = loans({
            fullAmount: loan_amount,
            collateralAmount: collateral,
            lender: owner,
            borrower: borrower,
            status: Status.PENDING,
            ID: loanId,
            loanAddress: loan
        });

        loanId = loanId + 1;
        return loan;
    }

    function retrieveLoans(uint256 _loanId)
        public
        view
        returns (
            uint256 fullAmount,
            uint256 collateralAmount,
            address lender,
            address borrower,
            address loanAddress,
            uint256 status
        )
    {
        fullAmount = loanStorage[_loanId].fullAmount;
        collateralAmount = loanStorage[_loanId].collateralAmount;
        lender = loanStorage[_loanId].lender;
        borrower = loanStorage[_loanId].borrower;
        status = uint256(loanStorage[_loanId].status);
        loanAddress = loanStorage[_loanId].loanAddress;
        return (
            fullAmount,
            collateralAmount,
            lender,
            borrower,
            loanAddress,
            status
        );
    }

    function depositLink(uint256 amount) public payable {
        linkToken.transferFrom(msg.sender, address(this), amount);
    }

    function withdrawLink() public payable {
        linkToken.transfer(loaner, linkToken.balanceOf(address(this)));
    }

    function depositDai(uint256 amount) public payable {
        daiToken.transferFrom(msg.sender, address(this), amount);
    }

    function withdrawDai() public payable {
        daiToken.transfer(loaner, daiToken.balanceOf(address(this)));
    }

    function balance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}

    function checkLink() public view returns (uint256) {
        return linkToken.balanceOf(address(this));
    }

    function checkDai() public view returns (uint256) {
        return daiToken.balanceOf(address(this));
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function kill() public onlyOwner {
        selfdestruct(loaner);
    }
}
