// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract IntentRail {
    bytes32 public constant MATCHED = bytes32("MATCHED");
    bytes32 public constant MISMATCHED = bytes32("MISMATCHED");
    bytes32 public constant FAILED = bytes32("FAILED");

    bytes32 public constant EXPIRED = bytes32("EXPIRED");
    bytes32 public constant TARGET_MISMATCH = bytes32("TARGET_MISMATCH");
    bytes32 public constant SPENDER_MISMATCH = bytes32("SPENDER_MISMATCH");
    bytes32 public constant ALLOWANCE_EXCEEDED = bytes32("ALLOWANCE_EXCEEDED");
    bytes32 public constant TX_FAILED = bytes32("TX_FAILED");
    bytes32 public constant MISSING_REQUIRED_LOG = bytes32("MISSING_REQUIRED_LOG");

    address public verifierOperator;
    mapping(bytes32 => bool) public terminalDecisionEmitted;

    event IntentSubmitted(
        bytes32 indexed intentHash,
        bytes32 indexed campaignIdBytes32,
        bytes32 indexed missionIdBytes32,
        address wallet,
        address target,
        bytes4 selector,
        address asset,
        uint256 amountBaseUnits,
        address spender,
        uint256 maxAllowanceBaseUnits,
        uint256 expiryUnix
    );

    event IntentMatched(
        bytes32 indexed intentHash,
        bytes32 indexed receiptHash,
        address indexed wallet,
        bytes32 approveTxHash,
        bytes32 depositTxHash,
        uint256 blockNumber,
        bytes32 blockHash,
        uint256 allowanceUsedBaseUnits,
        uint256 issuedAt
    );

    event IntentFailed(
        bytes32 indexed intentHash,
        address indexed wallet,
        bytes32 depositTxHash,
        uint256 blockNumber,
        bytes32 blockHash,
        bytes32 status,
        bytes32 failureReason,
        uint256 decidedAt
    );

    error NotVerifierOperator();
    error IntentAlreadyDecided();
    error InvalidVerifierOperator();
    error InvalidDecisionStatus();
    error InvalidFailureReason();

    constructor(address initialVerifierOperator) {
        if (initialVerifierOperator == address(0)) revert InvalidVerifierOperator();
        verifierOperator = initialVerifierOperator;
    }

    modifier onlyVerifierOperator() {
        if (msg.sender != verifierOperator) revert NotVerifierOperator();
        _;
    }

    modifier onlyUndecided(bytes32 intentHash) {
        if (terminalDecisionEmitted[intentHash]) revert IntentAlreadyDecided();
        _;
    }

    function submitIntent(
        bytes32 intentHash,
        bytes32 campaignIdBytes32,
        bytes32 missionIdBytes32,
        address wallet,
        address target,
        bytes4 selector,
        address asset,
        uint256 amountBaseUnits,
        address spender,
        uint256 maxAllowanceBaseUnits,
        uint256 expiryUnix
    ) external {
        emit IntentSubmitted(
            intentHash,
            campaignIdBytes32,
            missionIdBytes32,
            wallet,
            target,
            selector,
            asset,
            amountBaseUnits,
            spender,
            maxAllowanceBaseUnits,
            expiryUnix
        );
    }

    function emitMatched(
        bytes32 intentHash,
        bytes32 receiptHash,
        address wallet,
        bytes32 approveTxHash,
        bytes32 depositTxHash,
        uint256 blockNumber,
        bytes32 blockHash,
        uint256 allowanceUsedBaseUnits,
        uint256 issuedAt
    ) external onlyVerifierOperator onlyUndecided(intentHash) {
        terminalDecisionEmitted[intentHash] = true;

        emit IntentMatched(
            intentHash,
            receiptHash,
            wallet,
            approveTxHash,
            depositTxHash,
            blockNumber,
            blockHash,
            allowanceUsedBaseUnits,
            issuedAt
        );
    }

    function emitFailed(
        bytes32 intentHash,
        address wallet,
        bytes32 depositTxHash,
        uint256 blockNumber,
        bytes32 blockHash,
        bytes32 status,
        bytes32 failureReason,
        uint256 decidedAt
    ) external onlyVerifierOperator onlyUndecided(intentHash) {
        if (status != MISMATCHED && status != FAILED) revert InvalidDecisionStatus();
        if (!_isFailureReason(failureReason)) revert InvalidFailureReason();

        terminalDecisionEmitted[intentHash] = true;

        emit IntentFailed(
            intentHash,
            wallet,
            depositTxHash,
            blockNumber,
            blockHash,
            status,
            failureReason,
            decidedAt
        );
    }

    function _isFailureReason(bytes32 failureReason) private pure returns (bool) {
        return failureReason == EXPIRED || failureReason == TARGET_MISMATCH || failureReason == SPENDER_MISMATCH
            || failureReason == ALLOWANCE_EXCEEDED || failureReason == TX_FAILED || failureReason == MISSING_REQUIRED_LOG;
    }
}
