EscrowApp = {
  web3Provider: null,
  contracts: {},
  escrowInstance: null, // make all smart contract calls/transactions via this object

  // set up web3 to interact with ethereum network
  init: function(cb) {
    console.log('initializing web3');
    if (typeof web3 !== 'undefined') {
      EscrowApp.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      EscrowApp.web3Provider = new web3.providers.HTTPProvider('http://localhost:8545');
      web3 = new Web3(EscrowApp.web3Provider);
    }

    return EscrowApp.initContract(cb);
  },

  // init contract
  initContract: function(cb) {
    $.getJSON('./assets/json/Escrow.json', function(data) {
      console.log('fetched artifact ' + data);
      var EscrowArtifact = data;

      EscrowApp.contracts.Escrow = TruffleContract(EscrowArtifact);
      // set the provider for our contract
      EscrowApp.contracts.Escrow.setProvider(EscrowApp.web3Provider);

      EscrowApp.contracts.Escrow.deployed().then(function(instance) {
        EscrowApp.escrowInstance = instance;
        cb();
      });
    });

    web3.eth.getAccounts(function(err, accounts) {
      if (err) {
        console.log('error fetching accounts: ', err);
        return;
      }

      EscrowApp.account = accounts[0];
    })
  },

  // create group
  createGroup: function() {
    EscrowApp.escrowInstance.createInsuranceGroup({from: EscrowApp.account, value: web3.toWei(2, 'ether')}).then(function(result) {
      for (var i = 0; i < result.logs.length; ++i) {
        console.log(result.logs[i]);
      }
    });
  },

  countGroups: function(callback) {
    EscrowApp.escrowInstance.insuranceGroupCount.call().then(g => callback(g.toNumber()));
  },

  // force monthly updates so payments need to take place again
  forceUpdate: function() {
    
    EscrowApp.escrowInstance.forceUpdate({from: EscrowApp.account}).then(function(result) {
      for (var i = 0; i < result.logs.length; ++i) {
        console.log(result.logs[i]);
      }
    });
  },

  // register a user for an insurance group
  registerForInsuranceGroup: function(groupIndex) {
    EscrowApp.escrowInstance.registerForGroup(groupIndex, 
      {from: EscrowApp.account, value: web3.toWei(1, 'ether')}).then(function(result) {
      for (var i = 0; i < result.logs.length; ++i) {
        console.log(result.logs[i]);
      }
    });
  },

  deregisterFromGroup: function(groupIndex) {
    EscrowApp.escrowInstance.deregisterForGroup.call(groupIndex, 
      {from: EscrowApp.account}).then(function(result) {
        for (var i = 0; i < result.logs.length; ++i) {
          console.log(result.logs[i]);
        }
    });
  },


  // pass a function that accepts the amount, and then does something with it
  getMonthlyPaymentAmountForGroup: function(groupIndex, callback) {
    EscrowApp.escrowInstance.getMonthlyPremiumAmount.call(groupIndex).then(a => callback(a.toNumber()));
  },

  withdrawAmountFromInsuranceGroup: function(groupIndex, amount) {
    EscrowApp.escrowInstance.withdraw(groupIndex, amount, {from: EscrowApp.account}).then(function(result) {
      for (var i = 0; i < result.logs.length; ++i) {
        console.log(result.logs[i]);
      }
    });
  },

  numUsersInGroup: function(groupIndex, callback) {
    EscrowApp.escrowInstance.numUsersInGroup.call(groupIndex).then(bigNum => callback(bigNum.toNumber()));
  },


  userAddressInGroup: function(groupIndex, userIndex, callback) {
    EscrowApp.escrowInstance.userInGroup.call(groupIndex, userIndex).then(callback);
  },

  poolValueForGroup: function(groupIndex, callback) {
    EscrowApp.escrowInstance.totalBalanceForGroup.call(groupIndex).then(bigNum => callback(bigNum.toNumber()));
  },

  numClaimsForGroup: function(groupIndex, callback) {
    EscrowApp.escrowInstance.numClaimsForGroup.call(groupIndex).then(bigNum => callback(bigNum.toNumber()));
  },

  submitClaimToGroup: function(groupIndex, textHash, pictureHash, callback) {
    EscrowApp.escrowInstance.submitClaimToGroup(groupIndex, textHash, pictureHash, {from: EscrowApp.account});
  },

  // callback 
  fetchClaimForGroup: function(groupIndex, claimIndex, callback) {
    EscrowApp.escrowInstance.fetchClaimForGroup.call(groupIndex, claimIndex).then(function(claimArr) {
      callback({
        claimOrigin: claimArr[0],
        textHash: claimArr[1],
        pictureHash: claimArr[2]
      });
    });
  },


  getAllInsuranceGroups: function(callback) {
    EscrowApp.countGroups(function (numGroups) {
      var insuranceGroups = [];
      for (var groupCounter = 0; groupCounter < numGroups; ++groupCounter) {
        var groupObject = {};
        groupObject.id = groupCounter;

        EscrowApp.poolValueForGroup(groupCounter, function(value) { 
          groupObject.poolValue = value; 
        });

        EscrowApp.numUsersInGroup(groupCounter, function(numUsers) {
          groupObject.users = [];
          for (var userCounter = 0; userCounter < numUsers; ++numUsers) {
            EscrowApp.userAddressInGroup(groupCounter, userCounter, function(address) {
              groupObject.users.push(address);
              console.log(groupObject);
            });
          }
        });
      }

      callback(insuranceGroups);
    });
  }


}
