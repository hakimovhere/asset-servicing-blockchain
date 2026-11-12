// Runs the simpleLoan life cycle on Hardhat's local Ethereum test network and prints every result.
const { ethers, network } = require("hardhat");

async function main() {
  const [borrower, lender] = await ethers.getSigners();
  const out = [];
  const eth = (w) => ethers.formatEther(w);
  const log = (ok, step, detail) => { out.push({ ok, step, detail }); console.log((ok ? "OK  " : "NO  ") + step + " | " + detail); };

  async function tx(label, p) {
    const r = await (await p).wait();
    log(true, label, "block " + r.blockNumber + ", gas " + r.gasUsed.toString());
    return r;
  }
  async function blocked(label, p) {
    try { await (await p).wait(); log(false, label, "UNEXPECTEDLY SUCCEEDED"); }
    catch (e) { const m = (e.shortMessage || e.message).match(/reverted with reason string '([^']+)'/); log(true, label, "reverted: " + (m ? m[1] : e.shortMessage)); }
  }

  const PERIOD = 30 * 24 * 3600; // 30 days
  const F = await ethers.getContractFactory("simpleLoan", borrower);
  const loan = await F.deploy(10, 5, PERIOD);
  const dr = await loan.deploymentTransaction().wait();
  log(true, "1 deploy simpleLoan(10 ETH, 5%, 30 days)", "address " + (await loan.getAddress()) + ", gas " + dr.gasUsed.toString());

  await blocked("borrower tries to lend to itself", loan.connect(borrower).registerAsLender());
  await tx("2 registerAsLender()", loan.connect(lender).registerAsLender());
  await blocked("lendCash() before KYC", loan.connect(lender).lendCash({ value: ethers.parseEther("10") }));
  await tx("3a approveKYC() by borrower", loan.connect(borrower).approveKYC());
  await tx("3b approveKYC() by lender", loan.connect(lender).approveKYC());
  log(true, "   kyc_approved", String(await loan.kyc_approved()));

  const bBefore = await ethers.provider.getBalance(borrower.address);
  await tx("4 lendCash() 10 ETH", loan.connect(lender).lendCash({ value: ethers.parseEther("10") }));
  const bAfter = await ethers.provider.getBalance(borrower.address);
  log(true, "   borrower received", eth(bAfter - bBefore) + " ETH");

  await blocked("payback before maturity", loan.connect(borrower).paybackCashAndCoupon({ value: ethers.parseEther("10.5") }));
  await network.provider.send("evm_increaseTime", [PERIOD]);
  await network.provider.send("evm_mine");
  log(true, "5 time moves forward 30 days", "maturity reached");

  const lBefore = await ethers.provider.getBalance(lender.address);
  await tx("6 paybackCashAndCoupon() 10.5 ETH", loan.connect(borrower).paybackCashAndCoupon({ value: ethers.parseEther("10.5") }));
  const lAfter = await ethers.provider.getBalance(lender.address);
  log(true, "   lender received", eth(lAfter - lBefore) + " ETH");
  log(true, "   pay_back", String(await loan.pay_back()));
  log(true, "   redemptionAmount", eth(await loan.redemptionAmount()) + " ETH");

  await blocked("pay back a second time", loan.connect(borrower).paybackCashAndCoupon({ value: ethers.parseEther("10.5") }));
  
}
main().catch((e) => { console.error(e); process.exit(1); });
