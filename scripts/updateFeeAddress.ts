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
    const feeAddress = await overleapRouter.getFeeAddress();

    ui.write('Current fee address: ' + feeAddress);

    const newFeeAddress = Address.parse(args.length > 0 ? args[0] : await ui.input('New fee address'));
    await overleapRouter.sendSetFeeAddress(
        provider.sender(),
        {
            address: newFeeAddress,
            value: toNano('0.05')
        });

    ui.write('Transaction sent!');
    ui.clearActionPrompt();
}
