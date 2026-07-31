// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AttestationVerifier is EIP712, Ownable {
    bytes32 private constant NET_DELTA_TYPEHASH =
        keccak256("NetDelta(uint256 epoch,int256 netDelta,uint256 intentCount,bytes32 intentsCommitment)");

    mapping(address => bool) public isRegisteredSigner;
    mapping(bytes32 => bool) public allowedCodeHash;

    event SignerRegistered(address indexed signer);
    event SignerRevoked(address indexed signer);
    event CodeHashAllowed(bytes32 indexed codeHash);

    constructor() EIP712("UmbraAttestation", "1") Ownable(msg.sender) {}

    function registerSigner(address signer) external onlyOwner {
        isRegisteredSigner[signer] = true;
        emit SignerRegistered(signer);
    }

    function revokeSigner(address signer) external onlyOwner {
        isRegisteredSigner[signer] = false;
        emit SignerRevoked(signer);
    }

    function allowCodeHash(bytes32 codeHash) external onlyOwner {
        allowedCodeHash[codeHash] = true;
        emit CodeHashAllowed(codeHash);
    }

    function verifyNetDelta(
        uint256 epoch,
        int256 netDelta,
        uint256 intentCount,
        bytes32 intentsCommitment,
        bytes calldata signature
    ) external view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(NET_DELTA_TYPEHASH, epoch, netDelta, intentCount, intentsCommitment)
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        return isRegisteredSigner[signer];
    }
}
