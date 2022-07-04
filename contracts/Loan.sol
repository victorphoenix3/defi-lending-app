// File: @chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol

pragma solidity ^0.8.4;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function description() external view returns (string memory);

    function version() external view returns (uint256);

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

// File: @openzeppelin/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

// File: contracts/4_loan_flatten.sol

pragma solidity ^0.8.0;

contract Loan {
    address payable public loaner;
    address payable public borrower;
    IERC20 public daiToken;
    IERC20 public linkToken;
    AggregatorV3Interface internal priceFeed;
    uint256 public collateral;
    uint256 public dueDate;

    constructor(
        address payable _loaner,
        address payable _borrower,
        uint256 collateralAmount,
        uint256 loanDuration
    ) payable {
        loaner = _loaner;
        borrower = _borrower;
        collateral = collateralAmount;
        dueDate = block.timestamp + loanDuration;
        daiToken = IERC20(0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735);
        linkToken = IERC20(0x01BE23585060835E02B77ef475b0Cc51aA1e0709);
        priceFeed = AggregatorV3Interface(
            0x8A753747A1Fa494EC906cE90E9f37563A8AF630e
        );
    }

    event LoanPaid();

    function payLoan() public payable {
        require(block.timestamp <= dueDate);
        uint256 payoffAmount = getPayoffAmount();
        require(daiToken.transferFrom(borrower, loaner, payoffAmount));
        borrower.transfer(collateral);
        emit LoanPaid();
        selfdestruct(loaner);
    }

    function getPayoffAmount() public view returns (uint256) {
        require(getExchangePrice() >= 0);
        return collateral * uint256(getExchangePrice());
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

    function repossess() public {
        require(block.timestamp > dueDate);
        loaner.transfer(collateral);
        selfdestruct(loaner);
    }

    receive() external payable {}

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

    function checkLink() public view returns (uint256) {
        return linkToken.balanceOf(address(this));
    }

    function checkDai() public view returns (uint256) {
        return daiToken.balanceOf(address(this));
    }
}
