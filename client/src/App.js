import {Container, Table} from 'react-bootstrap';
import React, { Component } from 'react';
import Button from '@material-ui/core/Button'
import getWeb3 from "./getWeb3";
import LoanApp from "./contracts/LoanApp.json";
import Loan from "./contracts/Loan.json";
import web3 from "web3";

import "./App.css";

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      status: ['PENDING', 'ACTIVE', 'RESOLVED'],
      transactionObjects: [],
      web3: null,
      currentLoan: null,
      currentLoanId: 1,
      accounts: null,
      contract: null,
      loanContract: null,
      loanPeriod: null,
      borrower: '',
      lender: '',
      loanId: null,
      fullAmount: null,
      amount: null,
      collateral: null,
      blockNumber:'',
      transactionHash:'',
      gasUsed:'',
      txReceipt: '',
      shouldShowButton: false,
      loanAddress: '',
      contractState: {
        lastEventBlock: 0,
        currentState: 'ACTIVE'
      }
    };
  }

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      console.log("network id:", networkId)
      const deployedNetwork = LoanApp.networks[networkId];
      console.log("deployed network:", deployedNetwork)
      const instance = new web3.eth.Contract(
        LoanApp.abi,
        deployedNetwork && deployedNetwork.address,
      );
      console.log("instance: ",instance)

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance, borrower: accounts }, () => {
        this.checkOwner();
        // this.checkEvent();
        this.handleLoanId();
      });
      
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

//Function to get the chain details of loan upon submitting the Loan. 
  getLoanTxDetails = async () => {
    try{
      await web3.eth.getTransactionReceipt(this.state.currentLoan, (err, txReceipt)=>{
      console.log(err,txReceipt);
      this.setState({txReceipt});
    }); //await for getTransactionReceipt
      await this.setState({blockNumber: this.state.txReceipt.blockNumber});
      await this.setState({gasUsed: this.state.txReceipt.gasUsed});    
    } 
      catch(error){
      console.log(error);
    } 
  } 

  createLoan = async () => {
    const etherAmount = web3.utils.toWei(this.state.amount);
    let { accounts, contract, borrower, loanPeriod, amount} = this.state;
    try{
      console.log("creating loan request")
      console.log("borrower: ",accounts[0])
      console.log("wei: ",etherAmount)
      console.log("loan period: ",loanPeriod)
      let estimate = await contract.methods.createLoanRequest(loanPeriod)
        .estimateGas({
          from: accounts[0],
          value: etherAmount
        });
    console.log("estimate", estimate)
    let tx = await contract.methods.createLoanRequest(loanPeriod)
      .send({
        from: accounts[0],
        value: etherAmount,
        gasPrice: 2000000000,
        gas: (estimate  * 2)
      });
    console.log("transaction hash", tx)

    this.setState({ 
      transactionHash : tx.transactionHash,
      blockNumber : tx.blockNumber,
      gasUsed : tx.gasUsed
    })
    this.handleLoanId()
    }
    catch (ex) {
      console.log(ex)
    }
  }

  

  async checkOwner() {
    let { accounts, contract } = this.state;
    console.log("checkOwner: ", accounts[0])
    console.log("contract methods: ", contract.methods)
    try {
      let owner = await contract.methods.getOwner().call();
      console.log("owner:", owner)
      this.setState({ lender: owner });
      if (owner === accounts[0]) {
      this.setState({ shouldShowButton : true });
      }
      return owner === accounts[0];
    }
    catch (ex) {
      console.log(ex)
    }
  }

  

  payBackLoan = async () => {
    const loan_address = this.state.currentLoan.loanAddress;
    console.log("loan address: ", loan_address)
    const instance2 = new this.state.web3.eth.Contract(
      Loan.abi,
      loan_address,
    );
    console.log("instance2: ",instance2)
    this.setState({loanContract: instance2})
    let {loanContract, accounts } = this.state;
    console.log(this.state.loanContract)
    // const payBackAmount = web3.utils.toWei(this.state.amount);
    console.log("payBackLoan: ", accounts[0], this.state.borrower)
    console.log("loanContract methods: ", instance2.methods)
    await instance2.methods
      .payLoan()
      .send({from: accounts[0]}); 
  };
  

  handleRetrieveLoans = async () => {
    let { loanId, contract, accounts } = this.state;
    console.log("retrieve loans: ", accounts[0])
    let currentLoan = await contract.methods.retrieveLoans(loanId).call({from: accounts[0]});
    console.log(currentLoan)
    console.log(loanId, accounts[0])
    console.log(web3.utils.fromWei(currentLoan.fullAmount));
    this.setState({ currentLoan });
  };

  handleInput = (event) => {
    console.log("event.target.name : ", event.target.name)
    console.log("event.target.value: ",event.target.value)
    this.setState({ [event.target.name]: event.target.value });
  };

  handleStop = async () => {
    let { contract, accounts } = this.state;
    await contract.methods.stop().send({from: accounts[0]})
  }

  handleKill = async () => {
    let { contract, accounts } = this.state;
    await contract.methods.kill().send({from: accounts[0]})
  }

  handleWithdraw = async () => {
    let { contract, accounts } = this.state;
    await contract.methods.withdrawWhenKilled().send({from: accounts[0]})
  }

  handleResume = async () => {
    let { contract, accounts } = this.state;
    await contract.methods.resume().send({from: accounts[0]})
  }

  handleLoanId = async () => {
    let { contract, accounts } = this.state;
    let x = await contract.methods.loanId().call({from: accounts[0]});
    console.log("Current Loan ID: ",x )
    this.setState({ currentLoanId: x})
  }

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    if (this.state.web3) {
      this.state.contract.methods.getOwner()
      .call()
      .then(result => {
        console.log("Owner is: ", result);
    })}

    return (
      <div className="App">
        <div className="Loan-app-header">
        <h1>LOAN DAPP</h1>
        <img className="header-img" src="https://cdn.iconscout.com/icon/free/png-256/ethereum-3-569581.png"/>
        <p className="line-1 anim-typewriter">Built on Ethereum smart contracts</p>
        <span className="account-address">Account: {this.state.borrower ? this.state.accounts : null }</span>
        </div>        
        
        <div className="owner-special-buttons">
          <h6>Owner Panel</h6>
        {this.state.shouldShowButton && this.state.contractState.currentState !== 'KILLED' &&
          <Button 
          color="secondary"
          onClick={this.handleKill}
          >
          KILL CONTRACT
          </Button>
        }
        </div>
        
        <div>This Loan has an ID of: {this.state.loanId}</div>
        <Button 
        className="Retrieve-butt"
        onClick={this.handleRetrieveLoans}
        variant="contained"
        color="default">
        Retrieve Loan
        </Button>
        <div>
          <input
            name="loanId"
            className="form-control"
            id="loanId"
            onChange={this.handleInput}
          />
        </div>
        <p>Contract Status: {this.state.contractState.currentState}</p>
        <Table bordered responsive className="x">
          <thead>
            <tr>
              <th>Loan Details</th>
              <th>Values</th>
            </tr>
          </thead> 
          <tbody>
            <tr>
              <td>Full Loan Amount (Stable Coin Received):</td>
              <td>{this.state.currentLoan ? web3.utils.fromWei(this.state.currentLoan.fullAmount) : null}</td>
            </tr>
            <tr>
              <td>Borrower :</td>
              <td>{this.state.currentLoan ? this.state.currentLoan.borrower : null}</td>
            </tr>
            <tr>
              <td>Lender :</td>
              <td>{this.state.currentLoan ? this.state.currentLoan.lender : null}</td>
            </tr>
            <tr>
              <td>Collateral :</td>
              <td>{this.state.currentLoan ? web3.utils.fromWei(this.state.currentLoan.collateralAmount) : null}</td>
            </tr>
            <tr>
              <td>Loan Address :</td>
              <td>{this.state.currentLoan ? this.state.currentLoan.loanAddress : null}</td>
            </tr>
            
          </tbody>
        </Table>


        <Button  onClick={this.payBackLoan} variant="contained" color="primary"> Pay Off Loan</Button>

          {/* <input
            autoComplete="off"
            name="amount"
            className="form-control"
            id="payLoan"
            onChange={this.handleInput}
          /> */}

      <form className="create-loan-form">
        <div className="form-contents">
          <h1>Create a Loan</h1>
          <hr></hr>

          <label htmlFor="loanPeriod">loan period (in months)</label>
          <input
            autoComplete="off"
            name="loanPeriod"
            className="form-control"
            id="loanPeriod"
            onChange={this.handleInput}
          />
          <label htmlFor="borrower">Borrower Address</label>
          <input
            autoComplete="off"
            name="borrower"
            className="form-control"
            id="borrower"
            value={this.state.borrower}
            readOnly={true}
          />
          <label htmlFor="lender">Lender Address</label>
          <input
            autoComplete="off"
            name="lender"
            className="form-control"
            id="lender"
            value={this.state.lender}
            readOnly={true}
          />
          <label htmlFor="amount">Collateral</label>
          <input
            autoComplete="off"
            name="amount"
            className="form-control"
            id="amount"
            onChange={this.handleInput}
          />
          <div className="LoanId-info">
            <p id="loanCounter"> Loan ID: {this.state.currentLoanId}</p>
            <p id="loanCounterInfo">Loan ID's can be used to retrieve loans assigned the that ID</p>
          </div>
        </div>
        
      </form>

      <Button onClick={this.createLoan} variant="contained" color="primary">
      Create
      </Button>
      
      <Container>
        <Table bordered responsive className="x">
            <thead>
              <tr>
                <th>Tx Receipt Category</th>
                <th>Values</th>
              </tr>
            </thead>
            
            <tbody>
              <tr>
                <td>Tx Hash :</td>
                <td>
                  {this.state.transactionHash}</td>
              </tr>
              <tr>
                <td>Block Number :</td>
                <td>{this.state.blockNumber}</td>
              </tr>
              <tr>
                <td>Gas Used :</td>
                <td>{this.state.gasUsed}</td>
              </tr>
            </tbody>
        </Table>
      </Container>
      </div>
    );
  }
}

export default App;