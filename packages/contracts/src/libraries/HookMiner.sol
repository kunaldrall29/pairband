// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

/// @notice CREATE2 salt miner so a hook address's low bits match Uniswap v4 permission flags.
library HookMiner {
    uint160 internal constant FLAG_MASK = uint160((1 << 14) - 1); // used via find(); tests mirror 14-bit mask

    /// @dev Brute-force salts until `(address & FLAG_MASK) == flags`.
    function find(address deployer, uint160 flags, bytes memory creationCode, bytes memory constructorArgs)
        internal
        pure
        returns (address hookAddress, bytes32 salt)
    {
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);

        uint256 i;
        while (true) {
            salt = bytes32(i);
            hookAddress = computeAddress(deployer, salt, initCodeHash);
            if (uint160(hookAddress) & FLAG_MASK == flags) {
                return (hookAddress, salt);
            }
            unchecked {
                ++i;
            }
        }
    }

    function computeAddress(address deployer, bytes32 salt, bytes32 initCodeHash) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash)))));
    }
}
