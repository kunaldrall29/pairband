// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Controller-minted long or writer-receipt token. No public burn.
contract ClaimToken is ERC20 {
    address public immutable vault;
    uint8 private immutable _decimals;

    error NotVault();

    constructor(string memory name_, string memory symbol_, address vault_, uint8 decimals_)
        ERC20(name_, symbol_)
    {
        require(vault_ != address(0), "vault");
        vault = vault_;
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != vault) revert NotVault();
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (msg.sender != vault) revert NotVault();
        _burn(from, amount);
    }
}
