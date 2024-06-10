import { Address, storeOutAction, toNano } from '@ton/core';
import { OverleapRouter } from '../wrappers/OverleapRouter';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { fromMicro } from '../tests/convert';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('OverleapRouter address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const overleapRouter = provider.open(OverleapRouter.createFromAddress(address));

    const fees = await overleapRouter.getFees();
    const feeAddress = await overleapRouter.getFeeAddress();
    const adminAddress = await overleapRouter.getAdminAddress();

    ui.write('adminAddress: ' + adminAddress);
    ui.write('feeAddress: ' + feeAddress);
    ui.write('flatFee: ' + fees.flatFee + " (" + fromMicro(fees.flatFee) + " USDT)");
    ui.write('feePercentThreshold: ' + fees.feePercentThreshold +  " (" + fromMicro(fees.feePercentThreshold) + " USDT)");
    ui.write('feePercent: ' + fees.feePercent + "%");
    ui.write('referralPercent: ' + fees.referralPercent +"%");
    ui.clearActionPrompt();
}
