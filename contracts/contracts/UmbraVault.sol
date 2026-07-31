// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IUmbraRouter} from "./interfaces/IUmbraRouter.sol";
import {IUmbraPair} from "./interfaces/IUmbraPair.sol";
import {AttestationVerifier} from "./AttestationVerifier.sol";

/// @title UmbraVault
/// @notice Vault with public NAV and a private strategy. The manager submits
/// rebalance intents to an off-chain aggregator; only a commitment and a running
/// count are recorded on-chain. At epoch close the aggregator returns the signed
/// net delta, the vault verifies the attestation, and settles it as one swap.
contract UmbraVault is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable baseAsset;
    IERC20 public immutable targetAsset;
    IUmbraRouter public immutable router;
    IUmbraPair public immutable pair;
    AttestationVerifier public verifier;
    bool public immutable baseIsToken0;

    address public manager;
    address public keeper;

    uint256 public epoch;
    bool public epochClosed;
    mapping(uint256 => uint256) public epochIntentCount;
    mapping(uint256 => bytes32) public epochIntentsCommitment;
    mapping(address => bool) public isAuditor;

    uint8 private immutable _shareDecimals;

    event Deposited(address indexed lp, uint256 assets, uint256 shares);
    event Withdrawn(address indexed lp, uint256 shares, uint256 assets);
    event IntentSubmitted(uint256 indexed epoch, uint256 intentCount, bytes32 intentCommitment);
    event EpochClosed(uint256 indexed epoch, uint256 intentCount, bytes32 intentsCommitment);
    event RebalanceExecuted(uint256 indexed epoch, int256 netDelta, uint256 amountOut);
    event AuditorGranted(address indexed auditor);
    event AuditorRevoked(address indexed auditor);
    event RolesUpdated(address manager, address keeper);

    error NotManager();
    error NotKeeper();
    error EpochNotClosed();
    error EpochAlreadyClosed();
    error NothingToSettle();
    error InsufficientIdleBase();
    error BadAttestation();
    error CommitmentMismatch();

    modifier onlyManager() {
        if (msg.sender != manager) revert NotManager();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert NotKeeper();
        _;
    }

    constructor(
        IERC20 baseAsset_,
        IERC20 targetAsset_,
        IUmbraRouter router_,
        IUmbraPair pair_,
        AttestationVerifier verifier_,
        address manager_,
        address keeper_
    ) ERC20("Umbra Vault Share", "umbSHARE") Ownable(msg.sender) {
        baseAsset = baseAsset_;
        targetAsset = targetAsset_;
        router = router_;
        pair = pair_;
        verifier = verifier_;
        manager = manager_;
        keeper = keeper_;
        _shareDecimals = IERC20Metadata(address(baseAsset_)).decimals();
        baseIsToken0 = address(pair_) != address(0)
            ? pair_.token0() == address(baseAsset_)
            : true;
    }

    function decimals() public view override returns (uint8) {
        return _shareDecimals;
    }

    function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
        uint256 supply = totalSupply();
        shares = supply == 0 ? assets : Math.mulDiv(assets, supply, totalAssets());
        baseAsset.safeTransferFrom(msg.sender, address(this), assets);
        _mint(msg.sender, shares);
        emit Deposited(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) external nonReentrant returns (uint256 assets) {
        assets = Math.mulDiv(shares, totalAssets(), totalSupply());
        _burn(msg.sender, shares);
        if (baseAsset.balanceOf(address(this)) < assets) revert InsufficientIdleBase();
        baseAsset.safeTransfer(msg.sender, assets);
        emit Withdrawn(msg.sender, shares, assets);
    }

    function totalAssets() public view returns (uint256) {
        uint256 baseBal = baseAsset.balanceOf(address(this));
        uint256 targetBal = targetAsset.balanceOf(address(this));
        return baseBal + _valueTargetInBase(targetBal);
    }

    function sharePrice() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 10 ** _shareDecimals;
        return Math.mulDiv(totalAssets(), 10 ** _shareDecimals, supply);
    }

    function _valueTargetInBase(uint256 targetBal) internal view returns (uint256) {
        if (targetBal == 0 || address(pair) == address(0)) return 0;
        (uint112 r0, uint112 r1) = pair.getReserves();
        (uint256 reserveBase, uint256 reserveTarget) = baseIsToken0
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));
        if (reserveTarget == 0) return 0;
        return Math.mulDiv(targetBal, reserveBase, reserveTarget);
    }

    function submitIntent(bytes32 intentCommitment) external onlyManager {
        if (epochClosed) revert EpochAlreadyClosed();
        epochIntentsCommitment[epoch] = keccak256(
            abi.encode(epochIntentsCommitment[epoch], intentCommitment)
        );
        uint256 count = ++epochIntentCount[epoch];
        emit IntentSubmitted(epoch, count, intentCommitment);
    }

    function closeEpoch() external onlyKeeper {
        if (epochClosed) revert EpochAlreadyClosed();
        if (epochIntentCount[epoch] == 0) revert NothingToSettle();
        epochClosed = true;
        emit EpochClosed(epoch, epochIntentCount[epoch], epochIntentsCommitment[epoch]);
    }

    function executeRebalance(
        int256 netDelta,
        uint256 intentCount,
        bytes32 intentsCommitment,
        bytes calldata signature,
        uint256 amountOutMinimum
    ) external onlyKeeper nonReentrant {
        if (!epochClosed) revert EpochNotClosed();
        if (
            intentCount != epochIntentCount[epoch] ||
            intentsCommitment != epochIntentsCommitment[epoch]
        ) revert CommitmentMismatch();
        if (
            !verifier.verifyNetDelta(epoch, netDelta, intentCount, intentsCommitment, signature)
        ) revert BadAttestation();

        uint256 amountOut = 0;
        if (netDelta > 0) {
            amountOut = _swap(baseAsset, targetAsset, uint256(netDelta), amountOutMinimum);
        } else if (netDelta < 0) {
            amountOut = _swap(targetAsset, baseAsset, uint256(-netDelta), amountOutMinimum);
        }
        emit RebalanceExecuted(epoch, netDelta, amountOut);

        epoch += 1;
        epochClosed = false;
    }

    function _swap(
        IERC20 tokenIn,
        IERC20 tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) internal returns (uint256 amountOut) {
        tokenIn.forceApprove(address(router), amountIn);
        address[] memory path = new address[](2);
        path[0] = address(tokenIn);
        path[1] = address(tokenOut);
        amountOut = router.swapExactTokensForTokens(amountIn, amountOutMinimum, path, address(this));
    }

    function grantAuditor(address auditor) external onlyOwner {
        isAuditor[auditor] = true;
        emit AuditorGranted(auditor);
    }

    function revokeAuditor(address auditor) external onlyOwner {
        isAuditor[auditor] = false;
        emit AuditorRevoked(auditor);
    }

    function setRoles(address manager_, address keeper_) external onlyOwner {
        manager = manager_;
        keeper = keeper_;
        emit RolesUpdated(manager_, keeper_);
    }

    function setVerifier(AttestationVerifier verifier_) external onlyOwner {
        verifier = verifier_;
    }
}
