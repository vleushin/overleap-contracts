import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    targets: [
        'contracts/stdlib.fc',
        'contracts/ft/params.fc',
        'contracts/ft/op-codes.fc',
        'contracts/ft/discovery-params.fc',
        'contracts/ft/jetton-utils.fc',
        'contracts/ft/jetton-minter.fc']
};
