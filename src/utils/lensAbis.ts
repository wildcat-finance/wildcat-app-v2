// Auto-generated from @wildcatfi/wildcat-sdk typechain factories
// Only includes getMarketsData and getMarketsDataWithLenderStatus

export const MarketLensV2Abi = [
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "markets",
        "type": "address[]"
      }
    ],
    "name": "getMarketsData",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
              },
              {
                "internalType": "uint256",
                "name": "decimals",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isMock",
                "type": "bool"
              }
            ],
            "internalType": "struct TokenMetadata",
            "name": "marketToken",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
              },
              {
                "internalType": "uint256",
                "name": "decimals",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isMock",
                "type": "bool"
              }
            ],
            "internalType": "struct TokenMetadata",
            "name": "underlyingToken",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "hooksFactory",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "borrower",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "hooksAddress",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "bool",
                    "name": "useOnDeposit",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnQueueWithdrawal",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnExecuteWithdrawal",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnTransfer",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnBorrow",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnRepay",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnCloseMarket",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnNukeFromOrbit",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnSetMaxTotalSupply",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnSetAnnualInterestAndReserveRatioBips",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "useOnSetProtocolFeeBips",
                    "type": "bool"
                  }
                ],
                "internalType": "struct HooksConfigData",
                "name": "flags",
                "type": "tuple"
              },
              {
                "internalType": "enum HooksInstanceKind",
                "name": "kind",
                "type": "uint8"
              },
              {
                "internalType": "bool",
                "name": "transferRequiresAccess",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "depositRequiresAccess",
                "type": "bool"
              },
              {
                "internalType": "uint128",
                "name": "minimumDeposit",
                "type": "uint128"
              },
              {
                "internalType": "bool",
                "name": "transfersDisabled",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "allowForceBuyBacks",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "withdrawalRequiresAccess",
                "type": "bool"
              },
              {
                "internalType": "uint32",
                "name": "fixedTermEndTime",
                "type": "uint32"
              },
              {
                "internalType": "bool",
                "name": "allowClosureBeforeTerm",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "allowTermReduction",
                "type": "bool"
              }
            ],
            "internalType": "struct MarketHooksData",
            "name": "hooksConfig",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "withdrawalBatchDuration",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "feeRecipient",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "delinquencyFeeBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delinquencyGracePeriod",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "hooksAddress",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "borrower",
                "type": "address"
              },
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "enum HooksInstanceKind",
                "name": "kind",
                "type": "uint8"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "hooksTemplate",
                    "type": "address"
                  },
                  {
                    "components": [
                      {
                        "internalType": "address",
                        "name": "feeRecipient",
                        "type": "address"
                      },
                      {
                        "internalType": "uint16",
                        "name": "protocolFeeBips",
                        "type": "uint16"
                      },
                      {
                        "components": [
                          {
                            "internalType": "address",
                            "name": "token",
                            "type": "address"
                          },
                          {
                            "internalType": "string",
                            "name": "name",
                            "type": "string"
                          },
                          {
                            "internalType": "string",
                            "name": "symbol",
                            "type": "string"
                          },
                          {
                            "internalType": "uint256",
                            "name": "decimals",
                            "type": "uint256"
                          },
                          {
                            "internalType": "bool",
                            "name": "isMock",
                            "type": "bool"
                          }
                        ],
                        "internalType": "struct TokenMetadata",
                        "name": "originationFeeToken",
                        "type": "tuple"
                      },
                      {
                        "internalType": "uint256",
                        "name": "originationFeeAmount",
                        "type": "uint256"
                      },
                      {
                        "internalType": "uint256",
                        "name": "borrowerOriginationFeeBalance",
                        "type": "uint256"
                      },
                      {
                        "internalType": "uint256",
                        "name": "borrowerOriginationFeeApproval",
                        "type": "uint256"
                      }
                    ],
                    "internalType": "struct FeeConfigurationV2",
                    "name": "fees",
                    "type": "tuple"
                  },
                  {
                    "internalType": "bool",
                    "name": "exists",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "enabled",
                    "type": "bool"
                  },
                  {
                    "internalType": "uint24",
                    "name": "index",
                    "type": "uint24"
                  },
                  {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "internalType": "uint256",
                    "name": "totalMarkets",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct HooksTemplateData",
                "name": "hooksTemplate",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "uint32",
                    "name": "minimumDelinquencyGracePeriod",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint32",
                    "name": "maximumDelinquencyGracePeriod",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint16",
                    "name": "minimumReserveRatioBips",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint16",
                    "name": "maximumReserveRatioBips",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint16",
                    "name": "minimumDelinquencyFeeBips",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint16",
                    "name": "maximumDelinquencyFeeBips",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint32",
                    "name": "minimumWithdrawalBatchDuration",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint32",
                    "name": "maximumWithdrawalBatchDuration",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint16",
                    "name": "minimumAnnualInterestBips",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint16",
                    "name": "maximumAnnualInterestBips",
                    "type": "uint16"
                  }
                ],
                "internalType": "struct MarketParameterConstraints",
                "name": "constraints",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "components": [
                      {
                        "internalType": "bool",
                        "name": "useOnDeposit",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnQueueWithdrawal",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnExecuteWithdrawal",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnTransfer",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnBorrow",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnRepay",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnCloseMarket",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnNukeFromOrbit",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetMaxTotalSupply",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetAnnualInterestAndReserveRatioBips",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetProtocolFeeBips",
                        "type": "bool"
                      }
                    ],
                    "internalType": "struct HooksConfigData",
                    "name": "optional",
                    "type": "tuple"
                  },
                  {
                    "components": [
                      {
                        "internalType": "bool",
                        "name": "useOnDeposit",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnQueueWithdrawal",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnExecuteWithdrawal",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnTransfer",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnBorrow",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnRepay",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnCloseMarket",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnNukeFromOrbit",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetMaxTotalSupply",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetAnnualInterestAndReserveRatioBips",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetProtocolFeeBips",
                        "type": "bool"
                      }
                    ],
                    "internalType": "struct HooksConfigData",
                    "name": "required",
                    "type": "tuple"
                  }
                ],
                "internalType": "struct HooksDeploymentFlags",
                "name": "deploymentFlags",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "uint32",
                    "name": "timeToLive",
                    "type": "uint32"
                  },
                  {
                    "internalType": "address",
                    "name": "providerAddress",
                    "type": "address"
                  },
                  {
                    "internalType": "uint24",
                    "name": "pullProviderIndex",
                    "type": "uint24"
                  },
                  {
                    "internalType": "uint24",
                    "name": "pushProviderIndex",
                    "type": "uint24"
                  }
                ],
                "internalType": "struct RoleProviderData[]",
                "name": "pullProviders",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "uint32",
                    "name": "timeToLive",
                    "type": "uint32"
                  },
                  {
                    "internalType": "address",
                    "name": "providerAddress",
                    "type": "address"
                  },
                  {
                    "internalType": "uint24",
                    "name": "pullProviderIndex",
                    "type": "uint24"
                  },
                  {
                    "internalType": "uint24",
                    "name": "pushProviderIndex",
                    "type": "uint24"
                  }
                ],
                "internalType": "struct RoleProviderData[]",
                "name": "pushProviders",
                "type": "tuple[]"
              },
              {
                "internalType": "uint256",
                "name": "totalMarkets",
                "type": "uint256"
              }
            ],
            "internalType": "struct HooksInstanceData",
            "name": "hooks",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "temporaryReserveRatio",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "originalAnnualInterestBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "originalReserveRatioBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "temporaryReserveRatioExpiry",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isClosed",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "protocolFeeBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reserveRatioBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "annualInterestBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scaleFactor",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxTotalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scaledTotalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalAssets",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastAccruedProtocolFees",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "normalizedUnclaimedWithdrawals",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scaledPendingWithdrawals",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pendingWithdrawalExpiry",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isDelinquent",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "timeDelinquent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastInterestAccruedTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint32[]",
            "name": "unpaidWithdrawalBatchExpiries",
            "type": "uint32[]"
          },
          {
            "internalType": "uint256",
            "name": "coverageLiquidity",
            "type": "uint256"
          }
        ],
        "internalType": "struct MarketDataV2[]",
        "name": "data",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "lender",
        "type": "address"
      },
      {
        "internalType": "address[]",
        "name": "markets",
        "type": "address[]"
      }
    ],
    "name": "getMarketsDataWithLenderStatus",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "symbol",
                    "type": "string"
                  },
                  {
                    "internalType": "uint256",
                    "name": "decimals",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bool",
                    "name": "isMock",
                    "type": "bool"
                  }
                ],
                "internalType": "struct TokenMetadata",
                "name": "marketToken",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "symbol",
                    "type": "string"
                  },
                  {
                    "internalType": "uint256",
                    "name": "decimals",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bool",
                    "name": "isMock",
                    "type": "bool"
                  }
                ],
                "internalType": "struct TokenMetadata",
                "name": "underlyingToken",
                "type": "tuple"
              },
              {
                "internalType": "address",
                "name": "hooksFactory",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "borrower",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "hooksAddress",
                    "type": "address"
                  },
                  {
                    "components": [
                      {
                        "internalType": "bool",
                        "name": "useOnDeposit",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnQueueWithdrawal",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnExecuteWithdrawal",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnTransfer",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnBorrow",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnRepay",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnCloseMarket",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnNukeFromOrbit",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetMaxTotalSupply",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetAnnualInterestAndReserveRatioBips",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "useOnSetProtocolFeeBips",
                        "type": "bool"
                      }
                    ],
                    "internalType": "struct HooksConfigData",
                    "name": "flags",
                    "type": "tuple"
                  },
                  {
                    "internalType": "enum HooksInstanceKind",
                    "name": "kind",
                    "type": "uint8"
                  },
                  {
                    "internalType": "bool",
                    "name": "transferRequiresAccess",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "depositRequiresAccess",
                    "type": "bool"
                  },
                  {
                    "internalType": "uint128",
                    "name": "minimumDeposit",
                    "type": "uint128"
                  },
                  {
                    "internalType": "bool",
                    "name": "transfersDisabled",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "allowForceBuyBacks",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "withdrawalRequiresAccess",
                    "type": "bool"
                  },
                  {
                    "internalType": "uint32",
                    "name": "fixedTermEndTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "bool",
                    "name": "allowClosureBeforeTerm",
                    "type": "bool"
                  },
                  {
                    "internalType": "bool",
                    "name": "allowTermReduction",
                    "type": "bool"
                  }
                ],
                "internalType": "struct MarketHooksData",
                "name": "hooksConfig",
                "type": "tuple"
              },
              {
                "internalType": "uint256",
                "name": "withdrawalBatchDuration",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "feeRecipient",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "delinquencyFeeBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "delinquencyGracePeriod",
                "type": "uint256"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "hooksAddress",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "borrower",
                    "type": "address"
                  },
                  {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "internalType": "enum HooksInstanceKind",
                    "name": "kind",
                    "type": "uint8"
                  },
                  {
                    "components": [
                      {
                        "internalType": "address",
                        "name": "hooksTemplate",
                        "type": "address"
                      },
                      {
                        "components": [
                          {
                            "internalType": "address",
                            "name": "feeRecipient",
                            "type": "address"
                          },
                          {
                            "internalType": "uint16",
                            "name": "protocolFeeBips",
                            "type": "uint16"
                          },
                          {
                            "components": [
                              {
                                "internalType": "address",
                                "name": "token",
                                "type": "address"
                              },
                              {
                                "internalType": "string",
                                "name": "name",
                                "type": "string"
                              },
                              {
                                "internalType": "string",
                                "name": "symbol",
                                "type": "string"
                              },
                              {
                                "internalType": "uint256",
                                "name": "decimals",
                                "type": "uint256"
                              },
                              {
                                "internalType": "bool",
                                "name": "isMock",
                                "type": "bool"
                              }
                            ],
                            "internalType": "struct TokenMetadata",
                            "name": "originationFeeToken",
                            "type": "tuple"
                          },
                          {
                            "internalType": "uint256",
                            "name": "originationFeeAmount",
                            "type": "uint256"
                          },
                          {
                            "internalType": "uint256",
                            "name": "borrowerOriginationFeeBalance",
                            "type": "uint256"
                          },
                          {
                            "internalType": "uint256",
                            "name": "borrowerOriginationFeeApproval",
                            "type": "uint256"
                          }
                        ],
                        "internalType": "struct FeeConfigurationV2",
                        "name": "fees",
                        "type": "tuple"
                      },
                      {
                        "internalType": "bool",
                        "name": "exists",
                        "type": "bool"
                      },
                      {
                        "internalType": "bool",
                        "name": "enabled",
                        "type": "bool"
                      },
                      {
                        "internalType": "uint24",
                        "name": "index",
                        "type": "uint24"
                      },
                      {
                        "internalType": "string",
                        "name": "name",
                        "type": "string"
                      },
                      {
                        "internalType": "uint256",
                        "name": "totalMarkets",
                        "type": "uint256"
                      }
                    ],
                    "internalType": "struct HooksTemplateData",
                    "name": "hooksTemplate",
                    "type": "tuple"
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "minimumDelinquencyGracePeriod",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint32",
                        "name": "maximumDelinquencyGracePeriod",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint16",
                        "name": "minimumReserveRatioBips",
                        "type": "uint16"
                      },
                      {
                        "internalType": "uint16",
                        "name": "maximumReserveRatioBips",
                        "type": "uint16"
                      },
                      {
                        "internalType": "uint16",
                        "name": "minimumDelinquencyFeeBips",
                        "type": "uint16"
                      },
                      {
                        "internalType": "uint16",
                        "name": "maximumDelinquencyFeeBips",
                        "type": "uint16"
                      },
                      {
                        "internalType": "uint32",
                        "name": "minimumWithdrawalBatchDuration",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint32",
                        "name": "maximumWithdrawalBatchDuration",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint16",
                        "name": "minimumAnnualInterestBips",
                        "type": "uint16"
                      },
                      {
                        "internalType": "uint16",
                        "name": "maximumAnnualInterestBips",
                        "type": "uint16"
                      }
                    ],
                    "internalType": "struct MarketParameterConstraints",
                    "name": "constraints",
                    "type": "tuple"
                  },
                  {
                    "components": [
                      {
                        "components": [
                          {
                            "internalType": "bool",
                            "name": "useOnDeposit",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnQueueWithdrawal",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnExecuteWithdrawal",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnTransfer",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnBorrow",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnRepay",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnCloseMarket",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnNukeFromOrbit",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnSetMaxTotalSupply",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnSetAnnualInterestAndReserveRatioBips",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnSetProtocolFeeBips",
                            "type": "bool"
                          }
                        ],
                        "internalType": "struct HooksConfigData",
                        "name": "optional",
                        "type": "tuple"
                      },
                      {
                        "components": [
                          {
                            "internalType": "bool",
                            "name": "useOnDeposit",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnQueueWithdrawal",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnExecuteWithdrawal",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnTransfer",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnBorrow",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnRepay",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnCloseMarket",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnNukeFromOrbit",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnSetMaxTotalSupply",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnSetAnnualInterestAndReserveRatioBips",
                            "type": "bool"
                          },
                          {
                            "internalType": "bool",
                            "name": "useOnSetProtocolFeeBips",
                            "type": "bool"
                          }
                        ],
                        "internalType": "struct HooksConfigData",
                        "name": "required",
                        "type": "tuple"
                      }
                    ],
                    "internalType": "struct HooksDeploymentFlags",
                    "name": "deploymentFlags",
                    "type": "tuple"
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "timeToLive",
                        "type": "uint32"
                      },
                      {
                        "internalType": "address",
                        "name": "providerAddress",
                        "type": "address"
                      },
                      {
                        "internalType": "uint24",
                        "name": "pullProviderIndex",
                        "type": "uint24"
                      },
                      {
                        "internalType": "uint24",
                        "name": "pushProviderIndex",
                        "type": "uint24"
                      }
                    ],
                    "internalType": "struct RoleProviderData[]",
                    "name": "pullProviders",
                    "type": "tuple[]"
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "timeToLive",
                        "type": "uint32"
                      },
                      {
                        "internalType": "address",
                        "name": "providerAddress",
                        "type": "address"
                      },
                      {
                        "internalType": "uint24",
                        "name": "pullProviderIndex",
                        "type": "uint24"
                      },
                      {
                        "internalType": "uint24",
                        "name": "pushProviderIndex",
                        "type": "uint24"
                      }
                    ],
                    "internalType": "struct RoleProviderData[]",
                    "name": "pushProviders",
                    "type": "tuple[]"
                  },
                  {
                    "internalType": "uint256",
                    "name": "totalMarkets",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct HooksInstanceData",
                "name": "hooks",
                "type": "tuple"
              },
              {
                "internalType": "bool",
                "name": "temporaryReserveRatio",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "originalAnnualInterestBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "originalReserveRatioBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "temporaryReserveRatioExpiry",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isClosed",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "protocolFeeBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "reserveRatioBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "annualInterestBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "scaleFactor",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "totalSupply",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxTotalSupply",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "scaledTotalSupply",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "totalAssets",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "lastAccruedProtocolFees",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "normalizedUnclaimedWithdrawals",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "scaledPendingWithdrawals",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "pendingWithdrawalExpiry",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isDelinquent",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "timeDelinquent",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "lastInterestAccruedTimestamp",
                "type": "uint256"
              },
              {
                "internalType": "uint32[]",
                "name": "unpaidWithdrawalBatchExpiries",
                "type": "uint32[]"
              },
              {
                "internalType": "uint256",
                "name": "coverageLiquidity",
                "type": "uint256"
              }
            ],
            "internalType": "struct MarketDataV2",
            "name": "market",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "lender",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "scaledBalance",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "normalizedBalance",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "underlyingBalance",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "underlyingApproval",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isBlockedFromDeposits",
                "type": "bool"
              },
              {
                "components": [
                  {
                    "internalType": "uint32",
                    "name": "timeToLive",
                    "type": "uint32"
                  },
                  {
                    "internalType": "address",
                    "name": "providerAddress",
                    "type": "address"
                  },
                  {
                    "internalType": "uint24",
                    "name": "pullProviderIndex",
                    "type": "uint24"
                  },
                  {
                    "internalType": "uint24",
                    "name": "pushProviderIndex",
                    "type": "uint24"
                  }
                ],
                "internalType": "struct RoleProviderData",
                "name": "lastProvider",
                "type": "tuple"
              },
              {
                "internalType": "bool",
                "name": "canRefresh",
                "type": "bool"
              },
              {
                "internalType": "uint32",
                "name": "lastApprovalTimestamp",
                "type": "uint32"
              },
              {
                "internalType": "bool",
                "name": "isKnownLender",
                "type": "bool"
              }
            ],
            "internalType": "struct LenderAccountData",
            "name": "lenderStatus",
            "type": "tuple"
          }
        ],
        "internalType": "struct MarketDataWithLenderStatusV2[]",
        "name": "data",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const MarketLensAbi = [
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "markets",
        "type": "address[]"
      }
    ],
    "name": "getMarketsData",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
              },
              {
                "internalType": "uint256",
                "name": "decimals",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isMock",
                "type": "bool"
              }
            ],
            "internalType": "struct TokenMetadata",
            "name": "marketToken",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
              },
              {
                "internalType": "uint256",
                "name": "decimals",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isMock",
                "type": "bool"
              }
            ],
            "internalType": "struct TokenMetadata",
            "name": "underlyingToken",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "borrower",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "controller",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "feeRecipient",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "protocolFeeBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delinquencyFeeBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delinquencyGracePeriod",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withdrawalBatchDuration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reserveRatioBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "annualInterestBips",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "temporaryReserveRatio",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "originalAnnualInterestBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "originalReserveRatioBips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "temporaryReserveRatioExpiry",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isClosed",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "scaleFactor",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxTotalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scaledTotalSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalAssets",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastAccruedProtocolFees",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "normalizedUnclaimedWithdrawals",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scaledPendingWithdrawals",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pendingWithdrawalExpiry",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isDelinquent",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "timeDelinquent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastInterestAccruedTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint32[]",
            "name": "unpaidWithdrawalBatchExpiries",
            "type": "uint32[]"
          },
          {
            "internalType": "uint256",
            "name": "coverageLiquidity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "borrowableAssets",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delinquentDebt",
            "type": "uint256"
          }
        ],
        "internalType": "struct MarketData[]",
        "name": "data",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "lender",
        "type": "address"
      },
      {
        "internalType": "address[]",
        "name": "markets",
        "type": "address[]"
      }
    ],
    "name": "getMarketsDataWithLenderStatus",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "symbol",
                    "type": "string"
                  },
                  {
                    "internalType": "uint256",
                    "name": "decimals",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bool",
                    "name": "isMock",
                    "type": "bool"
                  }
                ],
                "internalType": "struct TokenMetadata",
                "name": "marketToken",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "symbol",
                    "type": "string"
                  },
                  {
                    "internalType": "uint256",
                    "name": "decimals",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bool",
                    "name": "isMock",
                    "type": "bool"
                  }
                ],
                "internalType": "struct TokenMetadata",
                "name": "underlyingToken",
                "type": "tuple"
              },
              {
                "internalType": "address",
                "name": "borrower",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "controller",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "feeRecipient",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "protocolFeeBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "delinquencyFeeBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "delinquencyGracePeriod",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "withdrawalBatchDuration",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "reserveRatioBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "annualInterestBips",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "temporaryReserveRatio",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "originalAnnualInterestBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "originalReserveRatioBips",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "temporaryReserveRatioExpiry",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isClosed",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "scaleFactor",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "totalSupply",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxTotalSupply",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "scaledTotalSupply",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "totalAssets",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "lastAccruedProtocolFees",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "normalizedUnclaimedWithdrawals",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "scaledPendingWithdrawals",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "pendingWithdrawalExpiry",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "isDelinquent",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "timeDelinquent",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "lastInterestAccruedTimestamp",
                "type": "uint256"
              },
              {
                "internalType": "uint32[]",
                "name": "unpaidWithdrawalBatchExpiries",
                "type": "uint32[]"
              },
              {
                "internalType": "uint256",
                "name": "coverageLiquidity",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "borrowableAssets",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "delinquentDebt",
                "type": "uint256"
              }
            ],
            "internalType": "struct MarketData",
            "name": "market",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "lender",
                "type": "address"
              },
              {
                "internalType": "bool",
                "name": "isAuthorizedOnController",
                "type": "bool"
              },
              {
                "internalType": "enum AuthRole",
                "name": "role",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "scaledBalance",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "normalizedBalance",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "underlyingBalance",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "underlyingApproval",
                "type": "uint256"
              }
            ],
            "internalType": "struct MarketLenderStatus",
            "name": "lenderStatus",
            "type": "tuple"
          }
        ],
        "internalType": "struct MarketDataWithLenderStatus[]",
        "name": "data",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const
