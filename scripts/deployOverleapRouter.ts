import { Address, toNano } from '@ton/core';
import { OverleapRouter } from '../wrappers/OverleapRouter';
import { compile, NetworkProvider } from '@ton/blueprint';
import { toMicro } from '../tests/convert';

export async function run(provider: NetworkProvider) {
    const overleapRouter = provider.open(
        OverleapRouter.createFromConfig(
            {
                adminAddress: Address.parse("UQBM6PB3Ha4mpsjm8gVvGc8J6XiftOYgVt3wWZKLk2jYvlT6"),
                feeAddress: Address.parse("UQC7DEs6CxSkhBkGEEvWxFPVIS4uVjNMD3umVRBw0kwJO6hq"),
                flatFee: toMicro("0.1"),
                feePercent: 10,
                feePercentThreshold: toMicro("1.0"),
                referralPercent: 0
            },
            await compile('OverleapRouter')
        )
    );

    await overleapRouter.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(overleapRouter.address);
}
