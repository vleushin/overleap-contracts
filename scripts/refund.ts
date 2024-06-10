import { Address, storeOutAction, toNano } from '@ton/core';
import { OverleapRouter } from '../wrappers/OverleapRouter';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { toMicro } from '../tests/convert';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('OverleapRouter address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const overleapRouter = provider.open(OverleapRouter.createFromAddress(address));
    await overleapRouter.sendRefund(
        provider.sender(),
        {
            jettonAddress: Address.parse("EQDhmMRmw9xnbndbc9Kuqt8-Sne6FEebyZhql8BXXR8Ug1Cb"),
            jettonAmount: toMicro("0.5"),
            value: toNano('0.05')
        });
    ui.write('Transaction sent!');
    ui.clearActionPrompt();
}
