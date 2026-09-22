const { ethers } = require("hardhat");

async function main() {
    const mnemonic = "test test test test test test test test test test test junk";

    console.log("Hardhat Node Accounts & Private Keys:\n");

    for (let i = 0; i < 20; i++) {
        const path = `m/44'/60'/0'/0/${i}`;
        // Ethers v6 syntax
        const wallet = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(mnemonic), path);

        console.log(`Account #${i}`);
        console.log(`Address:     ${wallet.address}`);
        console.log(`Private Key: ${wallet.privateKey}`);
        console.log("-".repeat(50));
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
