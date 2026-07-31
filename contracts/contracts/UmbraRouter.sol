// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {UmbraFactory} from "./UmbraFactory.sol";
import {IUmbraPair} from "./interfaces/IUmbraPair.sol";

contract UmbraRouter {
    using SafeERC20 for IERC20;

    address public immutable factory;

    error InsufficientOutput();
    error InvalidPath();
    error NoPair();

    constructor(address factory_) {
        factory = factory_;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        address to
    ) external returns (uint256 liquidity) {
        address pair = UmbraFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) revert NoPair();
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);
        liquidity = IUmbraPair(pair).mint(to);
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to
    ) external returns (uint256 amountOut) {
        if (path.length != 2) revert InvalidPath();
        address pair = UmbraFactory(factory).getPair(path[0], path[1]);
        if (pair == address(0)) revert NoPair();

        (uint112 r0, uint112 r1) = IUmbraPair(pair).getReserves();
        (uint256 reserveIn, uint256 reserveOut) = path[0] == IUmbraPair(pair).token0()
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut < amountOutMin) revert InsufficientOutput();

        IERC20(path[0]).safeTransferFrom(msg.sender, pair, amountIn);
        (uint256 amount0Out, uint256 amount1Out) = path[0] == IUmbraPair(pair).token0()
            ? (uint256(0), amountOut)
            : (amountOut, uint256(0));
        IUmbraPair(pair).swap(amount0Out, amount1Out, to);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997;
        return (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }
}
