import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RushPresaleModule = buildModule("RushPresaleModule", (m) => {
  const _token = m.getParameter<string>("_token", "0x89F524652Ab054C9AA761321fAdF7698C9bD8771");
  const _tokenRatePerEth = m.getParameter<string>("_tokenRatePerEth", "1");
  const _minPurchase = m.getParameter<string>("_minPurchase", "30000");
  const _maxPurchase = m.getParameter<string>("_maxPurchase", "9000000");

  const presaleContract = m.contract("RushPresale", [_token, _tokenRatePerEth, _minPurchase, _maxPurchase]);

  return { presaleContract };
});

export default RushPresaleModule;
