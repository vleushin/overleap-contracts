import { Address, storeOutAction, toNano } from '@ton/core';
import { OverleapRouter } from '../wrappers/OverleapRouter';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('OverleapRouter address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const overleapRouter = provider.open(OverleapRouter.createFromAddress(address));
    await overleapRouter.sendSetFees(
        provider.sender(),
        {
            flatFee: 0n,
            feePercent: 10,
            feePercentThreshold: 0n,
            referralPercent: 0,
            value: toNano('0.05')
        });
    ui.write('Transaction sent!');
    ui.clearActionPrompt();
}
